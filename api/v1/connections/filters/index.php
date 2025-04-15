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

    // サーバー一覧を取得
    $server_sql = "SELECT DISTINCT servername FROM connections ORDER BY servername";
    $server_stmt = $pdo->query($server_sql);
    $servers = $server_stmt->fetchAll(PDO::FETCH_COLUMN);

    // ローカルIP一覧を取得
    $localIp_sql = "SELECT DISTINCT local_ip FROM connections ORDER BY local_ip";
    $localIp_stmt = $pdo->query($localIp_sql);
    $localIps = $localIp_stmt->fetchAll(PDO::FETCH_COLUMN);

    // リモートIP一覧を取得
    $remoteIp_sql = "SELECT DISTINCT remote_ip FROM connections ORDER BY remote_ip";
    $remoteIp_stmt = $pdo->query($remoteIp_sql);
    $remoteIps = $remoteIp_stmt->fetchAll(PDO::FETCH_COLUMN);

    // ポート一覧を取得
    $port_sql = "SELECT DISTINCT port FROM connections ORDER BY port";
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
        'message' => 'データベースエラー: ' . $e->getMessage()
    ]);
}