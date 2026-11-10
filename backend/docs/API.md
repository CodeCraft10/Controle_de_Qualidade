# Contrato HTTP da API PHP

Base local: `http://127.0.0.1:8000/api`. JSON UTF-8, nomes em português.
Todas as rotas exigem `Authorization: Bearer TOKEN`, exceto saúde e login.
Envie `Content-Type: application/json` nos corpos JSON. Fotos usam multipart.
A interface e a API compartilham a origem via `public/index.php`; não é necessário CORS.

## Endpoints

| Método | Caminho após `/api` | Acesso | Corpo / retorno |
|---|---|---|---|
| GET | `/health` | Público | Saúde do processo; não testa banco |
| POST | `/auth/login` | Público | `{email,senha}` → `{token,token_type,expires_in,usuario}` |
| GET | `/auth/me` | Autenticado | Conta atual sem hash |
| POST | `/auth/logout` | Autenticado | Revoga sessão; 204 |
| GET | `/usuarios`, `/usuarios/{id}` | Admin | Página / conta |
| POST | `/usuarios` | Admin | Cria conta; 201 |
| PATCH | `/usuarios/{id}` | Admin | Atualiza conta e revoga sessões; 200 |
| DELETE | `/usuarios/{id}` | Admin | Desativa; 204 |
| GET | `/inspetores`, `/inspetores/{id}` | Admin/supervisor | Contas de perfil inspetor, sem hash |
| GET | `/produtos`, `/lotes`, `/criterios`, `/checklists` | Autenticado | Página de cadastros |
| GET | `/{cadastro}/{id}` | Autenticado | Um cadastro dos quatro acima |
| POST | `/{cadastro}` | Admin/supervisor | Cria cadastro; 201 |
| PATCH | `/{cadastro}/{id}` | Admin/supervisor | Atualiza campos permitidos; 200 |
| DELETE | `/{cadastro}/{id}` | Admin/supervisor | Desativa; 204 |
| GET | `/inspecoes`, `/historico` | Gestor / próprias do inspetor | Página de inspeções |
| POST | `/inspecoes` | Autenticado | `{lote_id,checklist_id}`; 201 |
| GET | `/inspecoes/{id}` | Gestor / responsável | Snapshot, respostas e andamento |
| PUT | `/inspecoes/{id}/respostas/{item_id}` | Gestor / responsável | `{resultado,observacao?}`; 200 |
| POST | `/inspecoes/{id}/finalizar` | Gestor / responsável | Sem corpo; resultado calculado; 200 |
| POST | `/respostas/{id}/nao-conformidade` | Gestor / responsável | `{descricao,classificacao?}`; 201 |
| GET | `/nao-conformidades` | Gestor / próprias do inspetor | Página de desvios |
| GET | `/nao-conformidades/{id}` | Gestor / responsável | Desvio com histórico |
| PATCH | `/nao-conformidades/{id}` | Admin/supervisor | `{status}`; 200 |
| POST | `/nao-conformidades/{id}/evidencias` | Gestor / responsável | Multipart `arquivo`; metadados; 201 |
| GET | `/nao-conformidades/{id}/evidencias` | Gestor / responsável | `{data:[metadados]}` (máximo 10 fotos) |
| GET | `/evidencias/{id}` | Gestor / responsável | Bytes da foto, MIME e download privado |
| GET | `/indicadores` | Gestor / próprias do inspetor | Totais e taxas, sem paginação |
| GET | `/relatorios/inspecoes` | Gestor / próprias do inspetor | Mesmo contrato de página do histórico |
| GET | `/relatorios/inspecoes.csv` | Gestor / próprias do inspetor | CSV da página filtrada, `;` como delimitador |
| GET | `/auditoria` | Admin/supervisor | Página de eventos de alteração |

`{cadastro}` representa exclusivamente `produtos|lotes|criterios|checklists`.
Inspetor não pode ler inspeções/desvios/fotos alheios, ainda que saiba seus IDs.
Não existe rota de cadastro público nem rota para escolher livremente o perfil do login.
Recursos finalizados não aceitam mutações do fluxo, mesmo por administrador.

## Corpos de cadastro

```json
{"nome":"Pedro","email":"pedro@example.test","senha":"ESCOLHA_UMA_SENHA_PRIVADA","perfil":"inspetor"}
```

```json
{"codigo":"P001","nome":"Peça A","descricao":"Peça de demonstração"}
```

```json
{"codigo":"L001","produto_id":1,"quantidade":20,"data_fabricacao":"2026-11-10"}
```

```json
{"nome":"Acabamento","descricao":"Verificar riscos visíveis"}
```

```json
{"nome":"Checklist visual v1","descricao":"Inspeção visual","itens":[{"criterio_id":1,"obrigatorio":true}]}
```

Todos os campos apresentados são obrigatórios, exceto `descricao`, `obrigatorio`
(padrão true) e `observacao` nas respostas. Usuário exige os quatro campos.
`ativo` é sempre true na criação. `PATCH` aceita campos parciais e/ou `ativo` booleano;
contas também aceitam `senha`. `status` de lote/inspeção é calculado, não editável.
`DELETE` é equivalente à desativação. Não há exclusão física.
`id`, `criado_em`, `senha_hash` e campos de histórico não são editáveis.

Strings obrigatórias não podem ser vazias. Limites em bytes UTF-8: nomes 200,
códigos 80, descrições/observações 3000, email 254, senha 12–72. IDs e quantidade:
inteiros de 1 a 999999999; booleanos JSON reais. Nomes/códigos únicos usam comparação
sem distinguir maiúsculas ASCII; email é normalizado para minúsculas. Não há
normalização avançada Unicode nesta etapa.

