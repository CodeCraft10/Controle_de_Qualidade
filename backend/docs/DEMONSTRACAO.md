# Demonstração do backend sem banco e sem frontend

Inicie a API e crie a primeira conta conforme o README. Os comandos usam `curl`
no Bash; no PowerShell use `curl.exe` e adapte aspas/variáveis, ou use Postman/Insomnia.
Os IDs abaixo são exemplos de armazenamento inicialmente vazio: use os retornados
pela sua API se já houver cadastros. Não use dados pessoais reais na demonstração.

## 1. Login e tentativa sem permissão

```sh
curl -i http://127.0.0.1:8000/api/produtos
# Esperado: 401

curl -X POST http://127.0.0.1:8000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"SEU_EMAIL","senha":"SUA_SENHA"}'
```

Copie o token retornado para uma variável local, sem adicioná-lo ao Git:

```sh
read -r -s -p 'Token: ' TOKEN
```

Use o token de administrador para os cadastros abaixo. Crie um inspetor por
`POST /usuarios` e use seu login para demonstrar que ele recebe 403 ao cadastrar
produto e ao consultar inspeção alheia. Os testes automatizados cobrem essas tentativas.

## 2. Cadastros

```sh
curl -X POST http://127.0.0.1:8000/api/produtos \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"codigo":"P001","nome":"Peça A"}'

curl -X POST http://127.0.0.1:8000/api/lotes \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"codigo":"L001","produto_id":1,"quantidade":20,"data_fabricacao":"2026-11-10"}'

curl -X POST http://127.0.0.1:8000/api/criterios \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nome":"Acabamento","descricao":"Verificar riscos"}'

curl -X POST http://127.0.0.1:8000/api/checklists \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"nome":"Visual v1","itens":[{"criterio_id":1,"obrigatorio":true}]}'
```

## 3. Inspeção, resposta e desvio

```sh
curl -X POST http://127.0.0.1:8000/api/inspecoes \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"lote_id":1,"checklist_id":1}'

curl -X POST http://127.0.0.1:8000/api/inspecoes/1/finalizar \
  -H "Authorization: Bearer $TOKEN"
# Esperado: 409, faltam respostas

curl -X PUT http://127.0.0.1:8000/api/inspecoes/1/respostas/1 \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"resultado":"nao_conforme","observacao":"Risco na face superior"}'

curl -X POST http://127.0.0.1:8000/api/respostas/1/nao-conformidade \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"descricao":"Risco visível","classificacao":"menor"}'
```

## 4. Foto antes da finalização

```sh
curl -X POST http://127.0.0.1:8000/api/nao-conformidades/1/evidencias \
  -H "Authorization: Bearer $TOKEN" -F 'arquivo=@/caminho/para/foto.jpg'

curl http://127.0.0.1:8000/api/evidencias/1 \
  -H "Authorization: Bearer $TOKEN" -o foto-recuperada.jpg
```

Use uma foto JPEG, PNG ou WebP real de até 5 MiB. Não altere apenas a extensão de
um arquivo de outro tipo. A extensão do download deve corresponder ao MIME recebido.

## 5. Finalizar, consultar histórico e relatório

```sh
curl -X POST http://127.0.0.1:8000/api/inspecoes/1/finalizar \
  -H "Authorization: Bearer $TOKEN"
# Esperado: status reprovada

curl http://127.0.0.1:8000/api/historico \
  -H "Authorization: Bearer $TOKEN"

curl http://127.0.0.1:8000/api/indicadores \
  -H "Authorization: Bearer $TOKEN"

curl 'http://127.0.0.1:8000/api/relatorios/inspecoes.csv?page=1&limit=100' \
  -H "Authorization: Bearer $TOKEN" -o inspecoes.csv
```

Repita a finalização: deve retornar 409. Para demonstrar aprovação, crie outro
lote e inspeção, responda `conforme` e finalize. Para tratar o desvio como gestor,
envie PATCH em `/nao-conformidades/1` primeiro com `{"status":"em_tratamento"}`
e depois com `{"status":"resolvida"}`. Consulte o desvio para ver o histórico.
