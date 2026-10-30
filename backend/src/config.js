require('dotenv').config({ quiet: true });
const path = require('node:path');
const secret = process.env.JWT_SECRET;
if (!secret || Buffer.byteLength(secret) < 32) {
  throw new Error('Configure JWT_SECRET aleatório com pelo menos 32 bytes no .env');
}
if (!process.env.DATABASE_URL) throw new Error('Configure DATABASE_URL no .env');
const port = Number(process.env.PORT || 3000);
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('PORT inválida');
module.exports = {
  secret,
  port,
  uploadDir: path.resolve(__dirname, '..', process.env.UPLOAD_DIR || 'uploads'),
  origins: (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map((s) => s.trim()),
};
