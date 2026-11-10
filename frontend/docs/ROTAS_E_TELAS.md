# Rotas e esboços das telas

As rotas usam o fragmento da URL para funcionar em hospedagem estática. `:id` representa o identificador opaco retornado pela API; não deve ser convertido para número no cliente. O módulo **Inspetores** usa os endpoints `/usuarios`.

| Rota                                              | Tela e ações                                                              | Acesso                                              |
| ------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------- |
| `#/login`                                         | Entrada com e-mail e senha, falha de autenticação e estado de envio.      | Público                                             |
| `#/dashboard`                                     | Indicadores, filtros, distribuição de resultados e inspeções recentes.    | Autenticado                                         |
| `#/produtos` e `#/produtos/:id`                   | Lista, busca, cadastro, detalhes, edição e atividade de produtos.         | Consulta geral; manutenção por gestores             |
| `#/lotes` e `#/lotes/:id`                         | Lista, busca, cadastro e detalhes de lotes vinculados a produtos.         | Consulta geral; manutenção por gestores             |
| `#/inspetores` e `#/inspetores/:id`               | Consulta e manutenção de contas de inspeção.                              | Consulta por gestores; manutenção por administrador |
| `#/criterios` e `#/criterios/:id`                 | Lista, busca e manutenção dos critérios.                                  | Consulta geral; manutenção por gestores             |
| `#/checklists` e `#/checklists/:id`               | Lista, busca, manutenção e composição de itens.                           | Consulta geral; manutenção por gestores             |
| `#/inspecoes` e `#/inspecoes/:id`                 | Abertura, respostas, progresso, revisão e resultado.                      | Autenticado; edição conforme responsável/perfil     |
| `#/nao-conformidades` e `#/nao-conformidades/:id` | Consulta de desvios, classificação, evidências e histórico do tratamento. | Autenticado; ações conforme responsável/perfil      |
| `#/historico`                                     | Consulta filtrada e paginada das inspeções.                               | Autenticado                                         |
| `#/relatorios`                                    | Consulta e exportação CSV da página filtrada.                             | Autenticado                                         |
| `#/acesso-negado`                                 | Explicação de restrição e retorno à navegação permitida.                  | Autenticado                                         |
| Rota desconhecida                                 | Página não encontrada e caminho de retorno.                               | Conforme sessão                                     |

## Esboços de composição

Os esboços abaixo documentam a organização das informações. São wireframes, não capturas da execução nem dados de produção.

### Login

```text
+-------------------------------------------------------------+
| GP4 | Controle de Qualidade                                  |
|                                                             |
| Contexto do sistema           Acesse sua conta               |
| Escudo / identidade           E-mail [________________]      |
|                               Senha  [________________]      |
|                               [ Entrar ]                    |
|                               Mensagem de falha, se houver   |
+-------------------------------------------------------------+
```

### Dashboard e consultas

```text
+---------------+---------------------------------------------+
| GP4           | Título da página              Perfil / Sair |
| Dashboard     | Contexto / ação principal                   |
| Inspeções     | [Período] [Produto] [Lote] [Inspetor]        |
| Desvios       | [Situação] [Busca]       [Aplicar filtros]   |
|               |                                             |
| Cadastros     | [Indicador] [Indicador] [Indicador]          |
| ...           | [Distribuição dos resultados]               |
|               |                                             |
| Histórico     | Tabela de inspeções / estado vazio          |
| Relatórios    | [Anterior] Página / total [Próxima]          |
+---------------+---------------------------------------------+
```

### Cadastro e checklist

```text
+-------------------------------------------------------------+
| Voltar à lista               Nome do cadastro / identificação |
| Código [____________] Nome [____________________________]     |
| Descrição [____________________________________________]     |
| [Salvar] [Cancelar]               Ativo / Desativar          |
|                                                             |
| Itens do checklist                                          |
| Critério [selecionar]   [x] Obrigatório   [Adicionar]         |
| Critério / Obrigatoriedade                       [Remover]   |
+-------------------------------------------------------------+
```

### Inspeção e evidências

```text
+-------------------------------------------------------------+
| Inspeção / lote                Situação / progresso          |
| Produto, checklist, responsável, horários                    |
|                                                             |
| Critério e descrição                                        |
| Resultado [Conforme / Não conforme / Não aplicável]          |
| Observação [___________________________________________]     |
| [Salvar resposta]                                           |
|                                                             |
| Desvio: descrição / classificação / vínculo com resposta     |
| Foto [Escolher arquivo] [Enviar] Progresso / erro            |
| [Imagem autenticada]                                        |
|                                                             |
| [Revisar inspeção] -> Resumo -> [Confirmar finalização]      |
+-------------------------------------------------------------+
```

### Adaptação para celular

```text
+-------------------------------+
| Menu   GP4            Perfil  |
| Título da página              |
| [Ação principal]              |
| [Filtros em uma coluna]       |
| [Indicador]                   |
| [Indicador]                   |
| [Tabela com rolagem interna]  |
| [Anterior] [Próxima]          |
+-------------------------------+
```

## Sequência de demonstração

Use dados de teste identificados como tais em um banco de desenvolvimento. Com uma conta administradora, prepare produto, lote, critério e checklist. Entre como inspetor, abra a inspeção, salve uma resposta não conforme, cadastre seu desvio e envie uma foto de teste. Revise, finalize, consulte o resultado e abra o dashboard. Entre como supervisor para avançar o tratamento do desvio e verificar o histórico de transições. Exporte a página do relatório que contém a inspeção.

A demonstração deve usar a API e o banco reais. Uma foto enviada após a finalização deve ser recusada; um inspetor não deve editar inspeções de outro responsável. As capturas de navegador e os resultados do roteiro ficam registrados em [VALIDACAO.md](VALIDACAO.md).
