const { spawn } = require('node:child_process');
const net = require('node:net');
const path = require('node:path');
const assert = require('node:assert/strict');
const { once } = require('node:events');
(async () => {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  const child = spawn(process.execPath, [path.join(__dirname, '../src/server.js')], {
    cwd: path.join(__dirname, '..'),
    env: { ...process.env, PORT: String(port), LOG_REQUESTS: 'false' },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const exited = once(child, 'exit');
  try {
    await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('Inicialização excedeu 10 segundos')), 10000);
      child.once('error', (err) => {
        clearTimeout(timer);
        reject(err);
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error('Servidor encerrou: ' + code));
      });
      child.stdout.on('data', (bytes) => {
        if (bytes.toString().includes('API disponível')) {
          clearTimeout(timer);
          console.log(bytes.toString().trim());
          resolve();
        }
      });
      child.stderr.on('data', (bytes) => console.error(bytes.toString().trim()));
    });
    for (const [route, expected] of [
      ['saude', 200],
      ['prontidao', 200],
      ['produtos', 401],
      ['openapi.json', 200],
    ]) {
      const response = await fetch('http://127.0.0.1:' + port + '/api/' + route);
      assert.equal(response.status, expected);
      const body = await response.json();
      if (route === 'saude' || route === 'prontidao') assert.equal(body.status, 'ok');
      if (route === 'openapi.json') assert.equal(body.openapi, '3.0.3');
      console.log('GET /api/' + route + ' → ' + response.status);
    }
  } finally {
    if (child.exitCode === null) child.kill();
    await exited;
  }
})().catch(() => {
  console.error('Falha na verificação do servidor; confira .env, banco e migrações.');
  process.exitCode = 1;
});
