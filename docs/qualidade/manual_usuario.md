# Manual do Usuário
## Sistema Inteligente de Controle de Qualidade

## 1. Apresentação

O Sistema Inteligente de Controle de Qualidade auxilia o gerenciamento de produtos, lotes, inspeções, checklists, não conformidades e relatórios. Seu objetivo é centralizar informações e facilitar o acompanhamento da qualidade.

## 2. Acesso ao sistema

1. Abra o navegador.
2. Acesse: https://codecraft.devlook.xyz/
3. Aguarde o carregamento do painel inicial.
4. Utilize o menu de navegação para acessar as áreas disponíveis.

**Observação:** a versão publicada descrita na documentação do projeto está temporariamente sem tela de login e abre diretamente no painel. Utilize somente os dados fictícios disponibilizados para demonstração.

## 3. Navegação geral

O sistema reúne áreas de gerenciamento de cadastros, inspeções, não conformidades e relatórios. Os nomes e a disposição dos menus podem mudar conforme a evolução da interface.

Antes de realizar qualquer operação, confira se está na área correta e utilize registros fictícios no ambiente de demonstração.

## 4. Produtos

A área de produtos é destinada ao gerenciamento dos produtos que poderão ser associados aos lotes e às inspeções.

Fluxo geral:
1. Acesse a área de Produtos pelo menu.
2. Consulte os registros disponíveis.
3. Para cadastrar, utilize a ação de novo cadastro, se disponível.
4. Preencha os campos obrigatórios.
5. Salve e confira se o registro aparece na listagem.

Cadastros utilizados por outros registros podem ser desativados, em vez de apagados definitivamente. A desativação preserva referências e histórico.

## 5. Lotes

Os lotes identificam conjuntos de produtos que serão acompanhados pelo controle de qualidade.

Fluxo geral:
1. Acesse a área de Lotes.
2. Consulte os lotes cadastrados.
3. Para criar um lote, utilize a ação de novo cadastro, se disponível.
4. Selecione ou informe o produto relacionado.
5. Preencha os demais campos obrigatórios e salve.
6. Confira o registro na listagem.

A quantidade do lote deve respeitar as regras de validação do sistema.

## 6. Inspetores e contas

A área de inspetores/contas permite consultar e, conforme a permissão disponível, cadastrar ou gerenciar os usuários relacionados às inspeções.

O sistema prevê perfis de acesso diferentes. As operações disponíveis podem variar conforme o perfil. Não compartilhe credenciais ou dados de acesso.

## 7. Critérios e checklists

Os critérios representam os itens que serão avaliados durante uma inspeção. Os checklists agrupam critérios para orientar a verificação.

Fluxo geral:
1. Cadastre ou consulte os critérios necessários.
2. Acesse a área de Checklists.
3. Crie um checklist, se a ação estiver disponível.
4. Informe os dados obrigatórios.
5. Adicione os critérios ativos desejados.
6. Salve e consulte o checklist.

A abertura de uma inspeção exige um checklist ativo com pelo menos um critério.

## 8. Realização de inspeções

Fluxo geral:
1. Acesse a área de Inspeções.
2. Inicie uma nova inspeção, se a opção estiver disponível.
3. Selecione um lote e um checklist ativos.
4. Confira os dados apresentados.
5. Avalie cada critério e registre a resposta correspondente.
6. Preencha justificativas quando solicitadas.
7. Registre uma não conformidade para cada resposta não conforme.
8. Confira se todos os itens obrigatórios foram respondidos.
9. Finalize a inspeção quando todas as validações estiverem atendidas.

As respostas previstas incluem conforme, não conforme e não aplicável. Uma resposta não aplicável exige justificativa. A inspeção não deve ser finalizada com itens obrigatórios sem resposta.

## 9. Não conformidades

Uma não conformidade registra um desvio identificado durante a inspeção.

Fluxo geral:
1. Acesse a não conformidade vinculada à inspeção.
2. Consulte sua descrição e classificação.
3. Registre as informações solicitadas.
4. Anexe evidências, quando necessário e permitido.
5. Acompanhe o tratamento e as atualizações de status.

As transições previstas são: aberta, em tratamento e resolvida. O histórico de alterações deve permanecer disponível.

## 10. Evidências fotográficas

O sistema aceita imagens JPEG, PNG e WebP, respeitando os limites definidos pelo backend: até 5 MiB por arquivo, até 40 milhões de pixels e até 10 fotos por não conformidade.

1. Abra a não conformidade correspondente.
2. Acesse a área de evidências.
3. Selecione uma imagem permitida.
4. Envie o arquivo.
5. Verifique se a imagem aparece para consulta.

O acesso às evidências exige autorização. Não utilize fotos com dados pessoais ou informações confidenciais no ambiente de demonstração.

## 11. Histórico, painel e relatórios

O painel apresenta indicadores relacionados às inspeções. O histórico e os relatórios permitem consultar registros e aplicar filtros disponíveis.

1. Acesse o painel ou a área de relatórios.
2. Selecione os filtros desejados, quando disponíveis.
3. Confira se os resultados correspondem aos filtros.
4. Utilize a opção de exportação CSV, se disponível.
5. Abra o arquivo exportado e confira os dados.

A exportação CSV pode respeitar a página solicitada e o limite de registros definido pela API.

## 12. Boas práticas

- Utilize somente dados fictícios no ambiente de demonstração.
- Confira os dados antes de salvar ou finalizar uma inspeção.
- Preencha justificativas quando solicitadas.
- Não tente utilizar cadastros inativos em novas inspeções.
- Preserve o histórico; não tente apagar registros diretamente no banco.
- Comunique erros à equipe responsável, informando os passos para reproduzi-los.
- Ao enviar um relato de problema, inclua uma captura de tela sem credenciais ou informações pessoais.

## 13. Suporte

Em caso de dúvida ou comportamento inesperado, comunique a equipe do projeto informando:
- Área em que ocorreu o problema.
- Passos realizados.
- Resultado esperado.
- Resultado observado.
- Captura de tela, se possível.

Este manual deve ser revisado sempre que a interface ou o fluxo de uso forem alterados.
