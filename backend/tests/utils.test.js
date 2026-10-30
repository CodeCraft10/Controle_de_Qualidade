const test = require('node:test');
const assert = require('node:assert/strict');
const { computeResult, positiveId, pagination, filters, password } = require('../src/utils');
test('bloqueia conclusão com item obrigatório faltando', () => {
  assert.throws(
    () => computeResult([{ item_id: 1, resultado: 'conforme' }], [1, 2]),
    /obrigatórios/,
  );
});
test('reprova quando há resposta não conforme', () => {
  assert.equal(computeResult([{ item_id: 1, resultado: 'nao_conforme' }], [1]), 'reprovada');
});
test('aprova quando critérios preenchidos e conformes', () => {
  assert.equal(computeResult([{ item_id: 1, resultado: 'conforme' }], [1]), 'aprovada');
});
test('valida ids, tipos e paginação', () => {
  for (const invalid of ['1 OR 1=1', true, [1], '1e2', '1.0', 0, null])
    assert.throws(() => positiveId(invalid));
  assert.throws(() => pagination({ limit: 1000 }));
});
test('datas inválidas e períodos invertidos são rejeitados', () => {
  assert.throws(() => filters({ de: '2026-02-30' }));
  assert.throws(() => filters({ de: '2026-10-30', ate: '2026-10-01' }));
});
test('bcrypt recebe senha sem truncamento e preserva espaços', () => {
  assert.throws(() => password('á'.repeat(40)));
  assert.equal(password(' 12345678 '), ' 12345678 ');
});
