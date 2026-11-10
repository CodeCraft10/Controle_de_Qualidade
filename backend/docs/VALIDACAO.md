# Validação do backend PHP

Data: 10/11/2026. Ambiente de testes: PHP CLI 8.4 em contêiner Linux;
sem banco, frontend ou credenciais reais. Testes automatizados criam dados fictícios
em diretórios temporários. PHP 8.2 é o mínimo declarado; esta execução usou 8.4.

## Resultados executados

| Verificação | Resultado |
|---|---|
| `php -l` em todos os fontes PHP da implementação inicial | Sem erros de sintaxe |
| `php tests/run.php` | 69 verificações passaram |
| `php tests/http.php` | 44 verificações HTTP passaram |
| `php tests/concurrency.php` | 3 verificações de concorrência passaram |
| Total das três suítes | 116 verificações passaram |
| `git diff --check main...HEAD` | Sem erros |
| Alterações em `frontend/` e `docs/qualidade/` | Nenhuma |

As três suítes completas foram executadas com o código montado em `/app` na
imagem oficial `php:8.4-cli`. Não houve alterações no código PHP após essas
execuções; os ajustes seguintes foram de empacotamento Docker e documentação.

## Cobertura observada

- Login, hash, token armazenado como digest, expiração, logout, troca de senha,
  conta inativa, limitação de tentativas e proteção do último administrador.
- Separação de perfis e escopo por responsável, inclusive para listas e indicadores.
- Cadastros, duplicidades, vínculos inválidos, datas impossíveis, checklist vazio,
  critérios duplicados, preservação de histórico e desativação referencial.
- Abertura de inspeção, snapshots, progresso, respostas, justificativa de não
  aplicável, incompletude, exigência de desvio, aprovação, reprovação e finalização única.
- Reversão de alterações após exceção e recusa de sobrescrever arquivo corrompido.
- Transições de desvios e histórico; resolução não altera inspeção passada.
- Servidor HTTP real, JSON inválido, Content-Type, limite de corpo e erros padronizados.
- Foto PNG real enviada por multipart e recuperada byte a byte, metadados SHA-256,
  arquivo com falso MIME, excesso de tamanho, tentativa anônima, outro responsável
  e bloqueio de novo upload após finalização.
- Filtros, paginação, ordenação permitida, métricas em 0%, 50% e 100%, CSV e
  neutralização de fórmulas em campos textuais exportados.
- Quatro processos concorrentes: 80 transações sem perda de gravação; uma
  finalização confirmada e três recusadas; lote e inspeção mantidos consistentes.
- Logs sem senha, token ou conteúdo da foto nos fluxos executados.

## Empacotamento Docker e limite do ambiente

A construção do Dockerfile final foi concluída. Foi corrigido o acesso do usuário
`www-data` aos fontes por `COPY --chown`, mantendo a execução sem root.
A suíte de 69 verificações também passou dentro da imagem da aplicação.

O ambiente usa o driver VFS e atingiu o limite de disco durante tentativas de
repetir todas as suítes na imagem empacotada. Para a última construção, o filesystem
da imagem PHP Alpine foi exportado/reimportado localmente em uma camada, preservando
os binários, para reduzir uso de espaço. Essa adaptação é apenas do ambiente de
validação; o Dockerfile versionado referencia a imagem oficial PHP Alpine.
A repetição completa das suítes na imagem final ficou limitada por `no space left
on device`. Isso não substitui nem invalida a execução completa anterior com os
mesmos fontes; o limite é registrado para permitir reproduzir a validação em máquina
com mais espaço. Nenhum banco ou frontend foi usado nas verificações.

## Pendências reais de integração

PostgreSQL, compatibilidade com frontend, homologação independente da equipe,
implantação e confirmação das regras propostas continuam fora desta entrega.
Os comandos reproduzíveis estão no README. O histórico antigo de testes Node.js
não é usado como evidência da implementação PHP.

## Automação no GitHub Actions

O workflow `.github/workflows/frontend.yml` executa as três suítes e a checagem
sintática em PHP 8.2 e 8.4, sem banco. O frontend tem um job separado para
`npm ci`, build e formatação; o cache npm usa somente o lockfile do frontend.

Os testes Playwright existentes iniciam o backend Node.js antigo com PostgreSQL
por `frontend/scripts/e2e-server.mjs`. Por isso não são executados nesta automação:
o harness precisa ser migrado para o contrato PHP antes de reativar a validação
de integração. Os arquivos de teste foram preservados. Build/formatação não são
apresentados como teste de integração frontend/backend.
