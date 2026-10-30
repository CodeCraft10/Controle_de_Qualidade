const { port } = require('./config');
const app = require('./app');
const { pool } = require('./db');
async function start() {
  try {
    await pool.query('SELECT id FROM usuarios LIMIT 1');
    const server = app.listen(port, () =>
      console.log('API disponível em http://localhost:' + port),
    );
    server.on('error', async () => {
      console.error('Não foi possível abrir a porta da API');
      await pool.end();
      process.exitCode = 1;
    });
    function shutdown() {
      server.close(async () => {
        await pool.end();
      });
      setTimeout(() => process.exit(1), 10000).unref();
    }
    process.once('SIGTERM', shutdown);
    process.once('SIGINT', shutdown);
  } catch {
    console.error('Falha no banco. Verifique DATABASE_URL e execute npm run db:migrate.');
    await pool.end();
    process.exitCode = 1;
  }
}
start();
