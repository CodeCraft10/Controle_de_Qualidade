const bcrypt = require('bcryptjs');
const { pool } = require('./db');
const { requiredString, email, password } = require('./utils');
(async () => {
  try {
    const [name, address, role = 'admin'] = process.argv.slice(2);
    if (!['admin', 'supervisor', 'inspetor'].includes(role)) throw new Error('Perfil inválido');
    const hash = await bcrypt.hash(password(process.env.GP4_INITIAL_PASSWORD), 12);
    await pool.query('INSERT INTO usuarios(nome,email,senha_hash,perfil) VALUES($1,$2,$3,$4)', [
      requiredString(name, 'nome'),
      email(address),
      hash,
      role,
    ]);
    console.log('Usuário criado.');
  } catch {
    console.error(
      'Não foi possível criar usuário. Use GP4_INITIAL_PASSWORD e: npm run user:create -- "Nome" email@dominio.com admin',
    );
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
