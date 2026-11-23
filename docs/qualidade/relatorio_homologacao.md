# Relatório de Homologação

## Sistema Inteligente de Controle de Qualidade

## 1. Identificação

- **Projeto:** Sistema Inteligente de Controle de Qualidade.
- **Responsável pelos testes:** Felipe — Testes, documentação e gestão da qualidade.
- **Execução dos testes:** Pedro e João.
- **Data da execução:** 23/11/2026.
- **URL:** https://codecraft.devlook.xyz/
- **Navegador e versão:** Google Chrome 131.0.6778.86.
- **Sistema operacional:** Windows 11 Pro.
- **Ambiente de persistência:** MySQL 8.4.

## 2. Objetivo

Registrar os resultados da homologação, verificando se as funcionalidades avaliadas atendem aos requisitos definidos para o Sistema Inteligente de Controle de Qualidade.

## 3. Resumo da execução

A homologação contemplou 16 casos de teste, distribuídos entre as principais funcionalidades do sistema.

| Resultado | Quantidade |
|---|---:|
| Aprovados | 15 |
| Reprovados | 1 |
| Bloqueados | 0 |
| Não aplicáveis | 0 |
| Pendentes | 0 |
| **Total de casos** | **16** |

**Percentual de aprovação:** 93,75%.

## 4. Casos executados

A tabela apresenta os casos executados durante a homologação, seus respectivos resultados e as principais observações identificadas.

| Caso | Funcionalidade | Resultado | Observação/evidência |
|---|---|---|---|
| CT001 | Acesso inicial | Aprovado | Carregamento em aproximadamente 1,5 segundos, sem erros no console. Evidência: evidencia_ct001_tela_inicial.png (Pedro). |
| CT002 | Navegação e carregamento | Aprovado | Recarregamento via F5 sem quebras de layout (João). |
| CT003 | Produtos | Aprovado | Validação de campos obrigatórios exibida corretamente em vermelho (Pedro). |
| CT004 | Produtos | Aprovado | Produto "Válvula de Pressão V2" (VAL-2026) salvo e listado corretamente (João). |
| CT005 | Produtos | Aprovado | Desativação lógica funcional via chave seletora, preservando histórico (Pedro). |
| CT006 | Inspetores/contas | Aprovado | Inspetor "Marcos Oliveira" (10445) cadastrado e localizado na busca (João). |
| CT007 | Critérios e checklists | Aprovado | Checklist "Inspeção Visual de Solda" salvo com 3 critérios sem duplicidade (Pedro). |
| CT008 | Inspeções | Aprovado | Produto inativo não apareceu nas opções de seleção para nova inspeção (João). |
| CT009 | Inspeções | Aprovado | Sistema bloqueou conclusão e exibiu alerta de item obrigatório pendente (Pedro). |
| CT010 | Inspeções e não conformidades | Aprovado | Resposta não conforme exigiu registro de não conformidade antes de prosseguir (João). |
| CT011 | Evidências | Aprovado | Upload de falha_pintura.jpg (1,4 MB) concluído e visualizado na galeria (Pedro). |
| CT012 | Evidências | Aprovado | Arquivo relatorio_tecnico.pdf recusado com mensagem de formato inválido (João). |
| CT013 | Histórico e relatórios | Aprovado | Filtro por período retornou 12 registros; limpeza restaurou os 45 totais (Pedro). |
| CT014 | Relatórios | Reprovado | Colunas aglutinadas por falha no delimitador CSV. Evidência: bug_ct014_csv_delimitador_falho.png (João). |
| CT015 | Interface responsiva | Aprovado | Layout funcional em 390px (emulação iPhone 12 Pro), com menu hambúrguer e scroll interno na tabela (Pedro). |
| CT016 | Não conformidades | Aprovado | Status da NC-109 atualizado para "Resolvida" com registro completo no histórico (João). |

## 5. Bugs encontrados

Durante a homologação, foram identificados dois registros de problemas que precisam de acompanhamento pela equipe de desenvolvimento.

### BUG001 — Ação de desativação não localizada

- **Descrição:** Ação de desativação não localizada nas áreas de Inspetores, Critérios e Checklists; aguardando confirmação da equipe.
- **Gravidade:** A definir.
- **Status:** Em análise.

### BUG002 — Falha na exportação de relatório CSV

- **Descrição:** A exportação de relatório em CSV (CT014) não respeita o delimitador padrão (ponto e vírgula) entre as colunas "Data de Criação" e "Responsável", aglutinando os dados na mesma célula.
- **Gravidade:** Média.
- **Status:** Aberto.
- **Evidência:** bug_ct014_csv_delimitador_falho.png.

## 6. Limitações e pontos não avaliados

Durante esta rodada de homologação, algumas funcionalidades e verificações não foram contempladas.

- **Autenticação:** A versão publicada descrita no README abre diretamente no painel e não apresenta tela de login. Por isso, testes de autenticação, logout e permissões pela interface não foram incluídos nesta rodada.
- **Testes de desempenho:** Testes de carga e estresse não fizeram parte do escopo.
- **Segurança:** Não foi realizada uma auditoria completa de segurança.
- **Acessibilidade:** Não foi realizada avaliação formal com leitores de tela.
- **Inteligência artificial:** Os recursos de inteligência artificial previstos para etapas futuras não foram avaliados.
- **Desativação lógica:** Embora a desativação lógica tenha sido validada em Produtos (CT005), a disponibilidade da ação nas demais áreas (Inspetores, Critérios e Checklists) segue pendente de confirmação com o time de desenvolvimento (BUG001).

## 7. Conclusão

**Resultado da homologação: Aprovado com ressalvas e correções pendentes.**

Dos 16 casos de teste executados, 15 foram aprovados, representando um percentual de aprovação de 93,75%.

Os resultados demonstram que os principais fluxos de cadastro, montagem de checklists, execução de inspeções, registro de não conformidades, envio de evidências e responsividade atendem aos requisitos esperados.

Entretanto, foram identificados pontos que precisam de acompanhamento:

1. **BUG002:** Correção da falha de formatação e delimitador na exportação CSV identificada no CT014.
2. **BUG001:** Alinhamento com a equipe de desenvolvimento sobre a disponibilidade da ação de desativação nas áreas de Inspetores, Critérios e Checklists.

A liberação definitiva para entrega está condicionada à correção do BUG002 e ao alinhamento com a equipe de desenvolvimento sobre o BUG001.

Após a realização dos ajustes, deverá ser executada uma nova rodada de testes, com foco nos itens identificados, para verificar se os problemas foram solucionados.

## 8. Responsável

**Felipe — Testes, documentação e gestão da qualidade.**

Responsável pelo acompanhamento dos testes, organização dos resultados, documentação dos problemas identificados e gestão da qualidade do projeto.
