# GP4 — Frontend do João

Interface do Sistema Inteligente de Controle de Qualidade em HTML, CSS e JavaScript, com Vite. Os cadastros, inspeções, evidências, indicadores e relatórios usam a API existente em `backend/`; não há modo de demonstração com dados simulados na aplicação.

## Executar

Requisitos: Node.js 22.12 ou superior, npm e a API com PostgreSQL configurada conforme o [guia do backend](../backend/README.md).

```sh
cd frontend
npm ci
cp .env.example .env
npm run dev
```

Abra `http://localhost:5173`. No Windows PowerShell, use `Copy-Item .env.example .env` e, caso necessário, `npm.cmd`.

Inicie o backend em outro terminal. Crie a primeira conta com o comando `user:create` documentado pelo backend; não há credenciais padrão nem senha embutida na interface. Não versione `.env`, tokens, senhas ou fotos reais de inspeção.

## Configuração

| Variável            | Padrão                  | Uso                                                                   |
| ------------------- | ----------------------- | --------------------------------------------------------------------- |
| `VITE_API_BASE_URL` | `/api`                  | Endereço público da API usado pelo navegador; inclua o sufixo `/api`. |
| `API_PROXY_TARGET`  | `http://localhost:3000` | Destino do proxy local do Vite; não inclua `/api`.                    |

No desenvolvimento, o navegador chama `/api` na mesma origem do frontend e o Vite encaminha à API. Para uma API em outra origem, configure `VITE_API_BASE_URL` com a URL completa e permita a origem exata do frontend em `CORS_ORIGIN` do backend. Variáveis prefixadas com `VITE_` ficam visíveis no navegador: nunca coloque segredos nelas.

```sh
npm run build
npm run preview
```

O build gera `dist/`. Na hospedagem, sirva essa pasta por HTTPS e encaminhe `/api` ao backend, ou configure a URL pública da API antes do build. O proxy de desenvolvimento não substitui a configuração do servidor de produção. As rotas usam fragmentos (`#/dashboard`), portanto a navegação não exige regras especiais para caminhos internos. A fonte Inter é instalada pelo pacote `@fontsource/inter` e servida junto com a aplicação.

## Entrar e permissões

A sessão segue o contrato JWT do backend. O token permanece somente na memória da aba, sem `localStorage` ou `sessionStorage`. Recarregar ou fechar a página exige novo login. O botão de saída limpa a sessão local; a API atual não oferece revogação individual no logout. O backend expira tokens após oito horas e pode invalidá-los quando a conta muda. Respostas `401` encerram a sessão no frontend.

| Ação                                                           | Administrador     | Supervisor        | Inspetor           |
| -------------------------------------------------------------- | ----------------- | ----------------- | ------------------ |
| Consultar cadastros, inspeções, histórico e indicadores        | Sim               | Sim               | Sim                |
| Criar/editar/desativar produtos, lotes, critérios e checklists | Sim               | Sim               | Não                |
| Consultar contas de inspetores                                 | Sim               | Sim               | Não                |
| Criar/editar contas de inspetor                                | Sim               | Não               | Não                |
| Abrir uma inspeção em seu próprio nome                         | Sim               | Sim               | Sim                |
| Responder, finalizar, registrar desvios e acessar fotos        | Qualquer inspeção | Qualquer inspeção | Próprias inspeções |
| Avançar tratamento de não conformidade                         | Sim               | Sim               | Não                |

A interface oculta ações sem permissão e protege a navegação. A autorização definitiva continua na API, inclusive para requisições feitas fora da interface.

## Guia de uso

1. Entre com uma conta cadastrada no backend.
2. Como administrador ou supervisor, cadastre um produto, um lote com quantidade positiva e critérios de inspeção. Crie um checklist e adicione os critérios, indicando quais são obrigatórios.
3. Em **Inspeções**, selecione um lote e um checklist ativos e abra a inspeção. O responsável será o usuário conectado. A API permite uma inspeção por lote nesta versão.
4. Responda cada item e salve. Use **Não aplicável** somente com uma justificativa. O progresso salvo fica no banco e pode ser retomado.
5. Para cada resposta **Não conforme**, registre a descrição e a classificação do desvio. Adicione as evidências antes de finalizar a inspeção.
6. Revise os resultados e conclua. Todos os itens obrigatórios devem estar respondidos e cada resposta não conforme precisa ter seu desvio registrado. A decisão de aprovação/reprovação vem do backend.
7. Consulte o resultado em **Histórico**, acompanhe os indicadores em **Dashboard** e exporte a página desejada em **Relatórios**.

As fotos aceitam JPEG, PNG ou WebP, uma por envio, com até 5 MiB. O acesso exige autenticação. Se o envio falhar, confira a mensagem, o formato e o tamanho e tente novamente. Depois de finalizar, a API bloqueia novos anexos e alterações nas respostas.

Cadastros já usados em inspeções preservam o histórico: o backend pode recusar sua edição com `409`. Nesse caso, crie uma nova versão do cadastro. A desativação impede novos usos sem apagar o histórico.

Administradores e supervisores avançam o tratamento de um desvio de **Aberta** para **Em tratamento** e então **Resolvida**. Resolver o desvio não muda a decisão histórica da inspeção ou do lote.

## Consultas e relatórios

Dashboard e histórico consultam a API com os filtros escolhidos. Datas de início/fim são interpretadas pelo backend no fuso `America/Sao_Paulo`, incluindo o dia final. As taxas de aprovação e reprovação usam apenas inspeções finalizadas no denominador; sem finalizações, a API retorna zero. Esses valores não são previsões de IA.

A exportação CSV corresponde somente à página indicada na interface e respeita seus filtros; navegue pelas demais páginas para exportá-las. O arquivo usa UTF-8 com BOM e separador `;`. A API neutraliza fórmulas de planilha nos valores exportados.

A busca dos cadastros é local sobre as páginas carregadas da API, pois os endpoints de catálogo não têm pesquisa textual. Para grandes volumes, uma evolução recomendada é implementar busca e paginação remotas também nesses cadastros.

## Testes e documentação

Os testes de navegador usam Playwright, API real e um schema isolado no PostgreSQL. Instale também as dependências do backend. Configure `TEST_DATABASE_URL` para um banco de desenvolvimento/testes com permissão de criar schemas e execute `npm test`. A suíte inicia seus próprios servidores nas portas 3001 e 5173; deixe essas portas livres. Não use um banco de produção. Veja a [matriz de validação](docs/VALIDACAO.md) para o roteiro, resultados e limitações.

- [Rotas, esboços e sequência de demonstração](docs/ROTAS_E_TELAS.md)
- [Design system e acessibilidade](docs/DESIGN_SYSTEM.md)
- [Rastreabilidade F01–F07 e checklist de validação](docs/VALIDACAO.md)
- [Contrato da API](../backend/docs/INTEGRACAO.md)
- [OpenAPI](../backend/docs/openapi.json)
