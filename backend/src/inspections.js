const express = require('express');
const { query, transaction } = require('./db');
const { permit } = require('./auth');
const {
  error,
  positiveId,
  requiredString,
  optionalString,
  pagination,
  order,
  pageResponse,
  wrap,
  computeResult,
  filters,
} = require('./utils');
const router = express.Router();
function canEdit(user, inspection) {
  if (user.perfil === 'inspetor' && Number(user.id) !== Number(inspection.inspetor_id))
    throw error(403, 'Inspeção de outro inspetor');
}
async function editableInspection(db, id, user) {
  const found = await db.query('SELECT * FROM inspecoes WHERE id=$1 FOR UPDATE', [id]);
  if (!found.rows.length) throw error(404, 'Inspeção não encontrada');
  canEdit(user, found.rows[0]);
  if (found.rows[0].status !== 'em_andamento') throw error(409, 'Inspeção já finalizada');
  return found.rows[0];
}
router.get(
  '/inspecoes',
  wrap(async (req, res) => {
    const { limit, offset, page } = pagination(req.query),
      f = filters(req.query);
    const sort = order(req.query, { id: 'i.id', iniciada_em: 'i.iniciada_em', status: 'i.status' });
    const from =
      ' FROM inspecoes i JOIN lotes l ON l.id=i.lote_id JOIN produtos p ON p.id=l.produto_id';
    const count = await query('SELECT count(*) AS total' + from + f.where, f.values);
    const n = f.values.length;
    const { rows } = await query(
      'SELECT i.*,l.codigo AS lote_codigo,p.nome AS produto' +
        from +
        f.where +
        ' ORDER BY ' +
        sort +
        ' LIMIT $' +
        (n + 1) +
        ' OFFSET $' +
        (n + 2),
      [...f.values, limit, offset],
    );
    res.json(pageResponse(rows, count.rows[0].total, page, limit));
  }),
);
router.post(
  '/inspecoes',
  wrap(async (req, res) => {
    const loteId = positiveId(req.body.lote_id),
      checklistId = positiveId(req.body.checklist_id);
    const result = await transaction(async (db) => {
      const lot = await db.query(
        'SELECT l.*,p.ativo AS produto_ativo FROM lotes l JOIN produtos p ON p.id=l.produto_id WHERE l.id=$1 FOR UPDATE OF l FOR SHARE OF p',
        [loteId],
      );
      if (!lot.rows.length) throw error(404, 'Lote não encontrado');
      if (!lot.rows[0].ativo || !lot.rows[0].produto_ativo || lot.rows[0].status !== 'pendente')
        throw error(409, 'Lote ou produto inativo, ou lote já decidido');
      const used = await db.query('SELECT id FROM inspecoes WHERE lote_id=$1', [loteId]);
      if (used.rows.length) throw error(409, 'Lote já possui inspeção');
      const check = await db.query(
        'SELECT id FROM checklists WHERE id=$1 AND ativo=true FOR UPDATE',
        [checklistId],
      );
      if (!check.rows.length) throw error(400, 'Checklist não encontrado ou inativo');
      const items = await db.query(
        'SELECT ci.id,ci.obrigatorio,c.nome,c.descricao,c.ativo FROM checklist_itens ci JOIN criterios c ON c.id=ci.criterio_id WHERE ci.checklist_id=$1 ORDER BY ci.id FOR SHARE OF c',
        [checklistId],
      );
      if (!items.rows.length || items.rows.some((item) => !item.ativo))
        throw error(400, 'Checklist vazio ou contém critério inativo');
      const { rows } = await db.query(
        'INSERT INTO inspecoes(lote_id,checklist_id,inspetor_id) VALUES($1,$2,$3) RETURNING *',
        [loteId, checklistId, req.user.id],
      );
      for (const item of items.rows) {
        await db.query(
          'INSERT INTO inspecao_itens(inspecao_id,item_id,criterio_nome,criterio_descricao,obrigatorio) VALUES($1,$2,$3,$4,$5)',
          [rows[0].id, item.id, item.nome, item.descricao, item.obrigatorio],
        );
      }
      return rows[0];
    });
    res.status(201).json(result);
  }),
);
router.get(
  '/inspecoes/:id',
  wrap(async (req, res) => {
    const id = positiveId(req.params.id);
    const { rows } = await query('SELECT * FROM inspecoes WHERE id=$1', [id]);
    if (!rows.length) throw error(404, 'Inspeção não encontrada');
    const items = await query(
      'SELECT s.*,r.id AS resposta_id,r.resultado,r.observacao FROM inspecao_itens s LEFT JOIN respostas r ON r.inspecao_id=s.inspecao_id AND r.item_id=s.item_id WHERE s.inspecao_id=$1 ORDER BY s.item_id',
      [id],
    );
    const answers = await query('SELECT * FROM respostas WHERE inspecao_id=$1 ORDER BY item_id', [
      id,
    ]);
    const mandatory = items.rows.filter((i) => i.obrigatorio);
    res.json({
      ...rows[0],
      itens: items.rows,
      respostas: answers.rows,
      andamento: {
        total: items.rows.length,
        respondidos: answers.rows.length,
        obrigatorios: mandatory.length,
        obrigatorios_respondidos: mandatory.filter((i) => i.resposta_id !== null).length,
        percentual: Number(((answers.rows.length / items.rows.length) * 100).toFixed(2)),
      },
    });
  }),
);
router.put(
  '/inspecoes/:id/respostas/:itemId',
  wrap(async (req, res) => {
    const id = positiveId(req.params.id),
      itemId = positiveId(req.params.itemId);
    if (!['conforme', 'nao_conforme', 'nao_aplicavel'].includes(req.body.resultado))
      throw error(400, 'Resultado inválido');
    const observation = optionalString(req.body.observacao, 'observacao', 3000);
    if (req.body.resultado === 'nao_aplicavel' && !observation)
      throw error(400, 'Justifique o resultado não aplicável em observacao');
    const result = await transaction(async (db) => {
      const inspection = await editableInspection(db, id, req.user);
      const item = await db.query(
        'SELECT item_id FROM inspecao_itens WHERE item_id=$1 AND inspecao_id=$2',
        [itemId, id],
      );
      if (!item.rows.length) throw error(400, 'Item não pertence à inspeção');
      const existing = await db.query(
        'SELECT n.id FROM respostas r JOIN nao_conformidades n ON n.resposta_id=r.id WHERE r.inspecao_id=$1 AND r.item_id=$2',
        [id, itemId],
      );
      if (existing.rows.length)
        throw error(409, 'Item com não conformidade registrada não pode ser alterado');
      const { rows } = await db.query(
        'INSERT INTO respostas(inspecao_id,item_id,checklist_id,resultado,observacao) VALUES($1,$2,$3,$4,$5) ON CONFLICT(inspecao_id,item_id) DO UPDATE SET resultado=excluded.resultado,observacao=excluded.observacao RETURNING *',
        [id, itemId, inspection.checklist_id, req.body.resultado, observation],
      );
      return rows[0];
    });
    res.json(result);
  }),
);
router.post(
  '/inspecoes/:id/finalizar',
  wrap(async (req, res) => {
    const id = positiveId(req.params.id);
    const result = await transaction(async (db) => {
      const inspection = await editableInspection(db, id, req.user);
      const items = await db.query(
        'SELECT item_id FROM inspecao_itens WHERE inspecao_id=$1 AND obrigatorio=true',
        [id],
      );
      const answers = await db.query(
        'SELECT item_id,resultado FROM respostas WHERE inspecao_id=$1',
        [id],
      );
      const status = computeResult(
        answers.rows,
        items.rows.map((x) => x.item_id),
      );
      const nc = await db.query(
        "SELECT 1 FROM respostas r LEFT JOIN nao_conformidades n ON n.resposta_id=r.id WHERE r.inspecao_id=$1 AND r.resultado='nao_conforme' AND n.id IS NULL LIMIT 1",
        [id],
      );
      if (nc.rows.length) throw error(409, 'Registre a não conformidade de cada item reprovado');
      const { rows } = await db.query(
        'UPDATE inspecoes SET status=$1,finalizada_em=NOW() WHERE id=$2 RETURNING *',
        [status, id],
      );
      await db.query('UPDATE lotes SET status=$1 WHERE id=$2', [
        status === 'reprovada' ? 'reprovado' : 'aprovado',
        inspection.lote_id,
      ]);
      return rows[0];
    });
    res.json(result);
  }),
);
router.post(
  '/respostas/:id/nao-conformidade',
  wrap(async (req, res) => {
    const respostaId = positiveId(req.params.id),
      descricao = requiredString(req.body.descricao, 'descricao', 3000);
    const classification = req.body.classificacao ?? 'menor';
    if (!['menor', 'maior', 'critica'].includes(classification))
      throw error(400, 'Classificação inválida');
    const result = await transaction(async (db) => {
      const { rows } = await db.query(
        'SELECT r.*,i.inspetor_id,i.status FROM respostas r JOIN inspecoes i ON i.id=r.inspecao_id WHERE r.id=$1 FOR UPDATE OF i',
        [respostaId],
      );
      if (!rows.length) throw error(404, 'Resposta não encontrada');
      canEdit(req.user, rows[0]);
      if (rows[0].status !== 'em_andamento' || rows[0].resultado !== 'nao_conforme')
        throw error(409, 'Resposta não permite não conformidade');
      const added = await db.query(
        'INSERT INTO nao_conformidades(resposta_id,descricao,classificacao) VALUES($1,$2,$3) RETURNING *',
        [respostaId, descricao, classification],
      );
      await db.query(
        "INSERT INTO nao_conformidade_historico(nao_conformidade_id,usuario_id,status) VALUES($1,$2,'aberta')",
        [added.rows[0].id, req.user.id],
      );
      return added.rows[0];
    });
    res.status(201).json(result);
  }),
);
router.get(
  '/nao-conformidades',
  wrap(async (req, res) => {
    const { limit, offset, page } = pagination(req.query);
    // status filtra o desvio; os demais filtros usam o mesmo contrato do histórico.
    const f = filters({ ...req.query, status: undefined });
    if (req.query.status !== undefined) {
      if (!['aberta', 'em_tratamento', 'resolvida'].includes(req.query.status))
        throw error(400, 'Status inválido');
      f.values.push(req.query.status);
      f.clauses.push('n.status=$' + f.values.length);
    }
    const where = f.clauses.length ? ' WHERE ' + f.clauses.join(' AND ') : '';
    const from =
      ' FROM nao_conformidades n JOIN respostas r ON r.id=n.resposta_id JOIN inspecoes i ON i.id=r.inspecao_id JOIN lotes l ON l.id=i.lote_id JOIN produtos p ON p.id=l.produto_id';
    const count = await query('SELECT count(*) AS total' + from + where, f.values),
      n = f.values.length;
    const sort = order(req.query, { id: 'n.id', criado_em: 'n.criado_em', status: 'n.status' });
    const { rows } = await query(
      'SELECT n.*,r.inspecao_id,r.item_id' +
        from +
        where +
        ' ORDER BY ' +
        sort +
        ' LIMIT $' +
        (n + 1) +
        ' OFFSET $' +
        (n + 2),
      [...f.values, limit, offset],
    );
    res.json(pageResponse(rows, count.rows[0].total, page, limit));
  }),
);
router.get(
  '/nao-conformidades/:id',
  wrap(async (req, res) => {
    const id = positiveId(req.params.id);
    const { rows } = await query(
      'SELECT n.*,r.inspecao_id,r.item_id FROM nao_conformidades n JOIN respostas r ON r.id=n.resposta_id WHERE n.id=$1',
      [id],
    );
    if (!rows.length) throw error(404, 'Não conformidade não encontrada');
    const history = await query(
      'SELECT id,usuario_id,status,criado_em FROM nao_conformidade_historico WHERE nao_conformidade_id=$1 ORDER BY id',
      [id],
    );
    res.json({ ...rows[0], historico: history.rows });
  }),
);
router.patch(
  '/nao-conformidades/:id',
  permit('admin', 'supervisor'),
  wrap(async (req, res) => {
    if (!['em_tratamento', 'resolvida'].includes(req.body.status))
      throw error(400, 'Status inválido');
    const result = await transaction(async (db) => {
      const id = positiveId(req.params.id);
      const found = await db.query('SELECT * FROM nao_conformidades WHERE id=$1 FOR UPDATE', [id]);
      if (!found.rows.length) throw error(404, 'Não conformidade não encontrada');
      const next = { aberta: 'em_tratamento', em_tratamento: 'resolvida' }[found.rows[0].status];
      if (next !== req.body.status)
        throw error(409, 'Transição inválida; use aberta → em_tratamento → resolvida');
      const { rows } = await db.query(
        'UPDATE nao_conformidades SET status=$1 WHERE id=$2 RETURNING *',
        [next, id],
      );
      await db.query(
        'INSERT INTO nao_conformidade_historico(nao_conformidade_id,usuario_id,status) VALUES($1,$2,$3)',
        [id, req.user.id, next],
      );
      return rows[0];
    });
    res.json(result);
  }),
);
module.exports = router;
