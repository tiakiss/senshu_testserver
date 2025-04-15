<?php
/**
 * PostgreSQL接続テストスクリプト（PHP版）
 * 
 * 使用方法:
 * php scripts/test-db-connection.php
 */

// 環境変数をファイルから読み込む（環境変数ファイルが存在する場合）
$envFile = __DIR__ . '/../config/.env';
if (file_exists($envFile)) {
    $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '#') === 0) {
            continue; // コメント行はスキップ
        }
        list($name, $value) = explode('=', $line, 2);
        $_ENV[trim($name)] = trim($value);
    }
}

// データベース接続設定
$host = $_ENV['DB_HOST'] ?? 'localhost';
$port = $_ENV['DB_PORT'] ?? '5432';
$dbname = $_ENV['DB_NAME'] ?? 'netstat_date';
$user = $_ENV['DB_USER'] ?? 'senshu';
$password = $_ENV['DB_PASSWORD'] ?? 'postgres';

// 接続設定を表示
echo "接続設定:\n";
echo "- ホスト: $host\n";
echo "- ポート: $port\n";
echo "- データベース: $dbname\n";
echo "- ユーザー: $user\n";
echo "\nPostgreSQLに接続テスト中...\n";

// 接続文字列
$dsn = "pgsql:host=$host;port=$port;dbname=$dbname;user=$user;password=$password";

try {
    // 接続を試みる
    $conn = new PDO($dsn);
    
    // 接続成功時は接続ステータスを設定
    $conn->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "成功: PostgreSQLに接続できました！\n";
    
    // サーバー情報を取得
    $stmt = $conn->query('SELECT version()');
    $version = $stmt->fetchColumn();
    echo "\nPostgreSQLサーバー情報:\n$version\n";
    
    // 接続を閉じる
    $conn = null;
    echo "\n接続を正常に閉じました。\n";
} catch (PDOException $e) {
    echo "エラー: PostgreSQLに接続できませんでした\n";
    echo "エラー詳細: " . $e->getMessage() . "\n";
    
    // エラーに基づいたアドバイスを提供
    if (strpos($e->getMessage(), 'database "' . $dbname . '" does not exist') !== false) {
        echo "\n提案: 指定されたデータベースが存在しない可能性があります。\n";
        echo "PostgreSQLで以下のコマンドを実行してデータベースを作成してください:\n";
        echo "CREATE DATABASE $dbname;\n";
    } elseif (strpos($e->getMessage(), 'password authentication failed') !== false) {
        echo "\n提案: ユーザー名またはパスワードが正しくない可能性があります。\n";
        echo "config/.envファイルでDB_USERとDB_PASSWORDを確認してください。\n";
    } elseif (strpos($e->getMessage(), 'could not connect to server') !== false) {
        echo "\n提案: PostgreSQLサーバーが実行されていないか、ホスト/ポートが間違っている可能性があります。\n";
        echo "config/.envファイルでDB_HOSTとDB_PORTを確認してください。\n";
    }
}