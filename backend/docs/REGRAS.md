# Regras e cobertura do plano de Pedro

O PDF é a referência de requisitos B01–B07. Orientações de cronograma, criação de
issues e contato com colegas são planejamento da equipe, não ações automáticas
desta implementação. Esta entrega substitui a pasta antiga pelo backend PHP,
sem conectar banco; o frontend foi integrado em etapa posterior, conforme solicitado. Não cria issues nem envia
mensagens aos integrantes. O código anterior continua recuperável pelo histórico Git.

## Cobertura

| Item | Implementação | Verificação |
|---|---|---|
| B01 | Camadas HTTP/domínio/armazenamento, `.env.example`, erros globais, logs mínimos e contrato de rotas | Sintaxe PHP, saúde e erros HTTP |
| B02 | Hash de senha, tokens opacos revogáveis, perfis e contas/inspetores | Testes de anonimato, perfil, responsável, sessão expirada e revogação |
| B03 | Produtos, lotes, critérios, checklists e contas; duplicidades, vínculos ativos e exclusão lógica | Testes de regras e HTTP |
| B04 | Snapshot de critérios, respostas, progresso, finalização e atualização do lote na mesma transação local | Testes de incompletude, rollback, dupla finalização e concorrência |
| B05 | Desvios, transições auditadas, fotos privadas e metadados | Upload HTTP, MIME real, tamanho, recuperação byte a byte e autorização |
| B06 | Histórico com filtros, paginação, ordenação, indicadores e CSV | Fluxos aprovado/reprovado, filtros, fórmulas e proteção de fórmulas no CSV |
| B07 | Validação, autorização no servidor, registros sem senha/token, testes automatizados | Suítes de domínio, HTTP e concorrência |

A API utiliza persistência transacional JSON local sem `DATABASE_DSN`; com
`DATABASE_DSN` configurado, utiliza o adaptador MySQL de `backend/database/`.

## Decisões propostas para alinhamento da equipe

Estas regras são decisões desta versão, não imposições do enunciado SENAI:

1. Perfis: `admin`, `supervisor` e `inspetor`. Administrador gerencia contas;
   administrador e supervisor gerenciam os demais cadastros e tratam desvios.
2. Inspetor consulta e altera somente suas inspeções, desvios, fotos e relatórios;
   gestores acessam todos. Cadastros de qualidade são consultáveis pelos três perfis.
3. Quem abre a inspeção é seu responsável; não há atribuição a terceiros nesta versão.
4. Um lote admite uma inspeção. Não há cancelamento ou reinspeção neste contrato.
5. Lote/produto/checklist/critérios devem estar ativos para abertura. Quantidade é
   inteira positiva. Checklist pode ser montado como rascunho com até 200 critérios únicos; a abertura de inspeção exige ao menos um.
6. Na abertura, nome do produto, código do lote, nome do checklist e critérios são
   copiados para a inspeção. O histórico não depende de nomes de cadastros futuros.
7. Cadastros referenciados não têm campos de negócio editáveis; podem ser desativados.
   Crie uma nova versão com novo código/nome para mudar dados em uso. Itens do checklist
   são substituídos em conjunto via PATCH somente antes de uso.
8. Resposta é `conforme`, `nao_conforme` ou `nao_aplicavel`. Não aplicável exige
   justificativa e conta como respondida. Toda inspeção precisa de ao menos uma
   resposta e de todos os itens obrigatórios, mesmo que os demais sejam opcionais.
9. Qualquer resposta não conforme reprova e exige uma não conformidade vinculada.
   Cada resposta admite um desvio; resposta com desvio registrado não pode mudar.
10. Estados da inspeção: `em_andamento → aprovada|reprovada`. Finalização é única,
    calcula o resultado e atualiza o lote para `aprovado|reprovado` de forma atômica.
11. Após finalizar, respostas, desvios novos e fotos novas são bloqueados. Fotos e
    histórico continuam consultáveis pelo responsável e pelos gestores.
12. Desvios seguem `aberta → em_tratamento → resolvida`, com registro de autor/data.
    Podem ser tratados após a inspeção encerrar. Resolver não muda o resultado passado.
13. Classificação `menor|maior|critica` não muda a fórmula de aprovação.
14. `DELETE` desativa o cadastro, sem apagar referências nem liberar seu código/nome.
    O último administrador ativo não pode ser desativado ou perder seu perfil.
15. Editar conta revoga suas sessões, inclusive ao alterar nome/email/perfil/senha.
    Uma conta desativada não pode entrar; logout revoga o token apresentado.

## Indicadores e filtros

- Taxa de aprovação = aprovadas ÷ (aprovadas + reprovadas) × 100.
- Taxa de reprovação = reprovadas ÷ (aprovadas + reprovadas) × 100.
- Sem finalizadas, ambas são zero; arredondamento de duas casas decimais.
- `total` inclui em andamento. Indicadores consideram **todos** os registros do filtro,
  e não somente a página. O escopo de acesso do usuário sempre é aplicado.
- Datas filtram o dia de **abertura** da inspeção, inclusive nas consultas de desvios;
  limites inclusivos em `America/Sao_Paulo`. Timestamps de resposta ficam em UTC ISO 8601.
- Exportação CSV usa a página solicitada, com máximo de 100 linhas. A resposta JSON
  informa `total/pages` para permitir exportar as páginas seguintes. Colunas textuais
  iniciadas como fórmulas são prefixadas com apóstrofo.

## Fotos e operação

JPEG, PNG e WebP; até 5 MiB por arquivo, até 40 milhões de pixels, até 10 fotos por
desvio. Validação usa Fileinfo e cabeçalho real da imagem; nome/extensão declarados
não decidem o tipo. SVG, executáveis e arquivos falsamente renomeados são recusados.
Download exige Bearer, não existe URL pública de armazenamento. Os bytes originais
são preservados; não há antivírus, transcodificação nem remoção de EXIF nesta etapa.

Login tem limite persistente por IP (10 falhas em 15 minutos por padrão). IP vem
da conexão direta; cabeçalhos de proxy não são confiados. Uma falha grava o contador;
um login válido limpa o contador, salvo quando a janela já está bloqueada.
Ajustar proxy confiável e limitação distribuída cabe à futura implantação.
