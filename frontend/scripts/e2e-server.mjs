import { spawn, spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const php = process.env.PHP_BIN || 'php';
const temp = await mkdtemp(path.join(os.tmpdir(), 'gp4-integrado-'));
const stateFile = path.join(root, 'frontend/.e2e/session.json');
const isDemo = process.env.E2E_DEMO === '1';
const env = {
  ...process.env,
  DEMO_MODE: isDemo ? 'true' : 'false',
  STORAGE_PATH: path.join(temp, 'state.json'),
};
const accounts = Object.fromEntries(
  ['admin', 'supervisor', 'inspetor', 'outro'].map((key) => [
    key,
    {
      nome: `Teste ${key}`,
      email: `${key}@gp4.test`,
      password: randomBytes(24).toString('base64url'),
      perfil: key === 'outro' ? 'inspetor' : key,
    },
  ]),
);
let server;
let stopping = false;
async function cleanup(code = 0) {
  if (stopping) return;
  stopping = true;
  if (server && server.exitCode === null) {
    server.kill('SIGTERM');
    await new Promise((resolve) => server.once('exit', resolve));
  }
  await rm(temp, { recursive: true, force: true });
  await rm(stateFile, { force: true });
  process.exit(code);
}
process.on('SIGINT', () => cleanup());
process.on('SIGTERM', () => cleanup());
try {
  if (!isDemo) {
    const seed = spawnSync(php, [path.join(root, 'backend/tests/fixtures/e2e-seed.php')], {
      env,
      input: JSON.stringify(accounts),
      encoding: 'utf8',
    });
    if (seed.error || seed.status !== 0)
      throw new Error('Falha ao preparar fixture PHP: ' + (seed.error?.message || seed.stderr));
    const ids = JSON.parse(seed.stdout);
    for (const [key, id] of Object.entries(ids)) accounts[key].id = id;
  }
  await mkdir(path.dirname(stateFile), { recursive: true, mode: 0o700 });
  await writeFile(stateFile, JSON.stringify({ accounts, apiURL: 'http://127.0.0.1:5173/api' }), {
    mode: 0o600,
  });
  server = spawn(
    php,
    [
      '-d',
      'upload_max_filesize=5M',
      '-d',
      'post_max_size=6M',
      '-S',
      '127.0.0.1:5173',
      '-t',
      'public',
      'public/index.php',
    ],
    { cwd: root, env, stdio: ['ignore', 'ignore', 'pipe'] },
  );
  // Logs do servidor ficam disponíveis apenas em falha; nunca imprimir a fixture.
  server.stderr.on('data', () => {});
  server.on('error', (error) => {
    console.error(error.message);
    cleanup(1);
  });
  server.on('exit', (code) => {
    if (!stopping) cleanup(code || 1);
  });
} catch (error) {
  console.error(error.message);
  await cleanup(1);
}
