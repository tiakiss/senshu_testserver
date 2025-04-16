<?php
// api/v1/connections/stats/advanced/index.php
// リモートIPとサーバーの関係を分析するための詳細統計API

// デバッグ用に全てのエラーを表示
ini_set('display_errors', 1);
error_reporting(E_ALL);

// 必要なヘッダー設定
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

// OPTIONSリクエストの場合は早期リターン
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// データベース設定
$db_config = [
    'host' => 'localhost',
    'dbname' => 'netstat_date',
    'user' => 'senshu',
    'password' => 'postgres',
    'port' => '5432'
];

// テーブル名
$table_name = 'netstat_date';

try {
    // データベース接続
    $dsn = "pgsql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['dbname']};";
    $pdo = new PDO($dsn, $db_config['user'], $db_config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);

    // テーブル情報を確認
    try {
        $tables_sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
        $tables_stmt = $pdo->query($tables_sql);
        $tables = $tables_stmt->fetchAll(PDO::FETCH_COLUMN);
        
        if (!in_array($table_name, $tables)) {
            throw new Exception("'{$table_name}'テーブルが存在しません。存在するテーブル: " . implode(', ', $tables));
        }
        
        // テーブルのカラム確認
        $columns_sql = "SELECT column_name FROM information_schema.columns WHERE table_name = '{$table_name}';";
        $columns_stmt = $pdo->query($columns_sql);
        $columns = $columns_stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // 必要なカラムが存在するか確認
        $required_columns = ['servername', 'remote_ip'];
        foreach ($required_columns as $column) {
            if (!in_array($column, $columns)) {
                throw new Exception("'{$column}'カラムが存在しません。");
            }
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'error' => true,
            'message' => 'テーブル構造エラー: ' . $e->getMessage()
        ]);
        exit;
    }

    // パラメータの取得
    $servers = isset($_GET['servers']) ? explode(',', $_GET['servers']) : null;
    $localIp = isset($_GET['localIp']) ? $_GET['localIp'] : null;
    $remoteIp = isset($_GET['remoteIp']) ? $_GET['remoteIp'] : null;
    $ports = isset($_GET['ports']) ? explode(',', $_GET['ports']) : null;
    
    // 日付フィルター
    $dateFrom = isset($_GET['dateFrom']) ? $_GET['dateFrom'] : null;
    $dateTo = isset($_GET['dateTo']) ? $_GET['dateTo'] : null;
    
    // 上位何件取得するか
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 20;

    // クエリの構築
    $where_conditions = [];
    $params = [];

    // 日付フィルターの適用
    if ($dateFrom) {
        $where_conditions[] = "timestamp::date >= :date_from";
        $params['date_from'] = $dateFrom;
    }
    
    if ($dateTo) {
        $where_conditions[] = "timestamp::date <= :date_to";
        $params['date_to'] = $dateTo;
    }

    if ($servers !== null && !empty($servers) && !in_array('all', $servers)) {
        $server_placeholders = [];
        foreach ($servers as $i => $server) {
            $server_placeholders[] = ":server{$i}";
            $params["server{$i}"] = $server;
        }
        $where_conditions[] = "servername IN (" . implode(', ', $server_placeholders) . ")";
    }

    if ($localIp !== null && $localIp !== 'all') {
        $where_conditions[] = "local_ip = :local_ip";
        $params['local_ip'] = $localIp;
    }

    if ($remoteIp !== null && $remoteIp !== 'all') {
        $where_conditions[] = "remote_ip = :remote_ip";
        $params['remote_ip'] = $remoteIp;
    }

    if ($ports !== null && !empty($ports) && !in_array('all', $ports)) {
        $port_placeholders = [];
        foreach ($ports as $i => $port) {
            $port_placeholders[] = ":port{$i}";
            $params["port{$i}"] = intval($port);
        }
        $where_conditions[] = "port IN (" . implode(', ', $port_placeholders) . ")";
    }

    $where_clause = !empty($where_conditions) ? "WHERE " . implode(' AND ', $where_conditions) : "";

    // サーバー別リモートIP接続数の集計クエリ
    $sql = "SELECT 
                servername, 
                remote_ip, 
                COUNT(*) as connection_count
            FROM 
                {$table_name}
            {$where_clause}
            GROUP BY 
                servername, remote_ip
            ORDER BY 
                connection_count DESC
            LIMIT :limit";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(":{$key}", $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->execute();
    $results = $stmt->fetchAll();
    
    // サーバー一覧を取得（色分けのため）
    $servers_sql = "SELECT DISTINCT servername FROM {$table_name} ORDER BY servername";
    $servers_stmt = $pdo->query($servers_sql);
    $all_servers = $servers_stmt->fetchAll(PDO::FETCH_COLUMN);

    // 結果をフォーマット
    $formatted_results = [];
    foreach ($results as $row) {
        $formatted_results[] = [
            'server' => $row['servername'],
            'remote_ip' => $row['remote_ip'],
            'count' => intval($row['connection_count'])
        ];
    }

    // 結果を返す
    echo json_encode([
        'data' => $formatted_results,
        'servers' => $all_servers
    ]);

} catch (PDOException $e) {
    // エラーレスポンス
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'データベースエラー: ' . $e->getMessage() . ' in ' . $e->getFile() . ' on line ' . $e->getLine(),
        'trace' => $e->getTraceAsString()
    ]);
}