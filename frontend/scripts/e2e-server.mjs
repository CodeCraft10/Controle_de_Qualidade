import { createRequire } from 'node:module';
import { randomBytes, randomUUID } from 'node:crypto';
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

// Use a dedicated development/test database. Never infer a production DATABASE_URL.
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'Configure TEST_DATABASE_URL com um PostgreSQL exclusivo de desenvolvimento/testes.',
  );
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const requireBackend = createRequire(path.join(root, 'backend/package.json'));
const { Pool } = requireBackend('pg');
const bcrypt = requireBackend('bcryptjs');
const schema = 'gp4_e2e_' + randomUUID().replaceAll('-', '');
const adminPool = new Pool({ connectionString: process.env.TEST_DATABASE_URL });
const url = new URL(process.env.TEST_DATABASE_URL);
url.searchParams.set('options', '-c search_path=' + schema);
const tempDir = await mkdtemp(path.join(os.tmpdir(), 'gp4-e2e-'));
const stateDir = path.join(root, 'frontend/.e2e');
const stateFile = path.join(stateDir, 'session.json');
const port = Number(process.env.E2E_API_PORT || 3001);
let pool,
  server,
  stopping = false;

async function cleanup(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  try {
    if (server) {
      await new Promise((resolve) => {
        server.close(resolve);
        server.closeAllConnections();
      });
    }
    if (pool) await pool.end();
    if (/^gp4_e2e_[a-f0-9]{32}$/.test(schema)) {
      await adminPool.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE');
    }
  } finally {
    await adminPool.end();
    await rm(tempDir, { recursive: true, force: true });
    await rm(stateFile, { force: true });
    process.exit(exitCode);
  }
}
process.on('SIGINT', () => cleanup());
process.on('SIGTERM', () => cleanup());

try {
  await adminPool.query('CREATE SCHEMA ' + schema);
  Object.assign(process.env, {
    DATABASE_URL: url.toString(),
    JWT_SECRET: randomBytes(48).toString('hex'),
    UPLOAD_DIR: tempDir,
    LOG_REQUESTS: 'false',
    PORT: String(port),
    CORS_ORIGIN: 'http://127.0.0.1:5173,http://localhost:5173',
  });
  ({ pool } = requireBackend('./src/db.js'));
  const migrations = (await readdir(path.join(root, 'backend/sql')))
    .filter((file) => file.endsWith('.sql'))
    .sort();
  for (const file of migrations) {
    await pool.query(await readFile(path.join(root, 'backend/sql', file), 'utf8'));
  }
  const password = randomBytes(24).toString('base64url');
  const hash = await bcrypt.hash(password, 12);
  const accounts = {};
  for (const [key, perfil] of [
    ['admin', 'admin'],
    ['supervisor', 'supervisor'],
    ['inspetor', 'inspetor'],
    ['outro', 'inspetor'],
  ]) {
    const email = `${key}@gp4.test`;
    const { rows } = await pool.query(
      'INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES($1,$2,$3,$4) RETURNING id',
      [`Teste ${key}`, email, hash, perfil],
    );
    accounts[key] = { id: rows[0].id, email, password };
  }
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  await writeFile(stateFile, JSON.stringify({ accounts, apiURL: `http://127.0.0.1:${port}/api` }), {
    mode: 0o600,
  });
  const app = requireBackend('./src/app.js');
  server = app.listen(port, '127.0.0.1', () =>
    console.log('API de testes pronta com schema PostgreSQL isolado.'),
  );
  server.on('error', async (error) => {
    console.error('Falha ao iniciar API de testes:', error.code);
    await cleanup(1);
  });
} catch (error) {
  console.error('Falha na preparação dos testes:', error.message);
  await cleanup(1);
}
