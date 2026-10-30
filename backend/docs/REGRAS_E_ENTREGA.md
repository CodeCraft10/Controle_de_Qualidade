# Regras e entrega B01–B07

## Análise da base

A branch main atualizada continha apenas o README, com tecnologias ainda em aberto. O ZIP tinha uma base CommonJS/Express/PostgreSQL, sem frontend, sem OpenAPI e com quatro testes unitários. O PDF confirmou o escopo B01–B07 e apresentou regras de negócio como propostas a alinhar.

Problemas corrigidos: leitura de fotos sem autorização por recurso, upload antes da autorização, validação insuficiente de tipos e datas, falta de progresso/itens pendentes, possibilidade de duas inspeções para o lote, corrida na edição de checklists, cadastro de lote com produto inativo, edição de registros históricos, senha bcrypt acima do limite, logs de erro capazes de expor parâmetros e documentação/testes incompletos.

As instruções de criar issues/PR e pedir revisão no PDF foram tratadas como orientação do plano; o pedido executado foi desenvolver e validar o backend local, com commits na branch própria. Nenhuma mensagem foi enviada a colegas.

## Implementado

| Módulo | Entrega                                                                                                   |
| ------ | --------------------------------------------------------------------------------------------------------- |
| B01    | Express, configuração, CORS, segurança HTTP, logs mínimos, erros, saúde, prontidão e OpenAPI              |
| B02    | bcrypt custo 12, JWT HS256 de 8h, perfis, usuários ativos e revogação por versão                          |
| B03    | Produtos, lotes, critérios, checklists, itens e usuários; vínculos, duplicidades, paginação e desativação |
| B04    | Inspeção única por lote, cópia de critérios, respostas, andamento e finalização transacional              |
| B05    | Desvios classificados, transições auditadas, fotos privadas e compensação em falha de gravação            |
| B06    | Pesquisa, filtros, paginação, ordenação, indicadores e CSV da página                                      |
| B07    | Testes unitários e HTTP com banco real, concorrência, rollback e autorização                              |

## Regras adotadas para esta versão

1. Um lote possui uma inspeção. Não existe reinspeção ou cancelamento.
2. Quem abre é o responsável. Admin/supervisor podem atuar sobre qualquer inspeção; inspetor modifica somente as próprias.
3. Abertura exige lote/produto/checklist/critérios ativos e checklist com itens.
4. Finalização exige pelo menos uma resposta e todas as obrigatórias. nao_aplicavel exige justificativa e conta como respondido.
5. Qualquer nao_conforme reprova e exige desvio registrado; os demais resultados aprovam.
6. Após finalização, respostas e anexos não mudam. Dados históricos são preservados.
7. Resolver um desvio não aprova retroativamente o lote.
8. Classificações não alteram a fórmula de aprovação.
9. Cadastros usados em inspeção ficam estáveis; crie nova versão. A desativação é permitida.
10. Fotos: JPEG, PNG ou WebP, até 5 MiB; somente responsável/gestor tem acesso.
11. Taxa de aprovação = aprovadas / (aprovadas + reprovadas) × 100. Taxa de reprovação análoga. Sem finalizadas, ambas são zero.
12. Filtros de datas são inclusivos no fuso America/Sao_Paulo; CSV exporta uma página por vez.

## Limitações e dependências

- João: implementar telas e validar o contrato com o frontend real; ajustar CORS_ORIGIN.
- Luiz: aprovar/adaptar a proposta SQL, confirmar regra de uma inspeção por lote e fornecer conexão do banco compartilhado.
- Felipe: revisar cenários, executar homologação independente e consolidar a documentação geral.
- Equipe: confirmar classificação, nao_aplicavel, visibilidade global do histórico e necessidade de reinspeções.
- Hospedagem: escolher armazenamento persistente privado, HTTPS, backups e eventual limitador distribuído caso haja múltiplas instâncias.
- Consistência disco/banco: compensação cobre erros normais; desligamento abrupto pode gerar arquivo órfão e exige conciliação.
- Hashing bcrypt limita senhas a 72 bytes; nenhum segredo foi incluído nos arquivos versionados.
- Proteção contra upload malicioso valida formato básico; não substitui antivírus nem transcodificação de imagem.

## Distinção de conclusão

Implementado significa código e documentação presentes. Testado significa execução registrada em VALIDACAO.md. Integrado com colegas exige os componentes reais de João/Luiz; isso ainda está pendente. O banco local usado nos testes é PostgreSQL real, isolado e baseado na proposta provisória.
