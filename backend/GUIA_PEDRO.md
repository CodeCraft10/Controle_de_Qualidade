# Guia do Pedro

## Como o backend funciona

O navegador manda uma requisição HTTP. Express encontra a rota, os middlewares verificam autenticação/perfil, o módulo valida os dados e executa SQL parametrizado. A resposta volta como JSON. Erros seguem um formato comum para João mostrar mensagens nas telas.

server.js verifica a configuração e o banco antes de abrir a porta. app.js monta a aplicação separadamente para os testes conseguirem fazer requisições sem iniciar outro processo permanente.

## Banco e transações

db.js mantém um pool de conexões com PostgreSQL. Valores recebidos são passados como parâmetros $1, $2 etc., separados do texto SQL; assim não viram comandos SQL.

transaction(fn) reserva uma conexão, executa BEGIN, chama a função e confirma com COMMIT. Se ocorrer erro, executa ROLLBACK e devolve a conexão ao pool. Abrir inspeção cria vários registros; finalizar muda inspeção e lote. Essas operações precisam acontecer por inteiro.

FOR UPDATE bloqueia a linha durante a transação. Quando duas requisições tentam finalizar juntas, uma espera; ao continuar, encontra a inspeção já finalizada e recebe 409. A restrição única por lote oferece uma proteção adicional no banco.

O SQL em sql/ é provisório. Luiz continua responsável pela modelagem definitiva.

## Autenticação e perfis

A senha não é armazenada diretamente: bcrypt produz um hash com sal e custo 12. No login, bcrypt.compare verifica a senha. A API emite um JWT assinado com chave do .env, válido por oito horas.

O frontend envia Authorization: Bearer TOKEN. auth.js valida assinatura, algoritmo, emissor, público e prazo. Depois consulta a conta ativa e sua versão de sessão no banco. Alterar a conta incrementa essa versão e invalida tokens antigos.

Autenticar identifica a pessoa. Autorizar decide o que ela pode fazer: admin gerencia contas; gestores mantêm cadastros; inspetores respondem suas próprias inspeções. Saber a URL ou o ID de uma foto não dá permissão para baixá-la.

## Inspeção

1. Um gestor cadastra produto, lote, critérios e checklist.
2. O usuário abre inspeção do lote; a API registra seu ID como responsável.
3. A API copia os critérios e a obrigatoriedade para preservar o que foi inspecionado.
4. GET do detalhe mostra itens, respostas e progresso.
5. Respostas podem ser conforme, nao_conforme ou nao_aplicavel, este último com justificativa.
6. Cada resposta não conforme precisa de um desvio.
7. A finalização verifica preenchimento e decide aprovada/reprovada; atualiza o lote na mesma transação.
8. Inspeção finalizada não pode ser respondida nem receber novos anexos.

Foi adotada uma inspeção por lote para esta versão. Reinspeção exige um novo fluxo a ser discutido com a equipe.

## Desvios e fotos

A não conformidade aponta para uma resposta, que aponta para a inspeção. Ela guarda descrição, classificação e situação. Gestores avançam aberta → em_tratamento → resolvida; cada mudança gera histórico com usuário e horário.

Multer recebe uma foto em memória com limite de 5 MiB. A API verifica o tipo e marcadores do arquivo, gera nome aleatório, grava em diretório privado e salva os metadados no banco. Se o SQL falhar, apaga o arquivo recém-criado. Não há acesso público à pasta.

## Relatórios

Filtros selecionam produto, lote, inspetor, período, status ou busca. Valores usam parâmetros SQL; nomes de campos de ordenação são escolhidos de uma lista permitida.

A taxa de aprovação usa apenas inspeções finalizadas: aprovadas / (aprovadas + reprovadas) × 100. Inspeções em andamento não entram no denominador. Sem finalizadas, a taxa é zero. O CSV exporta a página selecionada e neutraliza fórmulas de planilha.

## Executar e testar

Siga README.md para instalar, configurar .env, migrar e criar o primeiro usuário. Use npm.cmd start para executar e npm.cmd test para testar. GET http://localhost:3000/api/saude deve retornar {"status":"ok"}.

Os testes não inventam respostas do banco: fazem HTTP por Supertest e usam PostgreSQL real em schema isolado. Cenários incluem erros, perfis, concorrência e rollback. docs/VALIDACAO.md registra os resultados executados.

Para demonstrar: faça login, crie cadastros, abra inspeção, mostre finalização incompleta bloqueada, responda com defeito, registre desvio/foto, finalize, consulte indicadores e tente acessar a foto com outro inspetor.

## Arquivos e conceitos para apresentar

| Arquivo            | O que explicar                                                |
| ------------------ | ------------------------------------------------------------- |
| app.js / server.js | Rotas, middlewares, inicialização e tratamento de erros       |
| auth.js            | Hash, assinatura JWT, autenticação, autorização e revogação   |
| catalog.js         | CRUD, validação, chave única, chave estrangeira e desativação |
| inspections.js     | Estados, cópia histórica, transações e bloqueio concorrente   |
| evidence.js        | Multipart, limite, metadados e autorização por recurso        |
| reports.js         | SQL agregado, filtros, paginação e percentuais                |
| db.js              | Pool, parâmetros SQL, BEGIN/COMMIT/ROLLBACK                   |
| tests/api.test.js  | Preparação, requisição, verificação e limpeza de testes       |
| docs/openapi.json  | Contrato que permite integrar o frontend                      |

Pedro deve conseguir explicar HTTP e seus códigos, JSON, REST, variáveis de ambiente, async/await, Promise, middleware, bcrypt, JWT, SQL parametrizado, integridade referencial e transações. Não precisa decorar cada linha: precisa relacionar cada conceito a uma regra concreta do projeto.
