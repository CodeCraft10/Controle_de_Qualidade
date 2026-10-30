# Integração com João

Base: http://localhost:3000/api. Contrato completo: openapi.json nesta pasta ou GET /api/openapi.json.

## Padrões

Envie Content-Type: application/json, exceto nas fotos. Inclua Authorization: Bearer TOKEN nas rotas protegidas. O JWT dura oito horas; alterações de conta revogam seus tokens. Não guardar senha no cliente e evitar persistir tokens em localStorage; manter em memória na implementação inicial.

IDs BIGSERIAL retornam como strings; trate-os como identificadores opacos. O backend aceita IDs decimais positivos nos parâmetros e payloads. Datas de resposta são ISO 8601; de e ate usam AAAA-MM-DD, incluindo o dia final, no fuso America/Sao_Paulo.

Listas paginadas retornam:

```json
{ "data": [], "page": 1, "limit": 20, "total": 0, "pages": 0 }
```

Itens de checklist e listas de evidências retornam {"data":[]}. Recursos individuais e indicadores retornam objeto direto.

Erros retornam {"erro":"mensagem","requestId":"identificador"}; o limitador de login retorna somente erro. Códigos: 400 validação, 401 sessão ausente/inválida, 403 perfil/recurso proibido, 404 ausente, 409 duplicidade/estado/vínculo, 413 limite, 429 tentativas excessivas, 500 interno. POST de cadastro retorna 201; DELETE de item retorna 204 sem corpo.

## Perfis

| Operação                                              | admin    | supervisor | inspetor |
| ----------------------------------------------------- | -------- | ---------- | -------- |
| Consultar cadastros, histórico, indicadores e desvios | sim      | sim        | sim      |
| Criar/editar/desativar cadastros e itens              | sim      | sim        | não      |
| Listar/consultar usuários                             | sim      | sim        | não      |
| Criar/alterar contas                                  | sim      | não        | não      |
| Abrir inspeção no próprio nome                        | sim      | sim        | sim      |
| Responder/finalizar/registrar desvio                  | qualquer | qualquer   | próprias |
| Enviar, listar e baixar fotos                         | qualquer | qualquer   | próprias |
| Avançar tratamento de desvio                          | sim      | sim        | não      |

O inspetor é uma conta com perfil inspetor. Para o seletor: GET /usuarios?perfil=inspetor&ativo=true, acessível aos gestores. A abertura registra sempre o usuário autenticado; não permite atribuição arbitrária de responsável.

## Fluxo mínimo

Login:

```js
const base = 'http://localhost:3000/api';
const login = await fetch(base + '/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, senha }),
});
const sessao = await login.json();
if (!login.ok) throw new Error(sessao.erro);
const headers = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer ' + sessao.token,
};
```

Cadastros (gestor), usando os IDs efetivamente retornados:

| Método e caminho                   | JSON                                                      |
| ---------------------------------- | --------------------------------------------------------- |
| POST /produtos                     | {"codigo":"P001","nome":"Peça A"}                         |
| POST /lotes                        | {"codigo":"L001","produto_id":1,"quantidade":10}          |
| POST /criterios                    | {"nome":"Visual","descricao":"Sem riscos"}                |
| POST /checklists                   | {"nome":"Inspeção inicial"}                               |
| POST /checklists/1/itens           | {"criterio_id":1,"obrigatorio":true}                      |
| POST /inspecoes                    | {"lote_id":1,"checklist_id":1}                            |
| PUT /inspecoes/1/respostas/1       | {"resultado":"nao_conforme","observacao":"Risco na peça"} |
| POST /respostas/1/nao-conformidade | {"descricao":"Risco superficial","classificacao":"menor"} |

GET /inspecoes/1 retorna os itens com nome/descrição copiados, resposta_id, resultado e andamento. Use item_id para responder e resposta_id para registrar o desvio. nao_aplicavel exige observacao. Não conforme exige desvio antes de finalizar.

Foto (antes da finalização):

```js
const form = new FormData();
form.append('foto', arquivo);
const resposta = await fetch(base + '/nao-conformidades/' + desvioId + '/evidencias', {
  method: 'POST',
  headers: { Authorization: 'Bearer ' + sessao.token },
  body: form,
});
```

Não definir Content-Type manualmente: o navegador adiciona o boundary. JPEG/PNG/WebP, até 5 MiB, uma foto e nenhum outro campo. Baixe com fetch autenticado em /evidencias/:id/arquivo e converta em Blob; uma tag img com URL direta não envia Bearer. Revogue URLs de Blob após uso.

POST /inspecoes/1/finalizar não precisa de corpo. Retorna status aprovada ou reprovada. A segunda chamada retorna 409. Desvios avançam por PATCH /nao-conformidades/1 com status em_tratamento e depois resolvida. Resolver o desvio não muda a decisão histórica do lote.

## Pesquisa e dashboard

GET /inspecoes, /relatorios/inspecoes e /indicadores aceitam produto_id, lote_id, inspetor_id, status, de, ate e busca. busca procura nome/código do produto e código do lote. Listas aceitam page e limit (1–100). Ordenação das inspeções/relatórios: ordenar=id|iniciada_em|status e direcao=asc|desc. Indicadores não são paginados.

Desvios aceitam os mesmos filtros, mas status significa aberta, em_tratamento ou resolvida; de/ate referem-se ao início da inspeção. ordenar=id|criado_em|status.

Catálogos: filtro ativo=true|false e ordenar=id|nome; lotes usam id|codigo e aceitam produto_id. Usuários: perfil, ativo e ordenar=id|nome.

Relatório CSV: /relatorios/inspecoes?formato=csv&page=1&limit=100. Exporta somente a página solicitada; para volumes maiores, buscar páginas sucessivas. Conteúdo separado por ponto e vírgula, UTF-8 com BOM e fórmulas de planilha neutralizadas.

Indicadores: total, aprovadas, reprovadas, em_andamento, finalizadas, nao_conformidades, taxa_aprovacao e taxa_reprovacao. Percentuais usam somente inspeções finalizadas no denominador, arredondados a duas casas; retornam zero quando não existem finalizadas.

## Situação

Contrato preparado e testado via HTTP. Integração com o frontend real permanece pendente porque os arquivos de João não estão no repositório.
