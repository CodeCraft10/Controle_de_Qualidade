const express = require('express');
const multer = require('multer');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const path = require('node:path');
const { uploadDir } = require('./config');
const { query, transaction } = require('./db');
const { wrap, error, positiveId } = require('./utils');
const router = express.Router();
const formats = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0, parts: 1 },
  fileFilter: (_req, file, cb) =>
    cb(
      formats[file.mimetype] ? null : error(400, 'Envie JPEG, PNG ou WebP'),
      Boolean(formats[file.mimetype]),
    ),
});
function validImage(bytes, mime) {
  if (mime === 'image/jpeg')
    return (
      bytes.length >= 4 &&
      bytes[0] === 0xff &&
      bytes[1] === 0xd8 &&
      bytes[2] === 0xff &&
      bytes.subarray(-2).equals(Buffer.from('ffd9', 'hex'))
    );
  if (mime === 'image/png')
    return (
      bytes.length >= 33 &&
      bytes.subarray(0, 8).equals(Buffer.from('89504e470d0a1a0a', 'hex')) &&
      bytes.toString('ascii', 12, 16) === 'IHDR' &&
      bytes.includes(Buffer.from('IEND'))
    );
  return (
    mime === 'image/webp' &&
    bytes.length >= 20 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP' &&
    bytes.readUInt32LE(4) === bytes.length - 8
  );
}
async function access(db, id, user, lock = false) {
  const { rows } = await db.query(
    'SELECT n.id,i.inspetor_id,i.status FROM nao_conformidades n JOIN respostas r ON r.id=n.resposta_id JOIN inspecoes i ON i.id=r.inspecao_id WHERE n.id=$1' +
      (lock ? ' FOR UPDATE OF i' : ''),
    [id],
  );
  if (!rows.length) throw error(404, 'Não conformidade não encontrada');
  if (user.perfil === 'inspetor' && Number(user.id) !== Number(rows[0].inspetor_id))
    throw error(403, 'Sem permissão para esta evidência');
  return rows[0];
}
router.post(
  '/nao-conformidades/:id/evidencias',
  wrap(async (req, _res, next) => {
    await access({ query }, positiveId(req.params.id), req.user);
    next();
  }),
  upload.single('foto'),
  wrap(async (req, res) => {
    if (!req.file) throw error(400, 'Envie uma imagem no campo foto');
    if (!validImage(req.file.buffer, req.file.mimetype))
      throw error(400, 'Conteúdo incompatível com o formato da imagem');
    const id = positiveId(req.params.id),
      filename = crypto.randomUUID() + formats[req.file.mimetype];
    const filePath = path.join(uploadDir, filename);
    let written = false;
    try {
      const result = await transaction(async (db) => {
        const inspection = await access(db, id, req.user, true);
        if (inspection.status !== 'em_andamento')
          throw error(409, 'Inspeção já finalizada; anexos preservados');
        await fs.mkdir(uploadDir, { recursive: true });
        await fs.writeFile(filePath, req.file.buffer, { flag: 'wx' });
        written = true;
        const { rows } = await db.query(
          'INSERT INTO evidencias(nao_conformidade_id,nome_original,nome_arquivo,tipo,tamanho) VALUES($1,$2,$3,$4,$5) RETURNING id,nao_conformidade_id,nome_original,tipo,tamanho,criado_em',
          [id, req.file.originalname.slice(0, 255), filename, req.file.mimetype, req.file.size],
        );
        return rows[0];
      });
      res.status(201).json(result);
    } catch (err) {
      if (written) await fs.unlink(filePath).catch(() => {});
      throw err;
    }
  }),
);
router.get(
  '/nao-conformidades/:id/evidencias',
  wrap(async (req, res) => {
    const id = positiveId(req.params.id);
    await access({ query }, id, req.user);
    const { rows } = await query(
      'SELECT id,nao_conformidade_id,nome_original,tipo,tamanho,criado_em FROM evidencias WHERE nao_conformidade_id=$1 ORDER BY id',
      [id],
    );
    res.json({ data: rows });
  }),
);
router.get(
  '/evidencias/:id/arquivo',
  wrap(async (req, res) => {
    const { rows } = await query('SELECT * FROM evidencias WHERE id=$1', [
      positiveId(req.params.id),
    ]);
    if (!rows.length) throw error(404, 'Evidência não encontrada');
    const evidence = rows[0];
    await access({ query }, evidence.nao_conformidade_id, req.user);
    if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(evidence.nome_arquivo))
      throw error(404, 'Arquivo não encontrado');
    res.type(evidence.tipo);
    res.set(
      'Content-Disposition',
      'attachment; filename="evidencia' + formats[evidence.tipo] + '"',
    );
    res.set('Cache-Control', 'no-store');
    res.sendFile(evidence.nome_arquivo, { root: uploadDir, dotfiles: 'allow' }, (err) => {
      if (err && !res.headersSent)
        res.status(err.code === 'ENOENT' ? 404 : 500).json({ erro: 'Arquivo indisponível' });
    });
  }),
);
module.exports = router;
