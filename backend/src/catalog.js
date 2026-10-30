const express = require('express');
const bcrypt = require('bcryptjs');
const { query, transaction } = require('./db');
const { permit } = require('./auth');
const {
  wrap,
  error,
  positiveId,
  requiredString,
  optionalString,
  password,
  email,
  pagination,
  order,
  pageResponse,
} = require('./utils');
const router = express.Router();
const managers = permit('admin', 'supervisor');
const publicUser = 'id,nome,email,perfil,ativo,criado_em';
const resources = {
  produtos: {
    fields: ['codigo', 'nome', 'descricao'],
    required: ['codigo', 'nome'],
    list: 'id,codigo,nome,descricao,ativo',
  },
  criterios: { fields: ['nome', 'descricao'], required: ['nome'], list: 'id,nome,descricao,ativo' },
  checklists: {
    fields: ['nome', 'descricao'],
    required: ['nome'],
    list: 'id,nome,descricao,ativo',
  },
  lotes: {
    fields: ['codigo', 'produto_id', 'quantidade'],
    required: ['codigo', 'produto_id', 'quantidade'],
    list: 'id,codigo,produto_id,quantidade,status,ativo,criado_em',
  },
};
function parseBody(body, config, partial = false) {
  const out = {};
  for (const key of Object.keys(body)) {
    if (!config.fields.includes(key)) throw error(400, 'Campo não permitido: ' + key);
  }
  for (const field of config.fields) {
    if (body[field] === undefined) {
      if (!partial && config.required.includes(field))
        throw error(400, 'Campo ' + field + ' obrigatório');
      continue;
    }
    if (['produto_id', 'quantidade'].includes(field)) {
      out[field] = positiveId(body[field]);
      if (field === 'quantidade' && out[field] > 2147483647)
        throw error(400, 'Quantidade inválida');
    } else {
      const max = field === 'codigo' ? 80 : field === 'descricao' ? 2000 : 150;
      out[field] = config.required.includes(field)
        ? requiredString(body[field], field, max)
        : optionalString(body[field], field, max);
    }
  }
  if (partial && !Object.keys(out).length) throw error(400, 'Informe algum campo para atualizar');
  return out;
}
async function activeProduct(db, id) {
  const result = await db.query('SELECT id FROM produtos WHERE id=$1 AND ativo=true FOR SHARE', [
    id,
  ]);
  if (!result.rows.length) throw error(400, 'Produto não encontrado ou inativo');
}
async function freezeUsed(db, name, id) {
  const sql = {
    lotes: 'SELECT 1 FROM inspecoes WHERE lote_id=$1 LIMIT 1',
    checklists: 'SELECT 1 FROM inspecoes WHERE checklist_id=$1 LIMIT 1',
    criterios:
      'SELECT 1 FROM checklist_itens ci JOIN inspecoes i ON i.checklist_id=ci.checklist_id WHERE ci.criterio_id=$1 LIMIT 1',
    produtos:
      'SELECT 1 FROM lotes l JOIN inspecoes i ON i.lote_id=l.id WHERE l.produto_id=$1 LIMIT 1',
  };
  const used = await db.query(sql[name], [id]);
  if (used.rows.length)
    throw error(409, 'Cadastro usado em inspeção; preserve o histórico e crie uma nova versão');
}
for (const [name, config] of Object.entries(resources)) {
  router.get(
    '/' + name,
    wrap(async (req, res) => {
      const { limit, offset, page } = pagination(req.query);
      const sort = order(
        req.query,
        name === 'lotes' ? { id: 'id', codigo: 'codigo' } : { id: 'id', nome: 'nome' },
      );
      const params = [],
        filters = [];
      if (req.query.ativo !== undefined) {
        if (!['true', 'false'].includes(req.query.ativo))
          throw error(400, 'ativo deve ser true ou false');
        params.push(req.query.ativo === 'true');
        filters.push('ativo=$' + params.length);
      }
      if (name === 'lotes' && req.query.produto_id !== undefined) {
        params.push(positiveId(req.query.produto_id));
        filters.push('produto_id=$' + params.length);
      }
      const where = filters.length ? ' WHERE ' + filters.join(' AND ') : '';
      const count = await query('SELECT count(*) AS total FROM ' + name + where, params);
      const n = params.length;
      const { rows } = await query(
        'SELECT ' +
          config.list +
          ' FROM ' +
          name +
          where +
          ' ORDER BY ' +
          sort +
          ' LIMIT $' +
          (n + 1) +
          ' OFFSET $' +
          (n + 2),
        [...params, limit, offset],
      );
      res.json(pageResponse(rows, count.rows[0].total, page, limit));
    }),
  );
  router.get(
    '/' + name + '/:id',
    wrap(async (req, res) => {
      const { rows } = await query('SELECT ' + config.list + ' FROM ' + name + ' WHERE id=$1', [
        positiveId(req.params.id),
      ]);
      if (!rows.length) throw error(404, 'Registro não encontrado');
      res.json(rows[0]);
    }),
  );
  router.post(
    '/' + name,
    managers,
    wrap(async (req, res) => {
      const data = parseBody(req.body, config),
        keys = Object.keys(data);
      const result = await transaction(async (db) => {
        if (name === 'lotes') await activeProduct(db, data.produto_id);
        const { rows } = await db.query(
          'INSERT INTO ' +
            name +
            '(' +
            keys.join(',') +
            ') VALUES (' +
            keys.map((_, i) => '$' + (i + 1)).join(',') +
            ') RETURNING ' +
            config.list,
          Object.values(data),
        );
        return rows[0];
      });
      res.status(201).json(result);
    }),
  );
  router.patch(
    '/' + name + '/:id',
    managers,
    wrap(async (req, res) => {
      const data = parseBody(req.body, config, true),
        id = positiveId(req.params.id),
        keys = Object.keys(data);
      const result = await transaction(async (db) => {
        const found = await db.query('SELECT id FROM ' + name + ' WHERE id=$1 FOR UPDATE', [id]);
        if (!found.rows.length) throw error(404, 'Registro não encontrado');
        await freezeUsed(db, name, id);
        if (name === 'lotes' && data.produto_id) await activeProduct(db, data.produto_id);
        const { rows } = await db.query(
          'UPDATE ' +
            name +
            ' SET ' +
            keys.map((key, i) => key + '=$' + (i + 1)).join(',') +
            ' WHERE id=$' +
            (keys.length + 1) +
            ' RETURNING ' +
            config.list,
          [...Object.values(data), id],
        );
        return rows[0];
      });
      res.json(result);
    }),
  );
  router.patch(
    '/' + name + '/:id/ativo',
    managers,
    wrap(async (req, res) => {
      if (typeof req.body.ativo !== 'boolean') throw error(400, 'ativo deve ser booleano');
      const { rows } = await query(
        'UPDATE ' + name + ' SET ativo=$1 WHERE id=$2 RETURNING ' + config.list,
        [req.body.ativo, positiveId(req.params.id)],
      );
      if (!rows.length) throw error(404, 'Registro não encontrado');
      res.json(rows[0]);
    }),
  );
}
router.get(
  '/checklists/:id/itens',
  wrap(async (req, res) => {
    const id = positiveId(req.params.id);
    const exists = await query('SELECT id FROM checklists WHERE id=$1', [id]);
    if (!exists.rows.length) throw error(404, 'Checklist não encontrado');
    const { rows } = await query(
      'SELECT ci.id,ci.criterio_id,c.nome AS criterio,ci.obrigatorio FROM checklist_itens ci JOIN criterios c ON c.id=ci.criterio_id WHERE ci.checklist_id=$1 ORDER BY ci.id',
      [id],
    );
    res.json({ data: rows });
  }),
);
async function editableChecklist(db, id) {
  const found = await db.query('SELECT id FROM checklists WHERE id=$1 AND ativo=true FOR UPDATE', [
    id,
  ]);
  if (!found.rows.length) throw error(404, 'Checklist não encontrado ou inativo');
  await freezeUsed(db, 'checklists', id);
}
router.post(
  '/checklists/:id/itens',
  managers,
  wrap(async (req, res) => {
    const checklistId = positiveId(req.params.id),
      criterioId = positiveId(req.body.criterio_id);
    if (req.body.obrigatorio !== undefined && typeof req.body.obrigatorio !== 'boolean')
      throw error(400, 'obrigatorio deve ser booleano');
    const result = await transaction(async (db) => {
      await editableChecklist(db, checklistId);
      const criterion = await db.query(
        'SELECT id FROM criterios WHERE id=$1 AND ativo=true FOR SHARE',
        [criterioId],
      );
      if (!criterion.rows.length) throw error(400, 'Critério não encontrado ou inativo');
      const { rows } = await db.query(
        'INSERT INTO checklist_itens(checklist_id,criterio_id,obrigatorio) VALUES($1,$2,$3) RETURNING *',
        [checklistId, criterioId, req.body.obrigatorio ?? true],
      );
      return rows[0];
    });
    res.status(201).json(result);
  }),
);
router.delete(
  '/checklists/:id/itens/:itemId',
  managers,
  wrap(async (req, res) => {
    await transaction(async (db) => {
      const id = positiveId(req.params.id);
      await editableChecklist(db, id);
      const deleted = await db.query(
        'DELETE FROM checklist_itens WHERE id=$1 AND checklist_id=$2',
        [positiveId(req.params.itemId), id],
      );
      if (!deleted.rowCount) throw error(404, 'Item não encontrado');
    });
    res.status(204).end();
  }),
);
router.get(
  '/usuarios',
  permit('admin', 'supervisor'),
  wrap(async (req, res) => {
    const { limit, offset, page } = pagination(req.query);
    const sort = order(req.query, { id: 'id', nome: 'nome' });
    const values = [],
      parts = [];
    if (req.query.perfil !== undefined) {
      if (!['admin', 'supervisor', 'inspetor'].includes(req.query.perfil))
        throw error(400, 'Perfil inválido');
      values.push(req.query.perfil);
      parts.push('perfil=$' + values.length);
    }
    if (req.query.ativo !== undefined) {
      if (!['true', 'false'].includes(req.query.ativo)) throw error(400, 'ativo inválido');
      values.push(req.query.ativo === 'true');
      parts.push('ativo=$' + values.length);
    }
    const where = parts.length ? ' WHERE ' + parts.join(' AND ') : '';
    const count = await query('SELECT count(*) AS total FROM usuarios' + where, values);
    const n = values.length;
    const { rows } = await query(
      'SELECT ' +
        publicUser +
        ' FROM usuarios' +
        where +
        ' ORDER BY ' +
        sort +
        ' LIMIT $' +
        (n + 1) +
        ' OFFSET $' +
        (n + 2),
      [...values, limit, offset],
    );
    res.json(pageResponse(rows, count.rows[0].total, page, limit));
  }),
);
router.get(
  '/usuarios/:id',
  permit('admin', 'supervisor'),
  wrap(async (req, res) => {
    const { rows } = await query('SELECT ' + publicUser + ' FROM usuarios WHERE id=$1', [
      positiveId(req.params.id),
    ]);
    if (!rows.length) throw error(404, 'Usuário não encontrado');
    res.json(rows[0]);
  }),
);
router.post(
  '/usuarios',
  permit('admin'),
  wrap(async (req, res) => {
    const nome = requiredString(req.body.nome, 'nome'),
      address = email(req.body.email);
    if (!['admin', 'supervisor', 'inspetor'].includes(req.body.perfil))
      throw error(400, 'Perfil inválido');
    const hash = await bcrypt.hash(password(req.body.senha), 12);
    const { rows } = await query(
      'INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES($1,$2,$3,$4) RETURNING ' +
        publicUser,
      [nome, address, hash, req.body.perfil],
    );
    res.status(201).json(rows[0]);
  }),
);
router.patch(
  '/usuarios/:id',
  permit('admin'),
  wrap(async (req, res) => {
    const id = positiveId(req.params.id),
      fields = {},
      body = req.body;
    if (
      Number(req.user.id) === id &&
      (body.ativo === false || (body.perfil !== undefined && body.perfil !== 'admin'))
    )
      throw error(409, 'Você não pode desativar ou rebaixar sua própria conta');
    if (body.nome !== undefined) fields.nome = requiredString(body.nome, 'nome');
    if (body.email !== undefined) fields.email = email(body.email);
    if (body.perfil !== undefined) {
      if (!['admin', 'supervisor', 'inspetor'].includes(body.perfil))
        throw error(400, 'Perfil inválido');
      fields.perfil = body.perfil;
    }
    if (body.ativo !== undefined) {
      if (typeof body.ativo !== 'boolean') throw error(400, 'ativo deve ser booleano');
      fields.ativo = body.ativo;
    }
    if (body.senha !== undefined) fields.senha_hash = await bcrypt.hash(password(body.senha), 12);
    const keys = Object.keys(fields);
    if (!keys.length) throw error(400, 'Nenhum campo para atualizar');
    const { rows } = await query(
      'UPDATE usuarios SET ' +
        keys.map((k, i) => k + '=$' + (i + 1)).join(',') +
        ',token_version=token_version+1 WHERE id=$' +
        (keys.length + 1) +
        ' RETURNING ' +
        publicUser,
      [...Object.values(fields), id],
    );
    if (!rows.length) throw error(404, 'Usuário não encontrado');
    res.json(rows[0]);
  }),
);
module.exports = router;
