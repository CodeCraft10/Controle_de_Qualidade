const fs = require('node:fs');
const path = require('node:path');
const { pool, transaction } = require('./db');
(async () => {
  try {
    await transaction(async (db) => {
      await db.query('SELECT pg_advisory_xact_lock(470001)');
      await db.query(
        'CREATE TABLE IF NOT EXISTS gp4_migrations (nome text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now())',
      );
      for (const name of fs
        .readdirSync(path.join(__dirname, '../sql'))
        .filter((n) => n.endsWith('.sql'))
        .sort()) {
        const done = await db.query('SELECT 1 FROM gp4_migrations WHERE nome=$1', [name]);
        if (done.rows.length) continue;
        await db.query(fs.readFileSync(path.join(__dirname, '../sql', name), 'utf8'));
        await db.query('INSERT INTO gp4_migrations(nome) VALUES($1)', [name]);
        console.log('Migração aplicada: ' + name);
      }
    });
  } catch {
    console.error(
      'Falha nas migrações; nenhuma alteração desta execução foi aplicada. Verifique conexão e contrato SQL.',
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
