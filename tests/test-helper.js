import mysql from 'mysql2/promise';
import { randomBytes } from 'node:crypto';

/**
 * Creates an isolated test MySQL database. Returns { mysqlOptions, cleanup }.
 * Use mysqlOptions to pass to createApp(). After test, call cleanup() to drop the DB.
 */
export async function createTestDB() {
  const host = process.env.MYSQL_TEST_HOST || '127.0.0.1';
  const port = Number(process.env.MYSQL_TEST_PORT || 3306);
  const user = process.env.MYSQL_TEST_USER || 'root';
  const password = process.env.MYSQL_TEST_PASSWORD || '';
  const dbName = 'test_xavier_' + randomBytes(4).toString('hex');

  const conn = await mysql.createConnection({ host, port, user, password, multipleStatements: true });
  await conn.query(`CREATE DATABASE \`${dbName}\` CHARACTER SET utf8mb4`);
  await conn.end();

  const mysqlOptions = { host, port, user, password, database: dbName };

  const cleanup = async () => {
    const conn2 = await mysql.createConnection({ host, port, user, password });
    await conn2.query(`DROP DATABASE IF EXISTS \`${dbName}\``);
    await conn2.end();
  };

  return { cleanup, dbName, mysqlOptions };
}
