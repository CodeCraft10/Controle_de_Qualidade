# Plano de Testes
## Sistema Inteligente de Controle de Qualidade

### Histórico de alterações

| Versão | Descrição | Responsável |
|---|---|---|
| 1.1 | Atualização do plano conforme a arquitetura atual e ampliação do escopo de testes. | Felipe |

## 1. Objetivo

Definir o escopo, a estratégia, os critérios e as responsabilidades dos testes do Sistema Inteligente de Controle de Qualidade. O objetivo é verificar se as funcionalidades implementadas atendem aos requisitos do projeto e identificar problemas antes da entrega.

## 2. Visão geral do sistema

O sistema é uma aplicação web responsiva destinada ao gerenciamento de produtos, lotes, inspetores, critérios, checklists, inspeções, não conformidades, evidências e relatórios.

### Tecnologias identificadas na documentação do projeto

- Frontend: HTML5, CSS3, JavaScript e Vite.
- Backend: PHP 8.2+, sem framework.
- Banco de dados: MySQL 8.4 no ambiente com Compose.
- Persistência alternativa: armazenamento JSON local quando `DATABASE_DSN` não está configurado.
- Versionamento: Git e GitHub.

## 3. Escopo dos testes

### 3.1 Funcionalidades incluídas

- Abertura do sistema, navegação e atualização da página.
- Cadastro, consulta, busca e desativação lógica de produtos.
- Cadastro e consulta de lotes.
- Cadastro e consulta de inspetores.
- Cadastro de critérios e montagem de checklists.
- Abertura, preenchimento e finalização de inspeções.
- Validação de respostas obrigatórias e respostas não aplicáveis.
- Registro e tratamento de não conformidades.
- Envio, consulta e recuperação de evidências fotográficas.
- Consulta do histórico, filtros, indicadores e relatórios.
- Exportação de dados em CSV.
- Responsividade e apresentação em dispositivos móveis.
- Mensagens de validação e tratamento de erros.

### 3.2 Itens com limitação na versão avaliada

A versão publicada descrita no README abre diretamente no painel e não apresenta tela de login. Portanto, os testes de autenticação pela interface não fazem parte da execução manual dessa versão. As regras de autenticação e permissões continuam existindo no backend e possuem validações próprias.

A arquitetura permite persistência JSON local ou MySQL, conforme a configuração do ambiente. O ambiente utilizado em cada execução deve ser registrado no relatório.

### 3.3 Fora do escopo desta rodada

- Testes de carga e estresse.
- Auditoria completa de segurança ou teste de invasão.
- Avaliação formal de acessibilidade com leitores de tela.
- Integração com recursos de inteligência artificial, ainda previstos para etapa futura.

## 4. Estratégia de testes

Os testes serão realizados principalmente de forma manual, utilizando a aplicação como um usuário comum. Quando necessário, serão consultadas as regras documentadas e os resultados poderão ser comparados com o comportamento da API.

Tipos de teste:
- **Funcional:** verifica se cada funcionalidade executa sua tarefa.
- **Validação:** verifica campos obrigatórios, formatos e dados inválidos.
- **Integração:** verifica se frontend, backend e persistência trabalham corretamente em conjunto.
- **Regressão:** repete testes de funcionalidades já verificadas após correções.
- **Usabilidade:** observa clareza, facilidade de navegação e mensagens apresentadas.
- **Responsividade:** verifica o comportamento em diferentes larguras de tela.

## 5. Ambiente de testes

Preencher antes de cada rodada:

| Item | Ambiente utilizado |
|---|---|
| URL | https://codecraft.devlook.xyz/ |
| Sistema operacional | A preencher |
| Navegador e versão | A preencher |
| Resolução desktop | A preencher |
| Resolução mobile/emulação | A preencher |
| Persistência | MySQL ou JSON — confirmar |
| Data da execução | A preencher |
| Versão/commit avaliado | A preencher |

**Importante:** utilizar somente dados fictícios no ambiente compartilhado de demonstração. Não inserir senhas, dados pessoais ou informações reais.

## 6. Critérios de entrada

- Aplicação disponível para acesso.
- Funcionalidade que será testada implementada.
- Dados fictícios preparados, quando necessários.
- Requisitos ou regras da funcionalidade consultados.
- Ambiente e versão registrados.

## 7. Critérios de aprovação

Um caso será aprovado quando o resultado observado corresponder ao resultado esperado. Será reprovado quando houver diferença reproduzível. Será bloqueado quando não for possível executar por indisponibilidade ou dependência ausente. Não executar um teste não significa que ele foi aprovado.

## 8. Critérios de encerramento

A rodada poderá ser considerada concluída quando:
- Todos os casos previstos tiverem um status registrado.
- Bugs encontrados estiverem documentados com passos de reprodução.
- Os casos reprovados tiverem sido comunicados à equipe.
- Correções entregues tiverem sido retestadas.
- O relatório de homologação estiver preenchido com os resultados reais.

## 9. Registro de evidências

Quando possível, anexar capturas de tela que demonstrem o comportamento observado. Nomear os arquivos com o ID do caso, por exemplo `CT010-upload-foto.png`. As evidências devem utilizar dados fictícios e não podem mostrar credenciais ou tokens.

## 10. Responsabilidades

- **Felipe — Testes, documentação e gestão da qualidade:** preparar e executar casos de teste, registrar evidências, documentar bugs, manter a matriz de rastreabilidade e elaborar o relatório.
- **Desenvolvedores:** analisar e corrigir os problemas encaminhados, informando a alteração realizada para permitir o reteste.
- **Equipe:** revisar os resultados e participar da homologação final.

## 11. Situação do plano

Plano atualizado. A execução dos casos deve ser registrada em `casos_de_teste.md`; este documento, por si só, não representa a aprovação do sistema.
