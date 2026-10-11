import mysql from 'mysql2/promise';

export const schema = `
CREATE TABLE IF NOT EXISTS bookings (
  id VARCHAR(36) PRIMARY KEY,
  created VARCHAR(30) NOT NULL,
  data JSON NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'baru',
  dp BIGINT NOT NULL DEFAULT 0,
  notes TEXT NOT NULL,
  deleted TINYINT(1) NOT NULL DEFAULT 0,
  deleted_at VARCHAR(30) DEFAULT NULL,
  proof_path VARCHAR(500) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS admin (
  id INT PRIMARY KEY CHECK(id=1),
  username VARCHAR(50) NOT NULL,
  salt VARCHAR(32) NOT NULL,
  hash VARCHAR(128) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS sessions (
  token VARCHAR(64) PRIMARY KEY,
  csrf VARCHAR(64) NOT NULL,
  expires BIGINT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

export async function openMySQL(options) {
  const pool = mysql.createPool({
    ...options,
    waitForConnections: true,
    connectionLimit: 5,
    connectTimeout: 5000,
    charset: 'utf8mb4',
    multipleStatements: true,
  });
  // Initialize schema
  const conn = await pool.getConnection();
  try {
    await conn.query(schema);
    // Add columns if upgrading from older schema
    const [cols] = await conn.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings'`
    );
    const colNames = cols.map(c => c.COLUMN_NAME);
    if (!colNames.includes('deleted')) {
      await conn.query(`ALTER TABLE bookings ADD COLUMN deleted TINYINT(1) NOT NULL DEFAULT 0`);
    }
    if (!colNames.includes('deleted_at')) {
      await conn.query(`ALTER TABLE bookings ADD COLUMN deleted_at VARCHAR(30) DEFAULT NULL`);
    }
    if (!colNames.includes('proof_path')) {
      await conn.query(`ALTER TABLE bookings ADD COLUMN proof_path VARCHAR(500) DEFAULT NULL`);
    }
  } finally {
    conn.release();
  }
  return {
    prepare(sql) {
      const text = sql.replace(/\?/g, '?');
      return {
        async run(...args) {
          const [result] = await pool.execute(text, args);
          return { changes: result.affectedRows };
        },
        async get(...args) {
          const [rows] = await pool.execute(text, args);
          return rows[0] || undefined;
        },
        async all(...args) {
          const [rows] = await pool.execute(text, args);
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
