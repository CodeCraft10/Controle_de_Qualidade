require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL no .env');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  statement_timeout: 10000,
});
pool.on('error', () => console.error('Conexão ociosa do banco interrompida'));
const query = (sql, params = []) => pool.query(sql, params);
async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
module.exports = { pool, query, transaction };
