// Fixture local/demonstracao. Requer GP4_LOAD_DEMO_DATA=true e senhas descartaveis.
require('dotenv').config({ quiet: true });
const bcrypt = require('bcryptjs');
const { pool, transaction } = require('../src/db');

async function main() {
  if (process.env.GP4_LOAD_DEMO_DATA !== 'true') {
    throw new Error('Defina GP4_LOAD_DEMO_DATA=true para autorizar a carga ficticia.');
  }
  const demoPassword = process.env.GP4_DEMO_PASSWORD;
  if (!demoPassword || Buffer.byteLength(demoPassword) < 12 || Buffer.byteLength(demoPassword) > 72) {
    throw new Error('Defina GP4_DEMO_PASSWORD entre 12 e 72 bytes (senha descartavel).');
  }
  const passwordHash = await bcrypt.hash(demoPassword, 12);
  await transaction(async (db) => {
    const people = {};
    for (const [key, name, email, role] of [
      ['admin', 'Admin Demonstracao', 'demo.admin@gp4.invalid', 'admin'],
      ['manager', 'Gestor Demonstracao', 'demo.gestor@gp4.invalid', 'supervisor'],
      ['inspector', 'Inspetor Demonstracao', 'demo.inspetor@gp4.invalid', 'inspetor'],
    ]) {
      const { rows } = await db.query(
        `INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES($1,$2,$3,$4)
         ON CONFLICT (email) DO UPDATE SET nome=EXCLUDED.nome,senha_hash=EXCLUDED.senha_hash,
           perfil=EXCLUDED.perfil,ativo=true RETURNING id`,
        [name, email, passwordHash, role],
      );
      people[key] = rows[0].id;
    }
    await db.query("SELECT set_config('gp4.usuario_id',$1,true)", [people.admin]);

    const { rows: products } = await db.query(
      `INSERT INTO produtos(codigo,nome,descricao) VALUES
       ('DEMO-PAINEL','Painel de demonstracao','Produto ficticio para validacao funcional')
       ON CONFLICT(codigo) DO UPDATE SET nome=EXCLUDED.nome RETURNING id`,
    );
    const productId = products[0].id;
    const criteria = [];
    for (const [name, description] of [
      ['Acabamento superficial','Sem riscos ou rebarbas visiveis'],
      ['Dimensoes','Dentro das tolerancias do desenho'],
      ['Identificacao','Etiqueta legivel e correspondente ao lote'],
    ]) {
      const { rows } = await db.query(
        `INSERT INTO criterios(nome,descricao) VALUES($1,$2)
         ON CONFLICT(nome) DO UPDATE SET descricao=EXCLUDED.descricao RETURNING id`,
        [name, description],
      );
      criteria.push(rows[0].id);
    }
    const existingChecklist = await db.query("SELECT id FROM checklists WHERE nome='Checklist demonstracao' ORDER BY id LIMIT 1");
    let checklistId = existingChecklist.rows[0]?.id;
    if (!checklistId) {
      const { rows } = await db.query(
        `INSERT INTO checklists(nome,descricao) VALUES('Checklist demonstracao','Lista ficticia para demonstracao') RETURNING id`,
      );
      checklistId = rows[0].id;
    }
    for (const criterionId of criteria) {
      await db.query(
        `INSERT INTO checklist_itens(checklist_id,criterio_id,obrigatorio) VALUES($1,$2,true)
         ON CONFLICT(checklist_id,criterio_id) DO NOTHING`,
        [checklistId, criterionId],
      );
    }
    const itemRows = await db.query(
      'SELECT ci.id,c.nome,c.descricao,ci.obrigatorio FROM checklist_itens ci JOIN criterios c ON c.id=ci.criterio_id WHERE ci.checklist_id=$1 ORDER BY ci.id',
      [checklistId],
    );

    for (const [code, quantity] of [['DEMO-LOTE-OK', 20], ['DEMO-LOTE-NC', 15], ['DEMO-LOTE-ABERTO', 10]]) {
      await db.query(
        `INSERT INTO lotes(codigo,produto_id,quantidade) VALUES($1,$2,$3)
         ON CONFLICT(codigo) DO NOTHING`,
        [code, productId, quantity],
      );
    }
    const demoCodes = ['DEMO-LOTE-OK','DEMO-LOTE-NC','DEMO-LOTE-ABERTO'];
    const existingScenarios = await db.query(
      "SELECT count(*)::int AS total FROM inspecoes i JOIN lotes l ON l.id=i.lote_id WHERE l.codigo=ANY($1)",
      [demoCodes],
    );
    if (existingScenarios.rows[0].total !== 0 && existingScenarios.rows[0].total !== demoCodes.length) {
      throw new Error('Foram encontradas fixtures parciais; revise os lotes DEMO-LOTE-* antes de continuar.');
    }
    if (existingScenarios.rows[0].total === 0) for (const [code, state] of [['DEMO-LOTE-OK','aprovada'],['DEMO-LOTE-NC','reprovada'],['DEMO-LOTE-ABERTO','em_andamento']]) {
      const lot = await db.query('SELECT id FROM lotes WHERE codigo=$1', [code]);
      await db.query('UPDATE lotes SET status=$1 WHERE id=$2', [state === 'aprovada' ? 'aprovado' : state === 'reprovada' ? 'reprovado' : 'pendente', lot.rows[0].id]);
      const inspection = await db.query(
        `INSERT INTO inspecoes(lote_id,checklist_id,inspetor_id,status,finalizada_em)
         VALUES($1,$2,$3,$4,CASE WHEN $4='em_andamento' THEN NULL ELSE now() END) RETURNING id`,
        [lot.rows[0].id, checklistId, people.inspector, state],
      );
      const inspectionId = inspection.rows[0].id;
      for (let i = 0; i < itemRows.rows.length; i++) {
        const item = itemRows.rows[i];
        await db.query(
          'INSERT INTO inspecao_itens(inspecao_id,item_id,criterio_nome,criterio_descricao,obrigatorio) VALUES($1,$2,$3,$4,$5)',
          [inspectionId,item.id,item.nome,item.descricao,item.obrigatorio],
        );
        if (state === 'em_andamento' && i > 0) continue;
        const result = state === 'reprovada' && i === 0 ? 'nao_conforme' : 'conforme';
        const answer = await db.query(
          'INSERT INTO respostas(inspecao_id,item_id,checklist_id,resultado,observacao) VALUES($1,$2,$3,$4,$5) RETURNING id',
          [inspectionId,item.id,checklistId,result,result === 'nao_conforme' ? 'Falha ficticia registrada para demonstracao.' : null],
        );
        if (result === 'nao_conforme') {
          const nc = await db.query(
            `INSERT INTO nao_conformidades(resposta_id,descricao,classificacao)
             VALUES($1,'Acabamento fora do padrao (dado ficticio)','maior') RETURNING id`,
            [answer.rows[0].id],
          );
          await db.query(
            'INSERT INTO nao_conformidade_historico(nao_conformidade_id,usuario_id,status) VALUES($1,$2,$3)',
            [nc.rows[0].id,people.inspector,'aberta'],
          );
        }
      }
    }
  });
  console.log('Carga ficticia concluida. Contas: demo.admin@gp4.invalid, demo.gestor@gp4.invalid, demo.inspetor@gp4.invalid');
}

main().catch((err) => {
  console.error('Carga demonstrativa nao executada: ' + err.message);
  process.exitCode = 1;
}).finally(() => pool.end());
