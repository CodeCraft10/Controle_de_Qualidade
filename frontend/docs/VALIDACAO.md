> Este documento registra a validação anterior do frontend. Para a integração
> atual com PHP, consulte [validação integrada](../../backend/docs/VALIDACAO.md)
> e [instalação na VPS](../../docs/implantacao/VPS.md). Os testes atuais não dependem
> de PostgreSQL nem de Node.js no backend.

# Validação do frontend

Esta matriz relaciona o plano individual do João com os fluxos implementados. Resultados automatizados, capturas e observações de homologação devem ser registrados separadamente: a existência de uma tela não comprova a conclusão de um cenário.

## Rastreabilidade

| Tarefa                                  | Entrega                                                               | Evidência a conferir                                                                              |
| --------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| F01 — Estrutura e navegação             | Aplicação em `/frontend`, rotas, layout e componentes compartilhados. | Navegação desktop/celular, rota desconhecida, acesso negado, [rotas e esboços](ROTAS_E_TELAS.md). |
| F02 — Autenticação e permissões         | Login, saída, sessão em memória e ações por perfil.                   | Login válido/inválido, logout, resposta 401, restrições de administrador/supervisor/inspetor.     |
| F03 — Cadastros                         | Produtos, lotes, inspetores, critérios e checklists.                  | Listar, buscar, criar, editar, consultar detalhes, desativar e validar vínculos.                  |
| F04 — Processo de inspeção              | Abertura, respostas persistidas, revisão e conclusão.                 | Uma inspeção completa com consulta posterior e confirmação do resultado no backend.               |
| F05 — Não conformidades e anexos        | Desvio vinculado à resposta, classificação, imagens e tratamento.     | Foto recuperável com autenticação, erro de upload e histórico de transições.                      |
| F06 — Histórico, dashboard e relatórios | Filtros, indicadores reais, paginação e CSV.                          | Totais compatíveis com a API, filtros preservados, CSV limitado à página indicada.                |
| F07 — Integração e qualidade            | Testes de navegador com API/PostgreSQL reais e estados de feedback.   | Resultado automatizado, capturas desktop/celular e revisão humana de usabilidade.                 |

## Como executar os testes

Instale as dependências de `backend/` e `frontend/`. Os testes de navegador utilizam Playwright e exigem um banco de desenvolvimento/testes acessível por `TEST_DATABASE_URL`, com permissão para criar um schema isolado. A suíte não deve usar produção. O servidor de teste aplica as migrações nesse schema e usa dados e credenciais aleatórias criados para a execução.

```sh
cd frontend
npx playwright install chromium
npm test
```

Defina `TEST_DATABASE_URL` no ambiente antes do teste, seguindo a forma apropriada ao seu terminal. Não inclua uma senha real em exemplos versionados, capturas ou logs. As contas de teste não são contas da aplicação em produção.

O Playwright inicia a API em `127.0.0.1:3001` e o Vite em `127.0.0.1:5173`; deixe ambas as portas livres. O script `scripts/e2e-server.mjs` cria um schema `gp4_e2e_*`, usa uma pasta temporária para fotos e remove esses recursos ao encerrar. As credenciais transitórias ficam em `.e2e/session.json`, com acesso restrito e fora do versionamento. Para utilizar um Chromium já instalado, configure `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` com seu caminho; caso contrário, instale o navegador pelo comando acima.

## Resultado registrado — 10/11/2026

Ambiente: Node.js 24.22.1, PostgreSQL 17.11 e Chromium, com API real, migrações existentes, schema e fotos temporários. Nenhuma resposta da API de negócio foi simulada nos fluxos funcionais. O cenário de indisponibilidade interrompe deliberadamente uma requisição do navegador para verificar a recuperação.

- `backend: npm test`: **37 testes aprovados, zero falhas**.
- `frontend: npm test`: **5 cenários aprovados, zero falhas**, em 36,8 segundos com capturas habilitadas.
- `frontend: npm run build`: build de produção aprovado.
- `frontend: npm run format:check`: formatação verificada.
- GitHub Actions: workflow incluído para repetir backend, build, formatação e testes de navegador em pull requests e alterações na `main`.

## Checklist funcional e de usabilidade

