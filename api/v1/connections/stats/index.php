<?php
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
    'user' => 'senshu', // PostgreSQLのユーザー名
    'password' => 'postgres', // パスワードは適切なものに変更してください
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
    $servers = isset($_GET['servers']) ? explode(',', $_GET['servers']) : null;
    $localIp = isset($_GET['localIp']) ? $_GET['localIp'] : null;
    $remoteIp = isset($_GET['remoteIp']) ? $_GET['remoteIp'] : null;
    $ports = isset($_GET['ports']) ? explode(',', $_GET['ports']) : null;

    // クエリの構築
    $where_conditions = [];
    $params = [];

    if ($servers !== null && !empty($servers)) {
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

    if ($ports !== null && !empty($ports)) {
        $port_placeholders = [];
        foreach ($ports as $i => $port) {
            $port_placeholders[] = ":port{$i}";
            $params["port{$i}"] = $port;
        }
        $where_conditions[] = "port IN (" . implode(', ', $port_placeholders) . ")";
    }

    $where_clause = !empty($where_conditions) ? "WHERE " . implode(' AND ', $where_conditions) : "";

    // リモートIP別の統計
    $remoteIp_sql = "SELECT remote_ip as value, COUNT(*) as count 
                     FROM connections 
                     {$where_clause} 
                     GROUP BY remote_ip 
                     ORDER BY count DESC";
    
    $remoteIp_stmt = $pdo->prepare($remoteIp_sql);
    foreach ($params as $key => $value) {
        $remoteIp_stmt->bindValue(":{$key}", $value);
    }
    $remoteIp_stmt->execute();
    $remoteIp_stats = $remoteIp_stmt->fetchAll();

    // サーバー別の統計
    $server_sql = "SELECT servername as value, COUNT(*) as count 
                  FROM connections 
                  {$where_clause} 
                  GROUP BY servername 
                  ORDER BY count DESC";
    
    $server_stmt = $pdo->prepare($server_sql);
    foreach ($params as $key => $value) {
        $server_stmt->bindValue(":{$key}", $value);
    }
    $server_stmt->execute();
    $server_stats = $server_stmt->fetchAll();

    // ポート別の統計
    $port_sql = "SELECT port as value, COUNT(*) as count 
                FROM connections 
                {$where_clause} 
                GROUP BY port 
                ORDER BY count DESC";
    
    $port_stmt = $pdo->prepare($port_sql);
    foreach ($params as $key => $value) {
        $port_stmt->bindValue(":{$key}", $value);
    }
    $port_stmt->execute();
    $port_stats = $port_stmt->fetchAll();

    // 結果を返す
    echo json_encode([
        'remoteIp' => $remoteIp_stats,
        'server' => $server_stats,
        'port' => $port_stats
    ]);

} catch (PDOException $e) {
    // エラーレスポンス
    http_response_code(500);
    echo json_encode([
        'error' => true,
        'message' => 'データベースエラー: ' . $e->getMessage()
    ]);
}