# Integração PostgreSQL e contratos pendentes

O frontend agora usa a API PHP na mesma origem, por `public/index.php`. A instalação
integrada está descrita em [VPS](../../docs/implantacao/VPS.md). A integração com
PostgreSQL continua futura; não há driver, migrations ou conexão relacional.

## Luiz — banco relacional

O primeiro esquema relacional está implementado em `backend/database/`, com
migration inicial, provisionamento local por Compose, seed fictício, consultas de
relatório e instruções de backup/restauração. O detalhamento segue o plano
`GP4_Plano_Detalhado_Luiz.pdf` e as regras confirmadas pela API atual.

O backend HTTP ainda usa `JsonStore`; o esquema PostgreSQL é provisionado à parte.
A integração de produção ainda exige adaptar os serviços a repositórios por
agregado e migrar os arquivos JSON com procedimento verificável. Não configure
`DATABASE_DSN` na API esperando que ela passe a usar PostgreSQL nesta etapa.

1. Alinhar `docs/API.md` e `docs/REGRAS.md`, especialmente a inspeção única por lote,
   snapshots, estados, exclusão lógica e autorização por responsável.
2. **Concluído no esquema inicial:** modelar usuários, sessões, tentativas de login,
   produtos, lotes, critérios, checklists, itens, inspeções, snapshots, respostas,
   não conformidades, histórico, ações corretivas, evidências e auditoria.
3. **Concluído no esquema inicial:** usar FKs, unicidade de email/códigos, unicidade de lote em inspeção e de
   `(inspecao_id,item_id)` em respostas. Desvios devem ter resposta única.
4. **Pendente:** implementar repositórios e unidade de trabalho relacional. `Storage/Store.php`
   delimita a transação, mas seu contrato atual passa o estado completo em array:
   não é adequado carregar todas as tabelas no PostgreSQL. Extrair interfaces por
   agregado e adaptar os serviços antes de criar um `PostgresStore` para produção.
5. **Pendente na API PostgreSQL:** finalização precisa bloquear a inspeção/lote, validar respostas/desvios e
   atualizar ambos em uma transação. Usar PDO parametrizado ou ORM; nunca concatenar entrada em SQL.
6. **Pendente:** rodar os mesmos cenários de regras e HTTP contra a implementação nova e adicionar
   testes com banco real para locks, rollback, constraints e migrações.
7. **Pendente se fotos forem para storage externo:** guardar chave/metadados no banco e
   definir compensação/outbox: a transação SQL não torna o upload externo atômico.

O schema contém migrations, mas não há configuração `DATABASE_DSN` ativa no backend
HTTP. As instruções de provisionamento e a limitação atual estão em
`backend/database/README.md`.

## João — frontend integrado

As telas foram alinhadas aos endpoints PHP, incluindo login/logout com token opaco,
checklists em rascunho, campos de respostas, nomes dos snapshots, metadados de fotos,
filtros e download CSV. A compilação é servida pela mesma entrada pública da API.
Os testes Playwright iniciam PHP e usam armazenamento temporário real.

## Felipe — qualidade

Executar as três suítes do README e a demonstração. Confirmar as propostas de
regras com a equipe. Registrar homologação independente, sem reutilizar os
resultados antigos do backend Node.js como prova da versão PHP.

## Implantação posterior

Escolher servidor PHP apropriado (por exemplo FPM), HTTPS, limites de upload do
proxy/PHP, armazenamento persistente privado, backups, política de retenção e
segredos fora do Git. Trocar o adaptador JSON antes de usar múltiplas instâncias.
O objetivo atual é desenvolver e testar o backend localmente.
