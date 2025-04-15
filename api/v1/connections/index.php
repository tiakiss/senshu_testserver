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

    // パラメータの取得
    $page = isset($_GET['page']) ? intval($_GET['page']) : 1;
    $limit = isset($_GET['limit']) ? intval($_GET['limit']) : 10;
    $servers = isset($_GET['servers']) ? explode(',', $_GET['servers']) : null;
    $localIp = isset($_GET['localIp']) ? $_GET['localIp'] : null;
    $remoteIp = isset($_GET['remoteIp']) ? $_GET['remoteIp'] : null;
    $ports = isset($_GET['ports']) ? explode(',', $_GET['ports']) : null;

    // クエリの構築
    $offset = ($page - 1) * $limit;
    $where_conditions = [];
    $params = [];

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

    // 総件数の取得
    $count_sql = "SELECT COUNT(*) as total FROM connections {$where_clause}";
    $count_stmt = $pdo->prepare($count_sql);
    foreach ($params as $key => $value) {
        $count_stmt->bindValue(":{$key}", $value);
    }
    $count_stmt->execute();
    $total = $count_stmt->fetch()['total'];

    // データの取得
    $sql = "SELECT id, timestamp, servername as server, local_ip as localIp, remote_ip as remoteIp, port, state as status 
            FROM connections 
            {$where_clause} 
            ORDER BY timestamp DESC 
            LIMIT :limit OFFSET :offset";
    
    $stmt = $pdo->prepare($sql);
    foreach ($params as $key => $value) {
        $stmt->bindValue(":{$key}", $value);
    }
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();
    $connections = $stmt->fetchAll();

    // 結果を返す
    echo json_encode([
        'connections' => $connections,
        'total' => $total,
        'page' => $page,
        'limit' => $limit,
        'pages' => ceil($total / $limit)
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