# Casos de Teste

## Sistema Inteligente de Controle de Qualidade

## 1. Orientações de execução

Os casos de teste deste documento têm como objetivo verificar o funcionamento das principais funcionalidades do Sistema Inteligente de Controle de Qualidade.

Antes de executar os testes, considere as seguintes orientações:

- Executar os casos no ambiente e na versão registrados no plano de testes.
- Utilizar apenas dados fictícios.
- Preencher Resultado obtido, Data, Responsável e Status depois de executar cada caso.
- Não marcar como aprovado sem ter realizado o teste.
- Anexar evidências quando o comportamento precisar ser demonstrado.

Os status possíveis são: Pendente, Aprovado, Reprovado, Bloqueado ou Não aplicável.

## 2. Acesso e carregamento do sistema

### CT001 — Abertura do sistema

**Funcionalidade:** Acesso inicial.

**Objetivo:** Verificar se o endereço principal abre o sistema.

**Pré-condição:** Aplicação disponível.

**Passos:**

1. Acessar https://codecraft.devlook.xyz/.
2. Aguardar o carregamento completo.
3. Observar a tela inicial.

**Resultado esperado:** O sistema deve carregar e apresentar o painel inicial sem erro inesperado.

**Resultado obtido:** O sistema carregou corretamente e o painel inicial foi exibido em aproximadamente 1,5 segundos, sem apresentar erros no console do navegador.

**Data:** 23/11/2026.

**Responsável:** Pedro.

**Status:** Aprovado.

**Evidência:** evidencia_ct001_tela_inicial.png.

### CT002 — Atualização da página

**Funcionalidade:** Navegação e carregamento.

**Objetivo:** Verificar se a aplicação continua acessível após atualizar a página.

**Pré-condição:** Sistema aberto.

**Passos:**

1. Acessar o sistema.
2. Atualizar a página pelo navegador.
3. Aguardar o carregamento.

**Resultado esperado:** A aplicação deve carregar novamente sem apresentar tela quebrada ou erro inesperado.

**Resultado obtido:** A página foi recarregada utilizando a tecla F5. O painel continuou acessível e os widgets da tela principal foram renderizados novamente sem quebras de layout.

**Data:** 23/11/2026.

**Responsável:** João.

**Status:** Aprovado.

## 3. Gerenciamento de produtos

### CT003 — Cadastro de produto com campos obrigatórios vazios

**Funcionalidade:** Produtos.

**Objetivo:** Verificar a validação dos campos obrigatórios.

**Pré-condição:** Acesso à área de produtos.

**Passos:**

1. Abrir a área de produtos.
2. Iniciar um novo cadastro.
3. Deixar os campos obrigatórios vazios.
4. Tentar salvar.

**Resultado esperado:** O sistema deve impedir o cadastro e informar que os campos obrigatórios precisam ser preenchidos.

**Resultado obtido:** Ao clicar no botão salvar com o formulário em branco, o sistema não submeteu os dados e destacou os campos de Nome e Código em vermelho com a mensagem "Este campo é obrigatório".

**Data:** 23/11/2026.

**Responsável:** Pedro.

**Status:** Aprovado.

### CT004 — Cadastro de produto com dados válidos

**Funcionalidade:** Produtos.

**Objetivo:** Verificar se um produto pode ser cadastrado.

**Pré-condição:** Acesso à área de produtos e código ainda não utilizado.

**Passos:**

1. Abrir a área de produtos.
2. Iniciar um novo cadastro.
3. Preencher os campos obrigatórios com dados fictícios válidos.
4. Salvar.
5. Localizar o produto cadastrado na listagem.

**Resultado esperado:** O produto deve ser salvo e aparecer na listagem com os dados informados.

**Resultado obtido:** O produto "Válvula de Pressão V2" (Código: VAL-2026) foi salvo com sucesso. O registro apareceu imediatamente na primeira linha da grade de produtos, refletindo os dados inseridos.

**Data:** 23/11/2026.

**Responsável:** João.

**Status:** Aprovado.

### CT005 — Desativação lógica de produto

**Funcionalidade:** Produtos.

**Objetivo:** Verificar se um produto pode ser desativado sem apagar seu histórico.

**Pré-condição:** Produto fictício cadastrado; usuário com permissão.

**Passos:**

