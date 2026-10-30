# GP4 — Backend do Pedro

API REST em JavaScript, Node.js, Express e PostgreSQL. O SQL é uma proposta provisória para Luiz, pois o repositório tinha somente o README quando este trabalho começou. O frontend do João ainda não está neste repositório.

## Instalar e executar

Requisitos: Node.js 22.8 ou superior e PostgreSQL 16/17. No PowerShell, use npm.cmd se npm.ps1 estiver bloqueado.

1. Abra o terminal na pasta backend e execute npm.cmd ci.
2. Copie .env.example para .env. Configure DATABASE_URL e um JWT_SECRET aleatório com pelo menos 32 bytes.
3. Gere a chave com: node -e "console.log(require('node:crypto').randomBytes(48).toString('hex'))".
4. Execute npm.cmd run db:migrate em um banco vazio de desenvolvimento.
5. Defina a senha inicial no ambiente e crie seu administrador:

```powershell
$env:GP4_INITIAL_PASSWORD = Read-Host 'Senha inicial (mínimo 8 caracteres)'
npm.cmd run user:create -- "Pedro" pedro@exemplo.com admin
Remove-Item Env:GP4_INITIAL_PASSWORD
npm.cmd start
```

O comando não inclui a senha nos argumentos do processo. Não há conta ou senha padrão. Nunca use dados reais nos testes. .env e os arquivos locais estão ignorados pelo Git.

A API abre em http://localhost:3000/api. GET /saude verifica o processo; GET /prontidao verifica o banco. GET /openapi.json entrega o contrato completo.

## Banco isolado opcional no Windows

Para quem tem PostgreSQL 17 instalado em C:\Program Files\PostgreSQL\17:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/local-db.ps1
npm.cmd run db:migrate
```

O script cria backend/.local/pgdata e um banco gp4_dev em 127.0.0.1:55432, com senha e chave aleatórias no .env. Não altera os serviços nem bancos instalados. Se o .env já aponta para outro destino, ele para sem sobrescrevê-lo. O Bypass aplica-se somente ao processo deste script.

Para parar esse banco:

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_ctl.exe" -D .local/pgdata -w stop
```

## Testar

```powershell
npm.cmd test
npm.cmd run smoke
npm.cmd run format:check
npm.cmd audit
```

Os testes HTTP usam Supertest e PostgreSQL real. Criam um schema gp4_test_aleatorio, aplicam as migrações e removem somente esse schema ao terminar. Precisam da permissão CREATE SCHEMA. Use TEST_DATABASE_URL para escolher outro banco de testes; na ausência, utilizam DATABASE_URL. Não apontar para produção. A aplicação permanece usando o banco real configurado, sem autenticação ou persistência simuladas.

Cobertura funcional: perfis, login, revogação de sessão, cadastros, vínculos, inspeções concorrentes, finalização, desvios, fotos, rollback, indicadores e CSV. Os testes não substituem a homologação de Felipe e a integração com os módulos dos colegas.

## Organização

- src/app.js: middlewares, login, montagem de rotas e erros.
- src/auth.js: JWT, consulta do usuário e autorização.
- src/catalog.js: cadastros e gestão de usuários.
- src/inspections.js: inspeções e não conformidades.
- src/evidence.js: validação, gravação e download autorizado.
- src/reports.js: indicadores e relatórios.
- src/db.js: pool e transações; src/migrate.js: migrações versionadas.
- sql/: contrato provisório, não aplicar sobre o banco da equipe sem revisão.
- docs/openapi.json: referência de todos os endpoints.
- docs/INTEGRACAO.md: exemplos para João.
- docs/CONTRATO_DADOS.md: entidades, relações e alinhamento com Luiz.
- docs/REGRAS_E_ENTREGA.md: regras, decisões e dependências.
- GUIA_PEDRO.md: guia de estudo e demonstração.

## Operação

Configure CORS_ORIGIN com as origens exatas do frontend, separadas por vírgula. Use HTTPS na hospedagem, armazenamento persistente privado para UPLOAD_DIR e backups conjuntos do PostgreSQL e das fotos. As fotos não são servidas por uma pasta pública. Não configure trust proxy sem conhecer a topologia da hospedagem; o limitador de login usa o IP da conexão.

Logs registram apenas ID da requisição, método, status e duração; não incluem URL, corpo, senha, token ou erros SQL. LOG_REQUESTS=false desliga o log de acesso.

O upload checa MIME, assinatura e marcadores básicos do formato; não faz análise antivírus nem decodificação completa. Limite de 5 MiB, uma imagem por requisição. Uma falha de SQL remove o arquivo recém-gravado; uma queda do processo entre disco e commit pode deixar órfão, que deve ser identificado por conciliação administrativa.

Migrations são atômicas e registradas em gp4_migrations. Esta proposta parte de banco vazio: o ZIP não era um banco implantado. A migração 002 não converte dados legados. Luiz deve preparar uma migração específica se houver outro esquema com dados.
