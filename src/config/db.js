const mysql = require('mysql2/promise');

const pool = mysql.createPool({
  host: process.env.MYSQL_HOST || 'localhost',
  port: Number(process.env.MYSQL_PORT || 3306),
  user: process.env.MYSQL_USER || 'root',
  password: process.env.MYSQL_PASSWORD || '',
  database: process.env.MYSQL_DB || 'vas_app',
  waitForConnections: true,
  connectionLimit: Number(process.env.MYSQL_CONN_LIMIT || 10),
  timezone: 'Z', // store in UTC
});

module.exports = pool;
