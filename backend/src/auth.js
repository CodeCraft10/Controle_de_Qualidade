const jwt = require('jsonwebtoken');
const { secret } = require('./config');
const { error, wrap } = require('./utils');
const { query } = require('./db');
function token(user) {
  return jwt.sign({ sub: String(user.id), version: user.token_version }, secret, {
    algorithm: 'HS256',
    expiresIn: '8h',
    issuer: 'gp4-api',
    audience: 'gp4-web',
  });
}
const authenticate = wrap(async (req, _res, next) => {
  const match = /^Bearer (.+)$/i.exec(req.headers.authorization || '');
  if (!match) throw error(401, 'Token necessário');
  let payload;
  try {
    payload = jwt.verify(match[1], secret, {
      algorithms: ['HS256'],
      issuer: 'gp4-api',
      audience: 'gp4-web',
    });
    if (!/^[1-9][0-9]*$/.test(payload.sub)) throw new Error();
  } catch {
    throw error(401, 'Token inválido ou expirado');
  }
  const { rows } = await query(
    'SELECT id,nome,email,perfil,token_version FROM usuarios WHERE id=$1 AND ativo=true',
    [payload.sub],
  );
  if (!rows.length || rows[0].token_version !== payload.version)
    throw error(401, 'Sessão inválida');
  const { token_version, ...user } = rows[0];
  req.user = user;
  next();
});
function permit(...roles) {
  return (req, _res, next) =>
    roles.includes(req.user?.perfil) ? next() : next(error(403, 'Sem permissão'));
}
module.exports = { token, authenticate, permit };
