# Validação da aplicação integrada

Data: 10/11/2026. Frontend existente conectado ao PHP real, sem banco relacional.
A entrada usada pelos testes de navegador é `public/index.php` na raiz pública do
projeto, servindo o build do Vite e `/api` na mesma origem.

## Execução local

PHP CLI 8.4.23 com Fileinfo, Chromium, Node e Playwright. Armazenamento temporário,
contas sintéticas e fotos de teste; sem credenciais ou dados da VPS.

| Comando | Resultado |
|---|---|
| `php backend/tests/run.php` | 75 verificações de regras e permissões passaram |
| `php backend/tests/http.php` | 44 verificações HTTP passaram |
| `php backend/tests/concurrency.php` | 3 verificações concorrentes passaram |
| `python3 tests/entrypoint.py` | 18 verificações da entrada pública passaram |
| `npm test` em frontend | 5 cenários integrados passaram |
| `npm run format:check` | Aprovado |
| `docker compose config --quiet` | Aprovado |
| `git diff --check` | Aprovado |

Os cinco cenários no Chromium cobrem login inválido/válido, sessão em memória,
logout, proteção de rotas, criação/edição de produto, critério, checklist e itens,
lote com data de fabricação, inspetor, abertura e respostas de inspeção, desvio,
upload e recuperação de foto real, conclusão e atualização do lote, transições de
tratamento, dashboard filtrado, download CSV, perfis, tentativa de acesso alheio,
layout de celular, falha de rede com recuperação e sessão revogada. A execução com
capturas confirmou visualmente as páginas desktop/mobile usando dados da API real.

As verificações do index incluem HTML, CSS/JS compilados, CSP, HEAD, login, gravação,
logout e recusa de acesso a `.env`, fontes, estado privado e `.git`.

## GitHub Actions e pacote VPS

Workflow `.github/workflows/frontend.yml`:

- Suítes PHP e sintaxe em PHP 8.2 e 8.4.
- Build, formatação e cinco testes Playwright no Chromium, usando PHP real.
- Smoke da entrada pública.
- Construção do Dockerfile multi-stage e smoke com Apache, incluindo volume
  persistente, bootstrap de administrador e recriação do contêiner.

A [execução de integração](https://github.com/CodeCraft10/Controle_de_Qualidade/actions/runs/42883311393)
aprovou os quatro jobs, incluindo imagem Apache e frontend no navegador. A versão
atual do smoke também testa a preservação de dados após recriar o contêiner. As
[execuções da integração](https://github.com/CodeCraft10/Controle_de_Qualidade/actions?query=branch%3Afeat%2Fintegracao-php-frontend)
registram os resultados atualizados.

A imagem Apache é validada no runner do GitHub porque este ambiente local tem
pouco espaço de disco. Os testes de navegador e API foram executados localmente
com PHP nativo, sem depender de Docker.

## Regras revisadas para a interface

Checklists podem existir vazios durante a montagem, mas uma inspeção não pode
iniciar sem itens. Adição/remoção usa as mesmas validações de perfil, unicidade e
histórico. Checklists usados em inspeção não podem ter itens alterados. As
restrições de finalização, snapshots, fotos privadas e transações locais foram
preservadas e testadas.

## Limites

O guia de instalação está em [VPS](../../docs/implantacao/VPS.md). Nenhum acesso à
VPS particular foi fornecido ou utilizado: a entrega prepara e testa o pacote,
sem afirmar que ele já foi publicado nesse servidor. Domínio, HTTPS e firewall
são configurados no servidor. PostgreSQL e homologação independente da equipe
permanecem pendentes; a persistência atual é JSON em uma instância.

## Demonstração sem login manual

`php backend/tests/demo.php` verifica ativação explícita, endpoint indisponível
quando desligado, sessão automática, separação de contas/dados, preservação dos
registros normais, recusa do token ao desligar, retorno ao login normal e comando
CLI on/off sem alterar outras configurações.

`E2E_DEMO=1 npm test` em frontend verifica entrada direta no dashboard sem email
ou senha, aviso visível, criação de produto, recarga sem login e validação/revogação
do token. A execução normal de `npm test` continua cobrindo as telas com login.
Ambos os modos são executados na CI.
