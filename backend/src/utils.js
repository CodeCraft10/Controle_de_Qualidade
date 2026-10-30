function error(status, message) {
  return Object.assign(new Error(message), { status });
}
function positiveId(value) {
  if (!['string', 'number'].includes(typeof value) || !/^[1-9][0-9]*$/.test(String(value))) {
    throw error(400, 'ID inválido');
  }
  const n = Number(value);
  if (!Number.isSafeInteger(n)) throw error(400, 'ID inválido');
  return n;
}
function requiredString(value, field, max = 150) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) {
    throw error(400, 'Campo ' + field + ' inválido');
  }
  return value.trim();
}
function optionalString(value, field, max = 2000) {
  return value === null || value === undefined || value === ''
    ? null
    : requiredString(value, field, max);
}
function password(value) {
  if (typeof value !== 'string' || value.length < 8 || Buffer.byteLength(value) > 72) {
    throw error(400, 'Senha deve ter pelo menos 8 caracteres e no máximo 72 bytes');
  }
  return value;
}
function email(value) {
  const parsed = requiredString(value, 'email', 200).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(parsed)) throw error(400, 'Email inválido');
  return parsed;
}
function pagination(q) {
  const page = positiveId(q.page ?? 1),
    limit = positiveId(q.limit ?? 20);
  if (limit > 100 || !Number.isSafeInteger((page - 1) * limit))
    throw error(400, 'Paginação inválida');
  return { limit, offset: (page - 1) * limit, page };
}
function order(q, allowed, fallback = 'id') {
  const field = q.ordenar ?? fallback;
  const direction = q.direcao ?? 'desc';
  if (!Object.hasOwn(allowed, field) || !['asc', 'desc'].includes(direction))
    throw error(400, 'Ordenação inválida');
  return (
    allowed[field] + ' ' + direction + (field === 'id' ? '' : ', ' + allowed.id + ' ' + direction)
  );
}
function pageResponse(rows, total, page, limit) {
  return { data: rows, page, limit, total: Number(total), pages: Math.ceil(Number(total) / limit) };
}
function wrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}
function computeResult(answers, mandatoryIds) {
  const answered = new Map(answers.map((a) => [Number(a.item_id), a.resultado]));
  if (!answers.length || mandatoryIds.some((id) => !answered.has(Number(id)))) {
    throw error(409, 'Existem itens obrigatórios sem resposta');
  }
  return answers.some((a) => a.resultado === 'nao_conforme') ? 'reprovada' : 'aprovada';
}
function filters(q, alias = 'i') {
  const clauses = [],
    values = [];
  function add(sql, value) {
    values.push(value);
    clauses.push(sql.replace('?', '$' + values.length));
  }
  for (const field of ['lote_id', 'inspetor_id']) {
    if (q[field] !== undefined) add(alias + '.' + field + '=?', positiveId(q[field]));
  }
  if (q.produto_id !== undefined) add('l.produto_id=?', positiveId(q.produto_id));
  if (q.busca !== undefined) {
    values.push('%' + requiredString(q.busca, 'busca', 100) + '%');
    clauses.push(
      '(p.nome ILIKE $' +
        values.length +
        ' OR p.codigo ILIKE $' +
        values.length +
        ' OR l.codigo ILIKE $' +
        values.length +
        ')',
    );
  }
  if (q.status !== undefined) {
    if (!['em_andamento', 'aprovada', 'reprovada'].includes(q.status))
      throw error(400, 'Status inválido');
    add(alias + '.status=?', q.status);
  }
  for (const field of ['de', 'ate']) {
    if (q[field] === undefined) continue;
    const value = q[field];
    if (
      typeof value !== 'string' ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
      Number.isNaN(Date.parse(value)) ||
      new Date(value).toISOString().slice(0, 10) !== value
    ) {
      throw error(400, 'Data inválida');
    }
    add(
      alias +
        '.iniciada_em ' +
        (field === 'de'
          ? ">= (?::date::timestamp AT TIME ZONE 'America/Sao_Paulo')"
          : "< ((?::date + 1)::timestamp AT TIME ZONE 'America/Sao_Paulo')"),
      value,
    );
  }
  if (q.de && q.ate && q.de > q.ate) throw error(400, 'Período inválido');
  return { clauses, values, where: clauses.length ? ' WHERE ' + clauses.join(' AND ') : '' };
}
module.exports = {
  error,
  positiveId,
  requiredString,
  optionalString,
  password,
  email,
  pagination,
  order,
  pageResponse,
  wrap,
  computeResult,
  filters,
};