## Respostas e erros

Criação retorna o recurso com `id` e `criado_em`. Inspeções incluem `itens`, cujos
`id` são locais ao checklist/snapshot, começando em 1. **Não use `criterio_id` como
`item_id` para responder.** `resposta.id` identifica o vínculo usado pelo desvio.

Exemplo resumido de detalhe de inspeção:

```json
{
  "id":1,"lote_id":1,"checklist_id":1,"inspetor_id":2,"status":"em_andamento",
  "itens":[{"id":1,"criterio_id":1,"obrigatorio":true,"criterio_nome":"Acabamento","criterio_descricao":"Verificar riscos visíveis"}],
  "respostas":[{"id":1,"inspecao_id":1,"item_id":1,"resultado":"nao_conforme","observacao":"Risco na face superior"}],
  "andamento":{"total":1,"respondidos":1,"obrigatorios":1,"obrigatorios_respondidos":1,"percentual":100}
}
```

Campos de timestamps e snapshots adicionais são retornados pelo recurso real.
Fotos retornam `{id,nao_conformidade_id,mime,tamanho,sha256,criado_em}`; nunca base64
em listagens. `/evidencias/{id}` retorna binário com `Content-Disposition: attachment`.

Erro tem formato único:

```json
{"erro":"Perfil sem permissão","requestId":"identificador-da-requisicao"}
```

| Código | Significado |
|---|---|
| 400 | JSON inválido ou corpo que não é objeto |
| 401 | Credenciais/sessão inválidas, expiradas ou conta inativa |
| 403 | Perfil ou responsável sem permissão |
| 404 | Registro/rota inexistente |
| 405 | Método não permitido em recurso reconhecido |
| 409 | Duplicidade, vínculo inativo, histórico bloqueado ou transição inválida |
| 413 | Corpo/foto acima do limite |
| 415 | Tipo de corpo não suportado |
| 422 | Campo/filtro inválido, relacionamento inconsistente ou foto inválida |
| 429 | Limite de login; respeitar `Retry-After` |
| 500 | Erro interno sem detalhes privados |

Relacionamento com ID inexistente retorna 404. ID sintaticamente inválido em corpo
retorna 422; caminhos fora do padrão de rota retornam 404 após autenticação.
JSON é limitado a 1 MiB. Upload deve respeitar os limites da aplicação e do php.ini.

## Filtros, paginação e ordenação

Parâmetros são escalares; `sort[]=id` é inválido.

| Parâmetro | Uso |
|---|---|
| `page` | Inteiro positivo, padrão 1 |
| `limit` | 1–100, padrão 20 |
| `sort` | `id` ou `criado_em`; inspeções também `iniciada_em` e `status`; desvios também `status` |
| `order` | `asc` ou `desc`; padrão desc, desempate por id |
| `q` | Busca textual simples sem diferenciar maiúsculas ASCII, nos valores escalares do registro |
| `ativo` | `true|false` para cadastros |
| `status` | Inspeções: `em_andamento|aprovada|reprovada`; lotes: `pendente|aprovado|reprovado`; desvios: `aberta|em_tratamento|resolvida` |
| `produto_id`, `lote_id`, `inspetor_id` | Histórico, inspeções, desvios, indicadores e relatórios; lotes também aceitam produto_id |
| `data_inicio`, `data_fim` | `YYYY-MM-DD`, inclusivas; dia de abertura em America/Sao_Paulo no fluxo de inspeção |

Não envie filtros que não se aplicam ao recurso. Indicadores ignoram paginação e
ordenação. A auditoria também admite busca textual e filtro de data de criação.

```json
{"data":[],"total":0,"page":1,"limit":20,"pages":0}
```

`GET /historico?produto_id=1&status=reprovada&data_inicio=2026-11-01&data_fim=2026-11-30&sort=iniciada_em&order=desc&page=1&limit=20`

Indicadores:

```json
{"total":2,"em_andamento":0,"aprovadas":1,"reprovadas":1,"taxa_aprovacao":50,"taxa_reprovacao":50}
```

## Integração da interface

`POST /checklists` aceita `itens` ausente/vazio para criar um rascunho. A abertura
de inspeção continua exigindo checklist com itens ativos. `GET /checklists/{id}/itens`
retorna `{data:[...]}` com id local, criterio_id, criterio e obrigatorio. Gestores
podem adicionar com POST nesse caminho e remover com DELETE `/checklists/{id}/itens/{item_id}`
somente antes de o checklist ser usado em inspeção. A operação preserva as mesmas
regras de autorização, unicidade e histórico da atualização do cadastro.

Indicadores incluem `finalizadas` e `nao_conformidades` no escopo dos filtros e
da autorização. Fotos também incluem `nome_original` sanitizado para exibição;
o caminho de acesso continua `/evidencias/{id}`, autenticado.

## Demonstração opcional

- `GET /config` é público e retorna `{demo_mode:false}` por padrão.
- `POST /auth/demo` retorna 404 com o modo desligado. Com `DEMO_MODE=true`, cria
  uma sessão temporária de administrador de teste, sem pedir credenciais, com
  `usuario.demo=true`, token opaco e validade de uma hora.
- As outras rotas continuam validando Bearer e regras de negócio. A interface
  obtém a sessão automaticamente somente quando a configuração do servidor permite.
- Dados demo ficam isolados em outro arquivo. Desligar o modo invalida os tokens
  demo e restaura o acesso normal aos dados reais.

Para ativar/desativar na VPS nativa: `php backend/bin/demo.php on|off`.