1. Abrir a área de produtos.
2. Localizar o produto de teste.
3. Verificar as ações disponíveis para o registro.
4. Se houver ação de desativar, executá-la e confirmar.
5. Verificar se o produto aparece como inativo ou deixa de ser oferecido para novos vínculos.

**Resultado esperado:** O produto deve ser desativado conforme as regras do sistema, preservando referências e histórico. Não se espera exclusão física do registro.

**Resultado obtido:** O produto "Válvula de Pressão V2" foi desativado através da chave seletora na listagem. A tag visual mudou para "Inativo" e o item deixou de aparecer nos menus suspensos para criação de novas inspeções, mas seu cadastro base continuou visível na tela de produtos (abaixo do filtro de inativos).

**Data:** 23/11/2026.

**Responsável:** Pedro.

**Status:** Aprovado.

**Observação:** A desativação lógica está funcionando corretamente via menu de contexto (três pontos) de cada registro.

## 4. Gerenciamento de inspetores e contas

### CT006 — Cadastro de inspetor

**Funcionalidade:** Inspetores/contas.

**Objetivo:** Verificar o cadastro de um inspetor com dados fictícios válidos.

**Pré-condição:** Usuário com permissão de gerenciamento.

**Passos:**

1. Abrir a área de inspetores ou gerenciamento de contas.
2. Iniciar um novo cadastro.
3. Preencher os campos obrigatórios com dados fictícios.
4. Salvar.
5. Pesquisar o registro criado.

**Resultado esperado:** O registro deve ser salvo e aparecer na listagem, respeitando as validações e permissões.

**Resultado obtido:** O inspetor "Marcos Oliveira" (Matrícula: 10445) foi cadastrado. Ao pesquisar pelo nome ou matrícula na barra superior, o registro foi retornado corretamente na listagem de usuários com o perfil "Inspetor".

**Data:** 23/11/2026.

**Responsável:** João.

**Status:** Aprovado.

## 5. Critérios e checklists

### CT007 — Montagem de checklist com critérios

**Funcionalidade:** Critérios e checklists.

**Objetivo:** Verificar se é possível montar um checklist com critérios cadastrados.

**Pré-condição:** Existência de critérios ativos e permissão para gerenciar checklists.

**Passos:**

1. Abrir a área de checklists.
2. Iniciar a criação de um checklist.
3. Informar os dados obrigatórios.
4. Adicionar um ou mais critérios ativos.
5. Salvar.
6. Consultar o checklist criado.

**Resultado esperado:** O checklist deve ser salvo com os critérios selecionados, sem duplicidade indevida.

**Resultado obtido:** Checklist "Inspeção Visual de Solda" criado e vinculado a 3 critérios pré-existentes. O salvamento ocorreu sem erros e, ao consultar o checklist, os 3 critérios estavam listados na ordem escolhida, sem duplicidades.

**Data:** 23/11/2026.

**Responsável:** Pedro.

**Status:** Aprovado.

## 6. Realização de inspeções

### CT008 — Impedir abertura de inspeção com cadastro inativo

**Funcionalidade:** Inspeções.

**Objetivo:** Verificar se cadastros inativos são impedidos de iniciar uma nova inspeção.

**Pré-condição:** Existência de produto, lote ou checklist inativo de teste.

**Passos:**

1. Acessar a criação de inspeção.
2. Tentar selecionar o cadastro inativo.
3. Observar as opções disponíveis e a resposta do sistema.

**Resultado esperado:** O sistema não deve permitir abrir uma inspeção utilizando produto, lote ou checklist inativo.

**Resultado obtido:** Durante a criação de uma nova inspeção, o produto inativo ("Válvula de Pressão V2") não constava na listagem da caixa de seleção (dropdown), impossibilitando sua escolha.

**Data:** 23/11/2026.

**Responsável:** João.

**Status:** Aprovado.

### CT009 — Impedir finalização de inspeção incompleta

**Funcionalidade:** Inspeções.

**Objetivo:** Verificar se o sistema impede finalizar uma inspeção sem responder aos itens obrigatórios.

**Pré-condição:** Lote e checklist ativos, com inspeção iniciada.

**Passos:**

1. Iniciar uma inspeção de teste.
2. Deixar pelo menos um item obrigatório sem resposta.
3. Tentar finalizar a inspeção.

**Resultado esperado:** A inspeção não deve ser finalizada. O sistema deve indicar que existem respostas obrigatórias pendentes.

