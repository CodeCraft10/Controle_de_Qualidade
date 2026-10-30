const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { rateLimit } = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('node:crypto');
const config = require('./config');
const { query } = require('./db');
const { token, authenticate } = require('./auth');
const { wrap, error, email, password } = require('./utils');
const app = express();
app.disable('x-powered-by');
app.use(helmet());
app.use(cors({ origin: config.origins }));
app.use((req, res, next) => {
  req.requestId = randomUUID();
  res.set('X-Request-Id', req.requestId);
  const start = Date.now();
  res.on('finish', () => {
    if (process.env.LOG_REQUESTS !== 'false') {
      console.log(
        JSON.stringify({
          requestId: req.requestId,
          method: req.method,
          status: res.statusCode,
          ms: Date.now() - start,
        }),
      );
    }
  });
  next();
});
app.use(express.json({ limit: '100kb' }));
app.use((req, _res, next) => {
  if (req.body === undefined) req.body = {};
  if (req.body === null || Array.isArray(req.body) || typeof req.body !== 'object')
    return next(error(400, 'Envie um objeto JSON'));
  next();
});
app.get('/api/saude', (_req, res) => res.json({ status: 'ok' }));
app.get(
  '/api/prontidao',
  wrap(async (_req, res) => {
    try {
      await query('SELECT 1');
    } catch {
      throw error(503, 'Banco indisponível');
    }
    res.json({ status: 'ok', banco: 'ok' });
  }),
);
app.get('/api/openapi.json', (_req, res) => res.json(require('../docs/openapi.json')));
const loginLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { erro: 'Muitas tentativas. Tente novamente mais tarde.' },
});
// O hash de comparação evita um caminho muito mais rápido para contas inexistentes.
const dummyHash = bcrypt.hashSync(randomUUID(), 12);
app.post(
  '/api/login',
  loginLimit,
  wrap(async (req, res) => {
    const address = email(req.body.email),
      senha = password(req.body.senha);
    const { rows } = await query('SELECT * FROM usuarios WHERE email=$1 AND ativo=true', [address]);
    const valid = await bcrypt.compare(senha, rows[0]?.senha_hash || dummyHash);
    if (!rows.length || !valid) throw error(401, 'Credenciais inválidas');
    const { id, nome, perfil } = rows[0];
    res.json({ token: token(rows[0]), usuario: { id, nome, email: address, perfil } });
  }),
);
app.use('/api', authenticate);
app.get('/api/me', (req, res) => res.json(req.user));
app.use('/api', require('./catalog'));
app.use('/api', require('./inspections'));
app.use('/api', require('./evidence'));
app.use('/api', require('./reports'));
app.use((_req, _res, next) => next(error(404, 'Rota não encontrada')));
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  let status = err.status || 500;
  let message = status < 500 ? err.message : 'Erro interno no servidor';
  if (err.code === '23505') {
    status = 409;
    message = 'Registro duplicado ou vínculo já existente';
  }
  if (err.code === '23503') {
    status = 409;
    message = 'Registro relacionado não encontrado ou em uso';
  }
  if (['23514', '23502', '22P02', '22001', '22007', '22008'].includes(err.code)) {
    status = 400;
    message = 'Dados inválidos';
  }
  if (['40P01', '40001'].includes(err.code)) {
    status = 409;
    message = 'Operação concorrente; tente novamente';
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    status = 413;
    message = 'Arquivo ultrapassou 5 MB';
  }
  if (err.name === 'MulterError' && err.code !== 'LIMIT_FILE_SIZE') {
    status = 400;
    message = 'Erro no envio de arquivo';
  }
  if (err.type === 'entity.parse.failed') {
    status = 400;
    message = 'JSON inválido';
  }
  if (status >= 500)
    console.error(JSON.stringify({ requestId: req.requestId, status, evento: 'falha_interna' }));
  res.status(status).json({ erro: message, requestId: req.requestId });
});
module.exports = app;
