<?php
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

try {
    // データベース接続
    $dsn = "pgsql:host={$db_config['host']};port={$db_config['port']};dbname={$db_config['dbname']};";
    $pdo = new PDO($dsn, $db_config['user'], $db_config['password'], [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false
    ]);
    
    // テーブル情報を取得して確認
    try {
        $tables_sql = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
        $tables_stmt = $pdo->query($tables_sql);
        $tables = $tables_stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // テーブル名が netstat_date の場合
        $table_name = 'netstat_date';
        
        if (!in_array($table_name, $tables)) {
            throw new Exception("'{$table_name}'テーブルが存在しません。存在するテーブル: " . implode(', ', $tables));
        }
        
        // テーブルのカラム確認
        $columns_sql = "SELECT column_name FROM information_schema.columns WHERE table_name = '{$table_name}';";
        $columns_stmt = $pdo->query($columns_sql);
        $columns = $columns_stmt->fetchAll(PDO::FETCH_COLUMN);
        
        // カラムの存在チェック
        $column_mappings = [
            'servername' => 'サーバー名',
            'local_ip' => 'ローカルIP',
            'remote_ip' => 'リモートIP',
            'port' => 'ポート'
        ];
        
        $missing_columns = [];
        foreach ($column_mappings as $column => $label) {
            if (!in_array($column, $columns)) {
                $missing_columns[] = "{$column} ({$label})";
            }
        }
        
        if (!empty($missing_columns)) {
            throw new Exception("次のカラムが存在しません: " . implode(', ', $missing_columns) . ". 存在するカラム: " . implode(', ', $columns));
        }
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'error' => true,
            'message' => 'テーブル構造エラー: ' . $e->getMessage()
        ]);
        exit;
    }

    // サーバー一覧を取得
    $server_sql = "SELECT DISTINCT servername FROM {$table_name} ORDER BY servername";
    $server_stmt = $pdo->query($server_sql);
    $servers = $server_stmt->fetchAll(PDO::FETCH_COLUMN);

    // ローカルIP一覧を取得
    $localIp_sql = "SELECT DISTINCT local_ip FROM {$table_name} ORDER BY local_ip";
    $localIp_stmt = $pdo->query($localIp_sql);
    $localIps = $localIp_stmt->fetchAll(PDO::FETCH_COLUMN);

    // リモートIP一覧を取得
    $remoteIp_sql = "SELECT DISTINCT remote_ip FROM {$table_name} ORDER BY remote_ip";
    $remoteIp_stmt = $pdo->query($remoteIp_sql);
    $remoteIps = $remoteIp_stmt->fetchAll(PDO::FETCH_COLUMN);

    // ポート一覧を取得
    $port_sql = "SELECT DISTINCT port FROM {$table_name} ORDER BY port";
    $port_stmt = $pdo->query($port_sql);
    $ports = $port_stmt->fetchAll(PDO::FETCH_COLUMN);

    // 結果を返す
    echo json_encode([
        'servers' => $servers,
        'localIps' => $localIps,
        'remoteIps' => $remoteIps,
        'ports' => $ports
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