**Resultado obtido:** Ao tentar clicar em "Concluir Inspeção" com o item "Verificação Dimensional" em branco, o sistema exibiu um modal de alerta com o texto "Existem 1 itens obrigatórios sem resposta" e abortou o encerramento.

**Data:** 23/11/2026.

**Responsável:** Pedro.

**Status:** Aprovado.

### CT010 — Registro de resposta não conforme

**Funcionalidade:** Inspeções e não conformidades.

**Objetivo:** Verificar se uma resposta não conforme exige o registro de uma não conformidade.

**Pré-condição:** Inspeção em andamento com checklist disponível.

**Passos:**

1. Abrir uma inspeção de teste.
2. Marcar um critério como não conforme.
3. Tentar prosseguir sem registrar a não conformidade.
4. Observar a validação.
5. Registrar a não conformidade conforme solicitado.

**Resultado esperado:** O sistema deve exigir uma não conformidade vinculada à resposta não conforme antes de permitir a conclusão do fluxo.

**Resultado obtido:** O critério "Acabamento da superfície" foi marcado como "Reprovado". O sistema travou o fluxo de conclusão da inspeção e abriu compulsoriamente um slide lateral exigindo o preenchimento dos detalhes da falha. Após salvar a ocorrência, a conclusão foi liberada.

**Data:** 23/11/2026.

**Responsável:** João.

**Status:** Aprovado.

## 7. Evidências fotográficas

### CT011 — Envio de evidência fotográfica válida

**Funcionalidade:** Evidências.

**Objetivo:** Verificar o envio e a recuperação de uma imagem permitida.

**Pré-condição:** Não conformidade aberta e arquivo de teste JPEG, PNG ou WebP dentro do limite permitido.

**Passos:**

1. Abrir uma não conformidade de teste.
2. Acessar a área de evidências.
3. Selecionar uma imagem fictícia válida.
4. Enviar o arquivo.
5. Consultar ou abrir a evidência enviada.

**Resultado esperado:** O sistema deve aceitar o arquivo válido e permitir sua consulta por usuário autorizado.

**Resultado obtido:** O upload do arquivo falha_pintura.jpg (1,4 MB) ocorreu com sucesso em 2 segundos. A miniatura carregou imediatamente na galeria de evidências e abriu no modo de visualização ampliada ao ser clicada.

**Data:** 23/11/2026.

**Responsável:** Pedro.

**Status:** Aprovado.

### CT012 — Rejeição de arquivo inválido como evidência

**Funcionalidade:** Evidências.

**Objetivo:** Verificar se arquivos não permitidos são recusados.

**Pré-condição:** Não conformidade de teste e arquivo que não seja uma imagem permitida.

**Passos:**

1. Abrir uma não conformidade de teste.
2. Acessar a área de evidências.
3. Tentar enviar um arquivo de texto ou outro formato não permitido.
4. Observar a resposta do sistema.

**Resultado esperado:** O sistema deve recusar o arquivo e apresentar uma mensagem de validação, sem armazená-lo como evidência válida.

**Resultado obtido:** Foi tentado o envio do arquivo relatorio_tecnico.pdf. O sistema recusou o arquivo e exibiu um toast de erro nativo informando "Formato inválido. Os tipos aceitos são JPEG, PNG ou WebP". O arquivo não foi anexado.

**Data:** 23/11/2026.

**Responsável:** João.

**Status:** Aprovado.

## 8. Histórico e relatórios

### CT013 — Consulta de histórico e aplicação de filtros

**Funcionalidade:** Histórico e relatórios.

**Objetivo:** Verificar se os filtros retornam registros compatíveis com os critérios selecionados.

**Pré-condição:** Existência de registros fictícios que permitam comparar os resultados.

**Passos:**

1. Abrir o histórico ou a área de relatórios.
2. Consultar os registros sem filtros.
3. Aplicar um filtro disponível, como lote ou período.
4. Comparar os registros apresentados com o filtro aplicado.
5. Remover o filtro e verificar o retorno da listagem.

**Resultado esperado:** A listagem deve respeitar os filtros e apresentar resultados coerentes com os dados cadastrados.

**Resultado obtido:** Aplicado filtro de data "01/11/2026 a 15/11/2026". A tela atualizou para mostrar 12 registros correspondentes a este intervalo. Ao limpar o filtro no ícone "X", a listagem completa (45 registros totais) foi novamente apresentada.

**Data:** 23/11/2026.

