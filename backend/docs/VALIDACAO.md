# Validação executada em 30/10/2026

## Ambiente

- Windows PowerShell; Node.js v22.8.0; npm.cmd 10.8.2.
- PostgreSQL 17 real, iniciado em instância isolada em backend/.local/pgdata.
- Banco gp4_dev em 127.0.0.1:55432.
- Cada execução HTTP usa schema aleatório próprio e remove esse schema ao terminar.
- Nenhum frontend ou esquema definitivo dos colegas estava disponível.

## Resultados reais

| Comando/verificação            | Resultado                                                               |
| ------------------------------ | ----------------------------------------------------------------------- |
| Instalação de dependências     | Concluída; package-lock.json gerado                                     |
| npm.cmd run db:migrate         | 001 e 002 aplicadas com sucesso no banco isolado                        |
| Segunda execução das migrações | Sucesso, sem reaplicar arquivos registrados                             |
| npm.cmd test                   | 37 testes contabilizados pelo Node; 37 aprovados, 0 falhas, 0 ignorados |
| npm.cmd run smoke              | Servidor real iniciado; quatro verificações HTTP aprovadas              |
| npm.cmd audit                  | Zero vulnerabilidades conhecidas na execução                            |
| npm.cmd run format             | Arquivos padronizados com Prettier                                      |

A contagem de 37 inclui 30 cenários HTTP, seis testes unitários e o teste que agrupa os cenários HTTP. A execução final levou aproximadamente 3,8 segundos. Não é um percentual de cobertura de linhas nem uma garantia de ausência de vulnerabilidades.

## Cenários verificados

- Saúde/prontidão, CORS e cabeçalhos de segurança.
- Login, credenciais incorretas, token adulterado, expirado, emissor/público/algoritmo inválidos.
- Autorização por perfil e responsável, acesso a evidência de outro inspetor bloqueado.
- Senhas com hash, limite em bytes e revogação de sessões após atualização de conta.
- Campos obrigatórios, JSON malformado, tipo inválido, IDs e ordenação.
- Produtos, lotes, critérios, checklists, itens e usuários; duplicidades e relacionamentos.
- Produto/critérios inativos e checklist vazio bloqueiam uso.
- Duas aberturas simultâneas: exatamente uma aceita e uma bloqueada.
- Critérios apresentados com cópia histórica e progresso.
- Finalização incompleta, resposta inválida e não conformidade faltante bloqueadas.
- Foto válida persistida e recuperada byte a byte; MIME/assinatura/campo/tamanho inválidos rejeitados.
- Falha induzida de SQL após gravar foto: arquivo removido e metadados desfeitos.
- Falha induzida ao atualizar lote: finalização da inspeção também desfeita.
- Duas finalizações simultâneas: exatamente uma aceita e uma bloqueada.
- Inspeção finalizada bloqueia resposta/anexo; resultado do lote coerente.
- Desvio segue aberta → em_tratamento → resolvida com histórico.
- Fluxos de aprovação e reprovação, filtros, paginação, indicadores e CSV.
- Fórmulas de planilha neutralizadas no CSV.
- Transação com FK inválida desfeita no PostgreSQL.
- Logs sem corpo, senha, token ou parâmetros de URL.
- Limites de corpo JSON e tentativas de login.

Os testes induzem dois erros de SQL para conferir rollback/compensação. Por isso aparecem duas linhas de falha_interna no terminal durante uma execução bem-sucedida. Os logs não incluem o SQL nem os dados enviados.

## Inicialização em processo separado

npm.cmd run smoke iniciou src/server.js em porta livre temporária e fez requisições de rede:

```text
API disponível em http://localhost:54929
GET /api/saude → 200
GET /api/prontidao → 200
GET /api/produtos → 401
GET /api/openapi.json → 200
```

O processo da API foi encerrado ao fim da verificação. O PostgreSQL isolado permanece disponível; a API pode ser iniciada com npm.cmd start na pasta backend.

## Problemas encontrados e corrigidos

Na primeira suíte, o tratamento genérico do Multer substituía 413 por 400 e o download bloqueava o caminho privado de testes por conter .local. Ambos foram corrigidos e os cenários passaram. Um payload de SQL injection foi ajustado para passar pela validação de formato do email e testar efetivamente a consulta parametrizada.

O teste adicional de falha na finalização também teve sua função SQL de teste corrigida antes da execução final aprovada.

## O que não foi integrado

- Telas, formulários e dashboard do João.
- Modelagem definitiva e conexão compartilhada do Luiz.
- Hospedagem pública e armazenamento definitivo.
- Homologação independente de Felipe.

A validação comprovou API ↔ PostgreSQL local e API ↔ arquivos privados, com HTTP real. Não comprovou o produto completo com interface dos colegas.
