/**
 * PostgreSQL接続テストスクリプト
 * 
 * 使用方法:
 * 1. config/.envファイルが設定されていることを確認
 * 2. node scripts/test-db-connection.js を実行
 */

const { Client } = require('pg');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// 環境変数ファイルのパス
const envPath = path.resolve(__dirname, '../config/.env');

// .envファイルが存在するか確認
if (!fs.existsSync(envPath)) {
  console.error('エラー: .envファイルが見つかりません。');
  console.error('config/.env.exampleをコピーして設定してください：');
  console.error('cp config/.env.example config/.env');
  process.exit(1);
}

// 環境変数を読み込む
dotenv.config({ path: envPath });

// データベース接続パラメータ
const dbConfig = {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
};

console.log('接続設定:');
console.log(`- ホスト: ${dbConfig.host}`);
console.log(`- ポート: ${dbConfig.port}`);
console.log(`- データベース: ${dbConfig.database}`);
console.log(`- ユーザー: ${dbConfig.user}`);
console.log(`- SSL: ${process.env.DB_SSL === 'true' ? '有効' : '無効'}`);
console.log('\nPostgreSQLに接続テスト中...');

// クライアントを作成
const client = new Client(dbConfig);

// 接続テスト
async function testConnection() {
  try {
    await client.connect();
    console.log('成功: PostgreSQLに接続できました！');
    
    // サーバー情報を取得
    const res = await client.query('SELECT version()');
    console.log(`\nPostgreSQLサーバー情報:\n${res.rows[0].version}`);
    
    // 接続を閉じる
    await client.end();
    console.log('\n接続を正常に閉じました。');
  } catch (err) {
    console.error('エラー: PostgreSQLに接続できませんでした');
    console.error('エラー詳細:', err.message);
    
    if (err.message.includes('does not exist')) {
      console.log('\n提案: 指定されたデータベースが存在しない可能性があります。');
      console.log('PostgreSQLで以下のコマンドを実行してデータベースを作成してください:');
      console.log(`CREATE DATABASE ${dbConfig.database};`);
    } else if (err.message.includes('password authentication failed')) {
      console.log('\n提案: ユーザー名またはパスワードが正しくない可能性があります。');
      console.log('config/.envファイルでDB_USERとDB_PASSWORDを確認してください。');
    } else if (err.message.includes('connect ECONNREFUSED')) {
      console.log('\n提案: PostgreSQLサーバーが実行されていないか、ホスト/ポートが間違っている可能性があります。');
      console.log('config/.envファイルでDB_HOSTとDB_PORTを確認してください。');
    }
    
    // 接続が開いていれば閉じる
    try {
      await client.end();
    } catch (e) {
      // 既に閉じられている場合は無視
    }
  }
}

testConnection();