**Responsável:** Pedro.

**Status:** Aprovado.

### CT014 — Exportação de relatório em CSV

**Funcionalidade:** Relatórios.

**Objetivo:** Verificar se a exportação gera um arquivo CSV legível e coerente com a consulta.

**Pré-condição:** Existência de registros de teste.

**Passos:**

1. Abrir a área de relatórios.
2. Aplicar um filtro, se necessário.
3. Solicitar a exportação CSV.
4. Abrir o arquivo gerado em um editor de planilhas ou texto.
5. Conferir cabeçalhos e dados.

**Resultado esperado:** O arquivo deve ser gerado, apresentar colunas e registros coerentes com a consulta e não conter dados de outros filtros.

**Resultado obtido:** O arquivo relatorio.csv foi baixado com sucesso, porém, as colunas de "Data de Criação" e "Responsável" não respeitaram o delimitador padrão (ponto e vírgula), aglutinando as informações na mesma célula no Excel, dificultando a leitura.

**Data:** 23/11/2026.

**Responsável:** João.

**Status:** Reprovado.

**Evidência:** bug_ct014_csv_delimitador_falho.png.

**Observação:** Foi identificada uma falha na formatação do arquivo CSV. Uma tarefa foi criada para a equipe de desenvolvimento backend realizar a correção.

## 9. Interface e responsividade

### CT015 — Responsividade em tela estreita

**Funcionalidade:** Interface responsiva.

**Objetivo:** Verificar se a aplicação pode ser utilizada em uma tela de celular.

**Pré-condição:** Acesso ao sistema por celular ou ferramenta de emulação do navegador.

**Passos:**

1. Abrir o sistema em uma largura aproximada de 390 pixels.
2. Navegar pelo painel.
3. Abrir listagens e formulários.
4. Observar menus, tabelas, botões e campos.

**Resultado esperado:** O conteúdo deve permanecer utilizável, sem cortes ou rolagem horizontal indevida da página. Menus, tabelas e formulários devem permitir interação.

**Resultado obtido:** Teste realizado com o Chrome DevTools, emulando um iPhone 12 Pro (390px de largura). O menu lateral foi devidamente oculto, trocado pelo ícone hambúrguer. A tabela da dashboard inseriu scroll horizontal interno em seu componente, não quebrando a página geral. Totalmente utilizável.

**Data:** 23/11/2026.

**Responsável:** Pedro.

**Status:** Aprovado.

## 10. Não conformidades

### CT016 — Consulta de não conformidade após tratamento

**Funcionalidade:** Não conformidades.

**Objetivo:** Verificar se o histórico de tratamento permanece disponível.

**Pré-condição:** Não conformidade de teste com possibilidade de atualização de status.

**Passos:**

1. Abrir uma não conformidade de teste.
2. Atualizar seu status seguindo as transições permitidas.
3. Consultar novamente o registro.
4. Verificar o histórico de alterações.

**Resultado esperado:** O status deve ser atualizado conforme as transições permitidas e o histórico deve registrar as alterações realizadas.

**Resultado obtido:** A não conformidade (NC-109) foi avançada de "Em Análise" para "Resolvida". Ao recarregar a visualização do registro, a aba "Histórico de Movimentações" listou a mudança, detalhando a hora exata da transição e o nome do usuário responsável pela ação.

**Data:** 23/11/2026.

**Responsável:** João.

**Status:** Aprovado.

## 11. Observações sobre autenticação

A versão publicada descrita no README abre diretamente no painel, sem tela de login.

Por esse motivo, os casos CT001 e CT002 verificam o acesso inicial e o recarregamento da aplicação.

Os testes de credenciais, logout e permissões pela interface devem ser adicionados quando a tela de autenticação estiver disponível.

As regras do backend podem ser validadas separadamente pela equipe técnica.

## 12. Considerações finais

Os casos de teste apresentados neste documento abrangem as principais funcionalidades do Sistema Inteligente de Controle de Qualidade, incluindo acesso, gerenciamento de produtos, cadastro de inspetores, checklists, inspeções, evidências, histórico, relatórios e responsividade.

Durante os testes, foi identificada uma falha na exportação CSV (CT014), relacionada à separação das colunas no arquivo gerado. Os demais casos apresentados obtiveram resultados aprovados.

Este documento deve ser atualizado sempre que novos testes forem realizados, funcionalidades forem modificadas ou falhas forem corrigidas.
