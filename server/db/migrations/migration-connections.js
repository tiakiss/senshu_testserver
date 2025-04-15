/**
 * 接続データテーブルを作成するマイグレーション
 */
exports.up = function(knex) {
  return knex.schema.createTable('connections', function(table) {
    table.increments('id').primary();
    table.timestamp('timestamp').notNullable();
    table.string('local_ip', 45).notNullable();
    table.string('remote_ip', 45).notNullable();
    table.integer('port').unsigned().notNullable();
    table.string('state', 50).notNullable();
    table.string('servername', 255).notNullable();
    table.date('file_date').notNullable();
    
    // インデックスを追加
    table.index('timestamp');
    table.index('remote_ip');
    table.index('servername');
    table.index('port');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable('connections');
};
