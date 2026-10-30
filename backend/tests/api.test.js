const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
require('dotenv').config({ quiet: true });
const { Pool } = require('pg');
const request = require('supertest');
const bcrypt = require('bcryptjs');
const schema = 'gp4_test_' + crypto.randomUUID().replaceAll('-', '');
const adminPool = new Pool({
  connectionString: process.env.TEST_DATABASE_URL || process.env.DATABASE_URL,
});
let app, pool, transaction, admin, supervisor, inspector, other;
let product, lot, criterion, checklist, item, inspection, answer, nc, evidence;
const senha = crypto.randomBytes(18).toString('hex');
const uploadRoot = path.resolve(__dirname, '../.local/test-uploads');
const testUpload = path.join(uploadRoot, schema);
const tokens = {};
function api(method, url, role = 'admin') {
  return request(app)
    [method]('/api' + url)
    .set('Authorization', 'Bearer ' + tokens[role]);
}
async function create(resource, body) {
  const response = await api('post', '/' + resource)
    .send(body)
    .expect(201);
  return response.body;
}
before(async () => {
  if (!process.env.DATABASE_URL && !process.env.TEST_DATABASE_URL)
    throw new Error('Configure um PostgreSQL de teste');
  await adminPool.query('CREATE SCHEMA ' + schema);
  const url = new URL(process.env.TEST_DATABASE_URL || process.env.DATABASE_URL);
  url.searchParams.set('options', '-c search_path=' + schema);
  process.env.DATABASE_URL = url.toString();
  process.env.JWT_SECRET = crypto.randomBytes(48).toString('hex');
  process.env.LOG_REQUESTS = 'false';
  process.env.UPLOAD_DIR = testUpload;
  ({ pool, transaction } = require('../src/db'));
  for (const name of ['001_inicial.sql', '002_integridade.sql']) {
    await pool.query(await fs.readFile(path.join(__dirname, '../sql', name), 'utf8'));
  }
  const hash = await bcrypt.hash(senha, 12);
  for (const [key, profile] of [
    ['admin', 'admin'],
    ['supervisor', 'supervisor'],
    ['inspector', 'inspetor'],
    ['other', 'inspetor'],
  ]) {
    const inserted = await pool.query(
      'INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES($1,$2,$3,$4) RETURNING id',
      [key, key + '@gp4.test', hash, profile],
    );
    ({
      admin: (id) => (admin = id),
      supervisor: (id) => (supervisor = id),
      inspector: (id) => (inspector = id),
      other: (id) => (other = id),
    })[key](inserted.rows[0].id);
  }
  app = require('../src/app');
  for (const key of ['admin', 'supervisor', 'inspector', 'other']) {
    const response = await request(app)
      .post('/api/login')
      .send({ email: key + '@gp4.test', senha })
      .expect(200);
    tokens[key] = response.body.token;
    assert.ok(tokens[key]);
    assert.equal(response.body.usuario.senha_hash, undefined);
  }
});
after(async () => {
  if (pool) await pool.end();
  if (!/^gp4_test_[a-f0-9]{32}$/.test(schema)) throw new Error('Schema de teste inválido');
  await adminPool.query('DROP SCHEMA IF EXISTS ' + schema + ' CASCADE');
  await adminPool.end();
  if (testUpload.startsWith(uploadRoot + path.sep)) {
    for (const file of await fs.readdir(testUpload).catch(() => []))
      await fs.unlink(path.join(testUpload, file));
    await fs.rmdir(testUpload).catch(() => {});
  }
});
test('API completa com HTTP real e PostgreSQL', async (t) => {
  await t.test('saúde, prontidão, CORS e headers de segurança', async () => {
    const health = await request(app)
      .get('/api/saude')
      .set('Origin', 'http://localhost:5173')
      .expect(200);
    assert.equal(health.body.status, 'ok');
    assert.equal(health.headers['access-control-allow-origin'], 'http://localhost:5173');
    assert.equal(health.headers['x-content-type-options'], 'nosniff');
    const denied = await request(app).get('/api/saude').set('Origin', 'http://malicioso.test');
    assert.equal(denied.headers['access-control-allow-origin'], undefined);
    await request(app).get('/api/prontidao').expect(200);
  });
  await t.test(
    'autenticação bloqueia credencial incorreta, token inválido e SQL injection',
    async () => {
      await request(app)
        .post('/api/login')
        .send({ email: 'admin@gp4.test', senha: 'SenhaIncorreta' })
        .expect(401);
      await request(app)
        .post('/api/login')
        .send({ email: "'/**/OR/**/1=1--@gp4.test", senha })
        .expect(401);
      await request(app).get('/api/produtos').expect(401);
      await request(app).get('/api/me').set('Authorization', 'Bearer invalido').expect(401);
      const me = await api('get', '/me').expect(200);
      assert.equal(me.body.id, admin);
      assert.equal(me.body.senha_hash, undefined);
    },
  );
  await t.test('perfis protegem usuários e cadastros', async () => {
    await api('post', '/produtos', 'inspector').send({ codigo: 'X', nome: 'X' }).expect(403);
    await api('post', '/usuarios', 'supervisor').send({}).expect(403);
    await api('get', '/usuarios', 'inspector').expect(403);
    await api('get', '/usuarios', 'supervisor').expect(200);
  });
  await t.test('valida JSON, campos, IDs e paginação', async () => {
    await api('post', '/produtos').send({ nome: 'Sem código' }).expect(400);
    await api('post', '/produtos')
      .send({ codigo: 'A', nome: 'Teste', status: 'aprovado' })
      .expect(400);
    await api('post', '/produtos').set('Content-Type', 'application/json').send('{').expect(400);
    await api('post', '/produtos').set('Content-Type', 'application/json').send('null').expect(400);
    await api('get', '/produtos/1%20OR%201=1').expect(400);
    await api('get', '/produtos?limit=101').expect(400);
    await api('get', '/produtos?ordenar=id;DROP%20TABLE%20usuarios').expect(400);
    await api('get', '/produtos/99999').expect(404);
  });
  await t.test('cria produto, valida duplicidade, consulta e atualização', async () => {
    product = await create('produtos', { codigo: 'P001', nome: 'Peça A' });
    await api('post', '/produtos').send({ codigo: 'P001', nome: 'Duplicado' }).expect(409);
    const updated = await api('patch', '/produtos/' + product.id)
      .send({ descricao: 'Peça industrial' })
      .expect(200);
    assert.equal(updated.body.descricao, 'Peça industrial');
    const list = await api(
      'get',
      '/produtos?page=1&limit=10&ativo=true&ordenar=nome&direcao=asc',
    ).expect(200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.pages, 1);
  });
  await t.test('lotes validam produto inexistente, inativo e quantidade', async () => {
    await api('post', '/lotes')
      .send({ codigo: 'L0', produto_id: 9999, quantidade: 10 })
      .expect(400);
    await api('post', '/lotes')
      .send({ codigo: 'L0', produto_id: product.id, quantidade: true })
      .expect(400);
    await api('patch', '/produtos/' + product.id + '/ativo')
      .send({ ativo: false })
      .expect(200);
    await api('post', '/lotes')
      .send({ codigo: 'L0', produto_id: product.id, quantidade: 10 })
      .expect(400);
    await api('patch', '/produtos/' + product.id + '/ativo')
      .send({ ativo: true })
      .expect(200);
    lot = await create('lotes', { codigo: 'L001', produto_id: product.id, quantidade: 10 });
    await api('post', '/lotes')
      .send({ codigo: 'L001', produto_id: product.id, quantidade: 5 })
      .expect(409);
  });
  await t.test('cria checklist, critérios, itens e valida relacionamentos', async () => {
    criterion = await create('criterios', { nome: 'Visual' });
    checklist = await create('checklists', { nome: 'Checklist A' });
    await api('post', '/criterios').send({ nome: 'Visual' }).expect(409);
    await api('post', '/checklists/' + checklist.id + '/itens')
      .send({ criterio_id: 9999 })
      .expect(400);
    item = (
      await api('post', '/checklists/' + checklist.id + '/itens')
        .send({ criterio_id: criterion.id, obrigatorio: true })
        .expect(201)
    ).body;
    await api('post', '/checklists/' + checklist.id + '/itens')
      .send({ criterio_id: criterion.id })
      .expect(409);
    await api('get', '/checklists/99999/itens').expect(404);
    const extra = await create('criterios', { nome: 'Dimensional' });
    const temporary = (
      await api('post', '/checklists/' + checklist.id + '/itens')
        .send({ criterio_id: extra.id, obrigatorio: false })
        .expect(201)
    ).body;
    await api('delete', '/checklists/' + checklist.id + '/itens/' + temporary.id).expect(204);
  });
  await t.test('abertura inválida faz rollback e não deixa inspeções', async () => {
    const empty = await create('checklists', { nome: 'Vazio' });
    await api('post', '/inspecoes', 'inspector')
      .send({ lote_id: lot.id, checklist_id: empty.id })
      .expect(400);
    const result = await pool.query('SELECT count(*)::int AS total FROM inspecoes');
    assert.equal(result.rows[0].total, 0);
    await api('patch', '/criterios/' + criterion.id + '/ativo')
      .send({ ativo: false })
      .expect(200);
    await api('post', '/inspecoes', 'inspector')
      .send({ lote_id: lot.id, checklist_id: checklist.id })
      .expect(400);
    await api('patch', '/criterios/' + criterion.id + '/ativo')
      .send({ ativo: true })
      .expect(200);
  });
  await t.test('aberturas concorrentes criam somente uma inspeção por lote', async () => {
    const calls = await Promise.all(
      [1, 2].map(() =>
        api('post', '/inspecoes', 'inspector').send({
          lote_id: lot.id,
          checklist_id: checklist.id,
        }),
      ),
    );
    assert.deepEqual(calls.map((r) => r.status).sort(), [201, 409]);
    inspection = calls.find((r) => r.status === 201).body;
    assert.equal(inspection.inspetor_id, inspector);
  });
  await t.test('itens e cadastros utilizados ficam protegidos', async () => {
    await api('post', '/checklists/' + checklist.id + '/itens')
      .send({ criterio_id: criterion.id })
      .expect(409);
    await api('delete', '/checklists/' + checklist.id + '/itens/' + item.id).expect(409);
    for (const [resource, id, body] of [
      ['checklists', checklist.id, { nome: 'Alterado' }],
      ['criterios', criterion.id, { nome: 'Alterado' }],
      ['produtos', product.id, { nome: 'Alterado' }],
      ['lotes', lot.id, { quantidade: 11 }],
    ])
      await api('patch', '/' + resource + '/' + id)
        .send(body)
        .expect(409);
  });
  await t.test('detalhe apresenta critérios pendentes e progresso', async () => {
    const response = await api('get', '/inspecoes/' + inspection.id).expect(200);
    assert.equal(response.body.itens[0].criterio_nome, 'Visual');
    assert.equal(response.body.andamento.percentual, 0);
    await api('post', '/inspecoes/' + inspection.id + '/finalizar', 'inspector').expect(409);
  });
  await t.test('outro inspetor não pode responder ou finalizar', async () => {
    await api('put', '/inspecoes/' + inspection.id + '/respostas/' + item.id, 'other')
      .send({ resultado: 'conforme' })
      .expect(403);
    await api('post', '/inspecoes/' + inspection.id + '/finalizar', 'other').expect(403);
  });
  await t.test('respostas validam item, resultado e justificativa', async () => {
    await api('put', '/inspecoes/' + inspection.id + '/respostas/9999', 'inspector')
      .send({ resultado: 'conforme' })
      .expect(400);
    await api('put', '/inspecoes/' + inspection.id + '/respostas/' + item.id, 'inspector')
      .send({ resultado: 'invalido' })
      .expect(400);
    await api('put', '/inspecoes/' + inspection.id + '/respostas/' + item.id, 'inspector')
      .send({ resultado: 'nao_aplicavel' })
      .expect(400);
    answer = (
      await api('put', '/inspecoes/' + inspection.id + '/respostas/' + item.id, 'inspector')
        .send({ resultado: 'nao_conforme', observacao: 'Risco na superfície' })
        .expect(200)
    ).body;
    const progress = await api('get', '/inspecoes/' + inspection.id).expect(200);
    assert.equal(progress.body.andamento.percentual, 100);
    await api('post', '/inspecoes/' + inspection.id + '/finalizar', 'inspector').expect(409);
  });
  await t.test('não conformidades validam classificação e autoria, sem duplicação', async () => {
    await api('post', '/respostas/' + answer.id + '/nao-conformidade', 'other')
      .send({ descricao: 'Defeito' })
      .expect(403);
    await api('post', '/respostas/' + answer.id + '/nao-conformidade', 'inspector')
      .send({ descricao: '' })
      .expect(400);
    await api('post', '/respostas/' + answer.id + '/nao-conformidade', 'inspector')
      .send({ descricao: 'Defeito', classificacao: 'x' })
      .expect(400);
    nc = (
      await api('post', '/respostas/' + answer.id + '/nao-conformidade', 'inspector')
        .send({ descricao: 'Risco', classificacao: 'maior' })
        .expect(201)
    ).body;
    await api('post', '/respostas/' + answer.id + '/nao-conformidade', 'inspector')
      .send({ descricao: 'Risco' })
      .expect(409);
    await api('put', '/inspecoes/' + inspection.id + '/respostas/' + item.id, 'inspector')
      .send({ resultado: 'conforme' })
      .expect(409);
  });
  const png = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aX1sAAAAASUVORK5CYII=',
    'base64',
  );
  await t.test(
    'upload rejeita tipo, assinatura, campo, excesso de tamanho e acesso indevido',
    async () => {
      const url = '/nao-conformidades/' + nc.id + '/evidencias';
      await api('post', url, 'other')
        .attach('foto', png, { filename: 'a.png', contentType: 'image/png' })
        .expect(403);
      await api('post', url, 'inspector')
        .attach('foto', Buffer.from('texto'), { filename: 'a.txt', contentType: 'text/plain' })
        .expect(400);
      await api('post', url, 'inspector')
        .attach('foto', Buffer.from('falsa'), { filename: 'a.png', contentType: 'image/png' })
        .expect(400);
      await api('post', url, 'inspector')
        .attach('errado', png, { filename: 'a.png', contentType: 'image/png' })
        .expect(400);
      await api('post', url, 'inspector')
        .attach('foto', Buffer.alloc(5 * 1024 * 1024 + 1), {
          filename: 'a.png',
          contentType: 'image/png',
        })
        .expect(413);
      const count = await pool.query('SELECT count(*)::int AS total FROM evidencias');
      assert.equal(count.rows[0].total, 0);
    },
  );
  await t.test(
    'persiste imagem e metadados e aplica autorização em listagem e download',
    async () => {
      evidence = (
        await api('post', '/nao-conformidades/' + nc.id + '/evidencias', 'inspector')
          .attach('foto', png, { filename: 'foto.png', contentType: 'image/png' })
          .expect(201)
      ).body;
      assert.equal(evidence.nome_arquivo, undefined);
      const listed = await api(
        'get',
        '/nao-conformidades/' + nc.id + '/evidencias',
        'inspector',
      ).expect(200);
      assert.equal(listed.body.data.length, 1);
      await api('get', '/nao-conformidades/' + nc.id + '/evidencias', 'other').expect(403);
      await api('get', '/evidencias/' + evidence.id + '/arquivo', 'other').expect(403);
      await request(app)
        .get('/api/evidencias/' + evidence.id + '/arquivo')
        .expect(401);
      const download = await api(
        'get',
        '/evidencias/' + evidence.id + '/arquivo',
        'inspector',
      ).expect(200);
      assert.deepEqual(download.body, png);
      assert.equal(download.headers['cache-control'], 'no-store');
    },
  );
  await t.test('falha de metadados remove arquivo e desfaz transação', async () => {
    const before = await fs.readdir(testUpload);
    await pool.query(
      "CREATE FUNCTION fail_evidence() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha de teste'; END $$",
    );
    await pool.query(
      'CREATE TRIGGER fail_evidence BEFORE INSERT ON evidencias FOR EACH ROW EXECUTE FUNCTION fail_evidence()',
    );
    try {
      const failed = await api('post', '/nao-conformidades/' + nc.id + '/evidencias', 'inspector')
        .attach('foto', png, { filename: 'erro.png', contentType: 'image/png' })
        .expect(500);
      assert.equal(failed.body.erro, 'Erro interno no servidor');
      assert.deepEqual(await fs.readdir(testUpload), before);
    } finally {
      await pool.query('DROP TRIGGER fail_evidence ON evidencias');
      await pool.query('DROP FUNCTION fail_evidence()');
    }
  });

  await t.test('erro ao decidir lote desfaz também a finalização da inspeção', async () => {
    await pool.query(
      "CREATE FUNCTION fail_lot() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'falha de teste'; END $$",
    );
    await pool.query(
      'CREATE TRIGGER fail_lot BEFORE UPDATE ON lotes FOR EACH ROW EXECUTE FUNCTION fail_lot()',
    );
    try {
      await api('post', '/inspecoes/' + inspection.id + '/finalizar', 'inspector').expect(500);
      const current = await pool.query('SELECT status,finalizada_em FROM inspecoes WHERE id=$1', [
        inspection.id,
      ]);
      assert.equal(current.rows[0].status, 'em_andamento');
      assert.equal(current.rows[0].finalizada_em, null);
    } finally {
      await pool.query('DROP TRIGGER fail_lot ON lotes');
      await pool.query('DROP FUNCTION fail_lot()');
    }
  });
  await t.test('finalizações concorrentes decidem uma única vez e preservam o lote', async () => {
    const calls = await Promise.all(
      [1, 2].map(() => api('post', '/inspecoes/' + inspection.id + '/finalizar', 'inspector')),
    );
    assert.deepEqual(calls.map((r) => r.status).sort(), [200, 409]);
    assert.equal(calls.find((r) => r.status === 200).body.status, 'reprovada');
    const updatedLot = await api('get', '/lotes/' + lot.id).expect(200);
    assert.equal(updatedLot.body.status, 'reprovado');
    await api('put', '/inspecoes/' + inspection.id + '/respostas/' + item.id, 'inspector')
      .send({ resultado: 'conforme' })
      .expect(409);
    await api('post', '/nao-conformidades/' + nc.id + '/evidencias', 'inspector')
      .attach('foto', png, { filename: 'a.png', contentType: 'image/png' })
      .expect(409);
  });
  await t.test('tratamento de desvios exige transições e mantém histórico', async () => {
    await api('patch', '/nao-conformidades/' + nc.id, 'inspector')
      .send({ status: 'em_tratamento' })
      .expect(403);
    await api('patch', '/nao-conformidades/' + nc.id)
      .send({ status: 'resolvida' })
      .expect(409);
    await api('patch', '/nao-conformidades/' + nc.id, 'supervisor')
      .send({ status: 'em_tratamento' })
      .expect(200);
    await api('patch', '/nao-conformidades/' + nc.id, 'supervisor')
      .send({ status: 'resolvida' })
      .expect(200);
    await api('patch', '/nao-conformidades/' + nc.id)
      .send({ status: 'em_tratamento' })
      .expect(409);
    const detail = await api('get', '/nao-conformidades/' + nc.id).expect(200);
    assert.deepEqual(
      detail.body.historico.map((h) => h.status),
      ['aberta', 'em_tratamento', 'resolvida'],
    );
  });
  await t.test(
    'fluxo conforme aprova lote e resultado não aplicável exige justificativa',
    async () => {
      const lot2 = await create('lotes', { codigo: 'L002', produto_id: product.id, quantidade: 5 });
      const opened = (
        await api('post', '/inspecoes', 'inspector')
          .send({ lote_id: lot2.id, checklist_id: checklist.id })
          .expect(201)
      ).body;
      const normal = (
        await api('put', '/inspecoes/' + opened.id + '/respostas/' + item.id, 'inspector')
          .send({ resultado: 'conforme' })
          .expect(200)
      ).body;
      await api('post', '/respostas/' + normal.id + '/nao-conformidade', 'inspector')
        .send({ descricao: 'Sem defeito' })
        .expect(409);
      await api('put', '/inspecoes/' + opened.id + '/respostas/' + item.id, 'inspector')
        .send({ resultado: 'nao_aplicavel', observacao: 'Não se aplica a esta peça' })
        .expect(200);
      await api('put', '/inspecoes/' + opened.id + '/respostas/' + item.id, 'inspector')
        .send({ resultado: 'conforme' })
        .expect(200);
      const finished = await api(
        'post',
        '/inspecoes/' + opened.id + '/finalizar',
        'inspector',
      ).expect(200);
      assert.equal(finished.body.status, 'aprovada');
    },
  );
  await t.test('histórico, filtros, indicadores e CSV retornam dados consistentes', async () => {
    const history = await api(
      'get',
      '/inspecoes?produto_id=' +
        product.id +
        '&inspetor_id=' +
        inspector +
        '&ordenar=iniciada_em&direcao=asc&limit=1',
    ).expect(200);
    assert.equal(history.body.total, 2);
    assert.equal(history.body.pages, 2);
    assert.equal(history.body.data.length, 1);
    const search = await api('get', '/relatorios/inspecoes?busca=L001&status=reprovada').expect(
      200,
    );
    assert.equal(search.body.total, 1);
    const metrics = await api('get', '/indicadores?produto_id=' + product.id).expect(200);
    assert.equal(metrics.body.total, 2);
    assert.equal(metrics.body.taxa_aprovacao, 50);
    assert.equal(metrics.body.taxa_reprovacao, 50);
    assert.equal(metrics.body.nao_conformidades, 1);
    const empty = await api('get', '/indicadores?de=2000-01-01&ate=2000-01-02').expect(200);
    assert.equal(empty.body.taxa_aprovacao, 0);
    const csv = await api('get', '/relatorios/inspecoes?formato=csv&lote_id=' + lot.id).expect(200);
    assert.match(csv.headers['content-type'], /text\/csv/);
    assert.match(csv.text, /L001/);
    await api('get', '/inspecoes?de=2026-02-30').expect(400);
    await api('get', '/inspecoes?de=2026-10-30&ate=2026-10-01').expect(400);
    await api('get', '/inspecoes?status=invalido').expect(400);
    const deviations = await api(
      'get',
      '/nao-conformidades?status=resolvida&produto_id=' + product.id,
    ).expect(200);
    assert.equal(deviations.body.total, 1);
  });
  await t.test('CSV neutraliza fórmulas com espaços iniciais', async () => {
    await pool.query('UPDATE usuarios SET nome=$1 WHERE id=$2', [
      ' =HYPERLINK("http://example.test")',
      inspector,
    ]);
    const csv = await api('get', '/relatorios/inspecoes?formato=csv').expect(200);
    assert.ok(csv.text.includes('"\' =HYPERLINK'));
  });
  await t.test('transação com falha faz rollback no PostgreSQL', async () => {
    await assert.rejects(
      transaction(async (db) => {
        await db.query("INSERT INTO produtos(codigo,nome) VALUES('ROLLBACK','Rollback')");
        await db.query("INSERT INTO lotes(codigo,produto_id,quantidade) VALUES('FALHA',999999,1)");
      }),
    );
    const rows = await pool.query("SELECT id FROM produtos WHERE codigo='ROLLBACK'");
    assert.equal(rows.rows.length, 0);
  });
  await t.test('gestão de usuários valida senha e revoga sessões após atualização', async () => {
    await api('post', '/usuarios')
      .send({ nome: 'X', email: 'invalido', senha, perfil: 'inspetor' })
      .expect(400);
    await api('post', '/usuarios')
      .send({ nome: 'X', email: 'x@gp4.test', senha: 'á'.repeat(40), perfil: 'inspetor' })
      .expect(400);
    const user = await create('usuarios', {
      nome: 'Novo',
      email: 'novo@gp4.test',
      senha,
      perfil: 'inspetor',
    });
    const stored = await pool.query('SELECT senha_hash FROM usuarios WHERE id=$1', [user.id]);
    assert.notEqual(stored.rows[0].senha_hash, senha);
    assert.ok(await bcrypt.compare(senha, stored.rows[0].senha_hash));
    const login = await request(app)
      .post('/api/login')
      .send({ email: 'novo@gp4.test', senha })
      .expect(200);
    await api('patch', '/usuarios/' + user.id)
      .send({ ativo: false })
      .expect(200);
    await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer ' + login.body.token)
      .expect(401);
    await api('patch', '/usuarios/' + user.id)
      .send({ ativo: true })
      .expect(200);
    await request(app)
      .get('/api/me')
      .set('Authorization', 'Bearer ' + login.body.token)
      .expect(401);
    await api('patch', '/usuarios/' + admin)
      .send({ ativo: false })
      .expect(409);
    await api('get', '/usuarios/' + user.id).expect(200);
  });
  await t.test('OpenAPI acessível e todas as rotas têm contrato', async () => {
    const spec = await request(app).get('/api/openapi.json').expect(200);
    assert.equal(spec.body.openapi, '3.0.3');
    assert.ok(Object.keys(spec.body.paths).length >= 28);
  });
  await t.test(
    'JWT expirado, adulterado, emissor ou público incorreto são rejeitados',
    async () => {
      const jwt = require('jsonwebtoken');
      const base = { sub: admin, version: 1 };
      for (const options of [
        { expiresIn: -1, issuer: 'gp4-api', audience: 'gp4-web' },
        { expiresIn: '1h', issuer: 'outro', audience: 'gp4-web' },
        { expiresIn: '1h', issuer: 'gp4-api', audience: 'outro' },
        { expiresIn: '1h', issuer: 'gp4-api', audience: 'gp4-web', algorithm: 'HS384' },
      ]) {
        const signed = jwt.sign(base, process.env.JWT_SECRET, options);
        await request(app)
          .get('/api/me')
          .set('Authorization', 'Bearer ' + signed)
          .expect(401);
      }
      await request(app)
        .get('/api/me')
        .set('Authorization', 'Bearer ' + tokens.admin.slice(0, -5) + 'abcde')
        .expect(401);
    },
  );
  await t.test('logs omitem credenciais, token, corpo e query string', async () => {
    const messages = [],
      original = console.log;
    console.log = (value) => messages.push(String(value));
    process.env.LOG_REQUESTS = 'true';
    try {
      await api('get', '/produtos?segredo=NAO_REGISTRAR').expect(200);
      await request(app)
        .post('/api/login')
        .send({ email: 'naoexiste@gp4.test', senha })
        .expect(401);
    } finally {
      console.log = original;
      process.env.LOG_REQUESTS = 'false';
    }
    assert.equal(messages.length, 2);
    const text = messages.join('\n');
    for (const secret of [senha, tokens.admin, 'NAO_REGISTRAR', 'naoexiste@gp4.test'])
      assert.ok(!text.includes(secret));
    for (const message of messages) {
      const parsed = JSON.parse(message);
      assert.deepEqual(Object.keys(parsed).sort(), ['method', 'ms', 'requestId', 'status']);
    }
  });
  await t.test('limite do corpo JSON retorna 413', async () => {
    await api('post', '/produtos')
      .send({ codigo: 'BIG', nome: 'a'.repeat(110000) })
      .expect(413);
  });
  await t.test('limite de login retorna 429 após excesso de tentativas', async () => {
    let limited = false;
    for (let attempt = 0; attempt < 31; attempt++) {
      const response = await request(app)
        .post('/api/login')
        .send({ email: 'invalido', senha: 'curta' });
      if (response.status === 429) {
        limited = true;
        break;
      }
      assert.equal(response.status, 400);
    }
    assert.ok(limited);
  });
});
