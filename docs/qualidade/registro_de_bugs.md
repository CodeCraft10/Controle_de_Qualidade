### BUG001 — Mensagem de erro não apresentada ao preencher formulário incorretamente

- **Data:** 17/11/26
- **Funcionalidade:** Cadastro de Produtos
- **Caso relacionado:** CT003
- **Gravidade:** Baixa
- **Responsável pela correção:** João
- **Status:** Resolvido

#### Descrição
Possibilidade de o sistema não apresentar uma mensagem clara quando o usuário tenta cadastrar um produto sem preencher os campos obrigatórios.

#### Resultado esperado
O sistema deve impedir o cadastro e informar quais campos precisam ser preenchidos.

#### Resultado obtido
O cadatro do sistema só é completo se todos os campos estiverem preenchidos.

---

### BUG002 — Filtro de registros não atualiza os resultados

- **Data:** 17/11/26
- **Funcionalidade:** Consulta de Produtos
- **Caso relacionado:** CT013
- **Gravidade:** Média
- **Responsável pela correção:** João
- **Status:** Resolvido

#### Descrição
Possibilidade de o filtro de pesquisa não atualizar corretamente a lista de produtos após a aplicação de um critério de busca.

#### Resultado esperado
A lista deve apresentar somente os registros correspondentes ao filtro selecionado.

#### Resultado obtido
A lista está atualizada com resultados.
---

### BUG003 — Sistema permite finalizar inspeção incompleta

- **Data:** 17/11/26
- **Funcionalidade:** Inspeções
- **Caso relacionado:** CT009
- **Gravidade:** Alta
- **Responsável pela correção:** João
- **Status:** Resolvido

#### Descrição
Possibilidade de o sistema permitir a finalização de uma inspeção mesmo quando existem critérios obrigatórios sem resposta.

#### Resultado esperado
O sistema deve impedir a finalização enquanto houver respostas obrigatórias pendentes.

#### Resultado obtido
Agora o sistema só permite a finalização se a inspeção estiver completa.

---

### BUG004 — Arquivo de evidência inválido é aceito

- **Data:** 18/11/26
- **Funcionalidade:** Envio de evidências
- **Caso relacionado:** CT012
- **Gravidade:** Média
- **Responsável pela correção:** João
- **Status:** Resolvido

#### Descrição
Possibilidade de o sistema aceitar arquivos em formatos não permitidos durante o envio de evidências de uma inspeção.

#### Resultado esperado
O sistema deve rejeitar arquivos que não atendam aos formatos e limites definidos nas regras do projeto.

#### Resultado obtido
Após o bug ser corrigido, o envio de evidências aceita os arquivos.
