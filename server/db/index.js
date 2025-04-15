/**
 * データベース接続の初期化
 */
const knex = require('knex');
const path = require('path');
const fs = require('fs');

// 環境変数の読み込み
require('dotenv').config({ path: path.resolve(__dirname, '../../config/.env') });

// データベース設定ファイルのパス
const dbConfigPath = path.resolve(__dirname, '../../config/database.js');
const dbExamplePath = path.resolve(__dirname, '../../config/database.example.js');

// 本番用のデータベース設定ファイルが存在しない場合に警告を表示
if (!fs.existsSync(dbConfigPath)) {
  console.warn(`警告: データベース設定ファイルが見つかりません: ${dbConfigPath}`);
  console.warn('サンプル設定ファイルをコピーして設定を行ってください:');
  console.warn(`cp ${dbExamplePath} ${dbConfigPath}`);
  
  // 開発環境ではサンプル設定を使用（本番環境では起動を中止するべき）
  if (process.env.NODE_ENV === 'production') {
    console.error('本番環境ではデータベース設定が必須です。');
    process.exit(1);
  } else {
    console.warn('開発環境のため、サンプル設定を使用して続行します。');
  }
}

// 設定ファイルを読み込む（存在しない場合はサンプル設定を使用）
const config = fs.existsSync(dbConfigPath) 
  ? require(dbConfigPath)
  : require(dbExamplePath);

// 現在の環境を取得
const environment = process.env.NODE_ENV || 'development';

// 環境に応じたデータベース設定を使用
const connection = knex(config[environment]);

module.exports = connection;