| Cenário                                                          | Resultado registrado                                                                                                                                                      |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login válido/incorreto, saída e proteção de rota                 | Aprovado no navegador.                                                                                                                                                    |
| Sessão em memória, recarregamento e revogação real da conta      | Aprovado; armazenamento persistente vazio e retorno ao login após 401.                                                                                                    |
| Administrador, supervisor e inspetor                             | Aprovado; menus, ações, acesso negado e bloqueios reais da API.                                                                                                           |
| Cadastros de produtos, lotes, inspetores, critérios e checklists | Criação e consulta aprovadas; busca e edição de produto aprovadas; vínculo de item ao checklist aprovado.                                                                 |
| Validação de campos e conflitos de vínculos                      | Validações dos fluxos executados aprovadas; conflitos também cobertos pela suíte do backend.                                                                              |
| Inspeção salva, consultada novamente, revisada e finalizada      | Aprovado; estado da inspeção e do lote conferidos diretamente na API.                                                                                                     |
| Proteção de respostas não salvas                                 | Aprovado; cancelar saída mantém a resposta, confirmar saída descarta somente o rascunho local.                                                                            |
| Não aplicável exige observação e não conforme exige desvio       | Aprovado no navegador.                                                                                                                                                    |
| Foto enviada, visualizada e baixada com autenticação             | Aprovado; anexos bloqueados após finalização.                                                                                                                             |
| Formato de foto inválido                                         | Aprovado com arquivo de texto rejeitado na interface. Limite de tamanho e falhas de envio têm tratamento implementado; não foram exercitados no navegador nesta execução. |
| Inspetor não altera inspeção alheia                              | Aprovado no navegador; restrição de leitura de fotos alheias também coberta pelo backend.                                                                                 |
| Tratamento de não conformidade                                   | Aprovado: aberta → em tratamento → resolvida, com três eventos históricos.                                                                                                |
| Dashboard e filtros                                              | Aprovado; filtro de lote, totais e reprovação conferidos contra a API.                                                                                                    |
| Histórico/relatórios e CSV                                       | Consulta e exportação da página aprovadas. Paginação implementada; navegação entre múltiplas páginas permanece no roteiro de homologação.                                 |
| Layout de celular e navegação pelo menu                          | Aprovado em 390 × 844, inclusive com tabelas preenchidas, sem transbordamento da página.                                                                                  |
| Layout de desktop                                                | Capturas revisadas em viewport 1440 × 1000.                                                                                                                               |
| Formulários, foco, teclado e leitor de tela                      | Rótulos utilizados pelos testes; foco e semântica implementados. Revisão completa por teclado/leitor de tela permanece para homologação humana.                           |
| Indisponibilidade e nova tentativa                               | Aprovado: falha de conexão mostra erro e permite recuperar a listagem.                                                                                                    |

## Capturas

Após incorporar a atualização `531f32d` da `main`, os cinco cenários foram executados novamente com todas as migrações SQL, incluindo `003_auditoria_acoes.sql`: **5 aprovados em 19,6 segundos**, sem novas capturas. Build e formatação também aprovados. O servidor de testes descobre as migrações na pasta `backend/sql`, em ordem, para acompanhar a evolução do banco.

Geradas pelo navegador a partir dos registros persistidos no banco de teste:

- [Login — desktop](screenshots/login-desktop.png)
- [Dashboard e filtros — desktop](screenshots/dashboard-desktop.png)
- [Inspeção concluída — desktop](screenshots/inspecao-desktop.png)
- [Não conformidade e evidência — desktop](screenshots/nao-conformidade-desktop.png)
- [Dashboard — celular](screenshots/dashboard-mobile.png)
- [Produtos — celular](screenshots/produtos-mobile.png)

Use `E2E_SCREENSHOTS=1` ao executar a suíte para atualizar essas capturas. A foto mínima usada pelo teste valida envio e recuperação do arquivo; não representa uma evidência industrial real.

## Evidências e limites

As capturas de testes devem usar somente dados sintéticos persistidos na API de teste; isso não altera o requisito de a aplicação final consultar dados reais do backend. Imagens não devem mostrar senhas, tokens, dados pessoais reais ou conteúdo de produção.

O teste automatizado verifica os cenários efetivamente executados. A homologação conjunta com Pedro, Luiz e Felipe, a aprovação da modelagem do banco e a revisão de usabilidade com pessoas continuam sendo atividades da equipe; não são presumidas pela aprovação da suíte.
