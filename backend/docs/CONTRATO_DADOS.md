# Proposta de contrato de dados para Luiz

Na análise inicial, o repositório tinha somente README.md e nenhum SQL. A estrutura do ZIP foi aproveitada como proposta de desenvolvimento; não representa uma modelagem aprovada pelo responsável pelo banco.

## Entidades

| Tabela                     | Responsabilidade e vínculos                                                 |
| -------------------------- | --------------------------------------------------------------------------- |
| usuarios                   | Nome, email único normalizado, hash bcrypt, perfil, ativo, versão de sessão |
| produtos                   | Código único, nome, descrição, ativo                                        |
| lotes                      | Código único, produto_id, quantidade positiva, status e ativo               |
| criterios                  | Nome único, descrição, ativo                                                |
| checklists                 | Nome, descrição, ativo                                                      |
| checklist_itens            | checklist_id, criterio_id, obrigatorio; par único                           |
| inspecoes                  | lote_id único, checklist_id, inspetor_id, status e horários                 |
| inspecao_itens             | Cópia histórica de nome, descrição e obrigatoriedade; chave inspeção/item   |
| respostas                  | inspeção, item, checklist, resultado e observação; par inspeção/item único  |
| nao_conformidades          | resposta_id único, descrição, classificação, situação e criação             |
| nao_conformidade_historico | Desvio, usuário, estado e horário de cada transição                         |
| evidencias                 | Desvio, nome original, nome interno aleatório, MIME, bytes e criação        |
| gp4_migrations             | Controle de migrações aplicadas                                             |

Todas as entidades de negócio têm chaves BIGSERIAL, exceto a cópia histórica com chave composta. FKs usam restrição de exclusão. As FKs compostas das respostas garantem que item e inspeção sejam do mesmo checklist. Índices apoiam joins e filtros; a unicidade do lote impede abertura duplicada até em concorrência.

## Estados propostos

- Lote: pendente → aprovado ou reprovado.
- Inspeção: em_andamento → aprovada ou reprovada.
- Resposta: conforme, nao_conforme ou nao_aplicavel.
- Desvio: aberta → em_tratamento → resolvida.
- Classificação: menor, maior ou critica.

Foi adotada uma inspeção por lote, sem reinspeção nesta versão. Qualquer não conformidade reprova, independentemente da classificação. Campos de estado de lote/inspeção são derivados do fluxo, nunca editados pelo CRUD.

## Transações e histórico

Abertura bloqueia o lote e checklist, verifica atividade, insere inspeção e cópias dos itens. Respostas e finalização bloqueiam a inspeção. A finalização valida todos os itens obrigatórios, exige desvios e atualiza inspeção/lote na mesma transação.

Edição de itens bloqueia o checklist; cadastros utilizados não podem ser renomeados/reestruturados. Desativação preserva histórico e impede novos usos, sem impedir a conclusão de inspeções já abertas. Não há exclusão física de produtos, lotes, critérios, checklists ou usuários.

Os nomes de usuários não são congelados em relatórios: o responsável permanece identificado pela FK. Estados e horários da inspeção, respostas e cópias dos critérios são preservados.

## Revisão e implantação

1. Luiz revisa entidades, estados, cardinalidades, índices e nomenclatura.
2. Comparar esquema definitivo e proposta, documentando alterações no contrato da API.
3. Preparar migrações de adaptação sem apagar dados.
4. Executar testes em banco de homologação.
5. Somente depois conectar a API ao banco compartilhado.

001_inicial.sql e 002_integridade.sql foram testados em PostgreSQL 17, partindo de schema vazio. Não são uma ferramenta de conversão de banco existente. Use um usuário de execução com privilégios mínimos e outro para migrações, conforme política da equipe. Configure TLS com verificação de certificado quando o banco estiver remoto; não desligue a verificação.
