import mysql from 'mysql2/promise';

export const tables = [
  `CREATE TABLE IF NOT EXISTS bookings (
    id VARCHAR(36) PRIMARY KEY,
    created VARCHAR(30) NOT NULL,
    data JSON NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'baru',
    dp BIGINT NOT NULL DEFAULT 0,
    notes VARCHAR(5000) NOT NULL DEFAULT '',
    deleted TINYINT(1) NOT NULL DEFAULT 0,
    deleted_at VARCHAR(30) DEFAULT NULL,
    proof_path VARCHAR(500) DEFAULT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS admin (
    id INT PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    salt VARCHAR(32) NOT NULL,
    hash VARCHAR(128) NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  `CREATE TABLE IF NOT EXISTS sessions (
    token VARCHAR(64) PRIMARY KEY,
    csrf VARCHAR(64) NOT NULL,
    expires BIGINT NOT NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
];

export async function openMySQL(options) {
  // Use a plain connection (not pool) for DDL — mysql2 pool connections hang on
  // CREATE TABLE / ALTER TABLE against MariaDB 10.4 (known mysql2 compatibility issue)
  const connOpts = { ...options, connectTimeout: 5000, charset: 'utf8mb4' };
  const initConn = await mysql.createConnection(connOpts);
  try {
    for (const sql of tables) await initConn.query(sql);
    // Add columns if upgrading from older schema
    const [cols] = await initConn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'`
    );
    const colNames = cols.map(c => c.COLUMN_NAME);
    if (!colNames.includes('deleted'))
      await initConn.query(`ALTER TABLE bookings ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0`);
    if (!colNames.includes('deleted_at'))
      await initConn.query(`ALTER TABLE bookings ADD COLUMN deleted_at VARCHAR(30) DEFAULT NULL`);
    if (!colNames.includes('proof_path'))
      await initConn.query(`ALTER TABLE bookings ADD COLUMN proof_path VARCHAR(500) DEFAULT NULL`);
    // Ensure notes has a default value (older MariaDB TEXT columns can't have DEFAULT)
    // Convert to VARCHAR(5000) which supports DEFAULT '' on all MariaDB/MySQL versions
    const [notesCol] = await initConn.query(
      `SELECT COLUMN_TYPE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'notes'`
    );
    const notesType = (notesCol[0]?.COLUMN_TYPE || '').toLowerCase();
    if (notesType === 'text') {
      await initConn.query(`ALTER TABLE bookings MODIFY COLUMN notes VARCHAR(5000) NOT NULL DEFAULT ''`);
    }
  } finally {
    await initConn.end();
  }

  const pool = mysql.createPool({
    ...options,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 5000,
    charset: 'utf8mb4',
  });

  return {
    prepare(sql) {
      return {
        async run(...args) {
          const [result] = await pool.execute(sql, args);
          return { changes: result.affectedRows };
        },
        async get(...args) {
          const [rows] = await pool.execute(sql, args);
          return rows[0] || undefined;
        },
        async all(...args) {
          const [rows] = await pool.execute(sql, args);
          return rows;
        },
      };
    },
    async exec(sql) {
      await pool.query(sql);
    },
    close: () => pool.end(),
  };
}
