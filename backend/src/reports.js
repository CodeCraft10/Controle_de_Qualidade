const express = require('express');
const { query } = require('./db');
const { wrap, error, filters, pagination, order, pageResponse } = require('./utils');
const router = express.Router();
const from =
  ' FROM inspecoes i JOIN lotes l ON l.id=i.lote_id JOIN produtos p ON p.id=l.produto_id JOIN usuarios u ON u.id=i.inspetor_id JOIN checklists c ON c.id=i.checklist_id';
router.get(
  '/indicadores',
  wrap(async (req, res) => {
    const f = filters(req.query);
    const { rows } = await query(
      "SELECT COUNT(*)::int AS total, COUNT(*) FILTER(WHERE i.status='aprovada')::int AS aprovadas, COUNT(*) FILTER(WHERE i.status='reprovada')::int AS reprovadas, COUNT(*) FILTER(WHERE i.status='em_andamento')::int AS em_andamento" +
        from +
        f.where,
      f.values,
    );
    const d = rows[0],
      finished = d.aprovadas + d.reprovadas;
    const nc = await query(
      'SELECT count(*)::int AS total FROM nao_conformidades n JOIN respostas r ON r.id=n.resposta_id JOIN inspecoes i ON i.id=r.inspecao_id JOIN lotes l ON l.id=i.lote_id JOIN produtos p ON p.id=l.produto_id' +
        f.where,
      f.values,
    );
    res.json({
      ...d,
      finalizadas: finished,
      nao_conformidades: nc.rows[0].total,
      taxa_aprovacao: finished ? Number(((d.aprovadas / finished) * 100).toFixed(2)) : 0,
      taxa_reprovacao: finished ? Number(((d.reprovadas / finished) * 100).toFixed(2)) : 0,
      criterio_taxa:
        'quantidade do resultado / inspeções finalizadas * 100; zero quando sem finalizadas',
    });
  }),
);
function csvValue(value) {
  let text = value instanceof Date ? value.toISOString() : String(value ?? '');
  if (/^[\s\u0000-\u001f]*[=+@-]/.test(text) || /^[\t\r\n]/.test(text)) text = "'" + text;
  return '"' + text.replace(/"/g, '""') + '"';
}
router.get(
  '/relatorios/inspecoes',
  wrap(async (req, res) => {
    const { limit, offset, page } = pagination(req.query),
      f = filters(req.query);
    if (req.query.formato !== undefined && !['json', 'csv'].includes(req.query.formato))
      throw error(400, 'Formato inválido');
    const sort = order(
      req.query,
      { id: 'i.id', iniciada_em: 'i.iniciada_em', status: 'i.status' },
      'iniciada_em',
    );
    const count = await query('SELECT count(*) AS total' + from + f.where, f.values),
      n = f.values.length;
    const { rows } = await query(
      'SELECT i.id,i.status,i.iniciada_em,i.finalizada_em,l.codigo AS lote,p.nome AS produto,u.nome AS inspetor,c.nome AS checklist' +
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
    if (req.query.formato === 'csv') {
      const keys = [
        'id',
        'status',
        'iniciada_em',
        'finalizada_em',
        'lote',
        'produto',
        'inspetor',
        'checklist',
      ];
      res.set('Content-Type', 'text/csv; charset=utf-8');
      res.set('Content-Disposition', 'attachment; filename="inspecoes.csv"');
      return res.send(
        '\uFEFF' +
          keys.join(';') +
          '\r\n' +
          rows.map((r) => keys.map((k) => csvValue(r[k])).join(';')).join('\r\n'),
      );
    }
    res.json(pageResponse(rows, count.rows[0].total, page, limit));
  }),
);
module.exports = router;
