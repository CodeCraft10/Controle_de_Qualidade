# Backend PHP — Controle de Qualidade

API do escopo de Pedro (B01–B07), baseada no `GP4_Plano_Detalhado_Pedro.pdf`.
PHP 8.2 ou superior, extensões JSON e Fileinfo. Sem dependências externas de runtime;
Composer é opcional. Não há conexão com banco de dados. O frontend está integrado pela entrada
`public/index.php` na raiz do projeto; veja [instalação na VPS](../docs/implantacao/VPS.md).

## Iniciar localmente

Na raiz do repositório:

```sh
cd backend
cp .env.example .env
php bin/create-admin.php
php -d upload_max_filesize=5M -d post_max_size=6M -S 127.0.0.1:8000 -t public public/index.php
```

No Windows/PowerShell, use `Copy-Item .env.example .env`. Instale PHP e habilite
`extension=fileinfo` no php.ini caso não esteja habilitada. Confira com `php -v`
e `php -m`. Execute todos os comandos desta página dentro de `backend/`.

O assistente de criação pede nome, email e senha de 12 a 72 bytes. A senha é
visível na entrada do terminal: execute em terminal privado. Não há conta ou senha
padrão. O comando só cria o primeiro usuário; as demais contas são criadas por
um administrador na API. O PHP deve ter permissão de escrita em `var/`.
O comando `composer start` também inicia a API, mas usa os limites padrão do php.ini;
para fotos de até 5 MiB, prefira o comando completo acima.

```sh
curl http://127.0.0.1:8000/api/health
```

Resposta: `{"status":"ok","storage":"json-local","integracoes":false}`.
Somente `public/` pode ser a raiz pública. O roteador não serve arquivos arbitrários.
O servidor embutido é para desenvolvimento local.

## Executar com Docker

```sh
docker build -t gp4-backend .
docker volume create gp4-state
docker run --rm -it -v gp4-state:/app/var gp4-backend php bin/create-admin.php
docker run --rm -p 127.0.0.1:8000:8000 -v gp4-state:/app/var gp4-backend
```

A imagem executa como `www-data`; o volume guarda o estado fora do ciclo de vida
do contêiner. `.env` e dados locais não entram na imagem. Para alterar configurações,
passe `--env-file .env` aos dois comandos `docker run`; mantenha `STORAGE_PATH=var/state.json`.

## Testar

```sh
php tests/run.php
php tests/http.php
php tests/concurrency.php
```

Ou `composer test`. Sem Composer:

```sh
docker run --rm gp4-backend php tests/run.php
docker run --rm gp4-backend php tests/http.php
docker run --rm gp4-backend php tests/concurrency.php
```

Os testes criam dados fictícios em diretórios temporários e os removem ao concluir;
não usam `var/state.json`. O teste HTTP inicia seu próprio servidor em uma porta
livre. São necessárias as funções `proc_open` e streams HTTP no PHP CLI.

## Organização

```text
bin/create-admin.php        primeira conta pelo terminal
bootstrap.php               autoload e configuração .env
public/index.php            entrada HTTP, parsing, cabeçalhos e erros
src/Http/                   roteamento da API
src/Domain/                 autenticação, cadastros, inspeções, evidências e consultas
src/Storage/Store.php        contrato transacional de armazenamento
src/Storage/JsonStore.php    adaptador local, lock e substituição atômica
var/                        estado privado, ignorado pelo Git
tests/                      regras, HTTP e concorrência
docs/                       contrato, decisões, demonstração e validação
```

## Documentação

- [Endpoints, payloads e permissões](docs/API.md)
- [Demonstração passo a passo](docs/DEMONSTRACAO.md)
- [Regras de negócio e rastreabilidade B01–B07](docs/REGRAS.md)
- [Integração futura com banco e frontend](docs/INTEGRACAO_FUTURA.md)
- [Evidências de validação](docs/VALIDACAO.md)

## Armazenamento nesta etapa

`var/state.json` guarda cadastros, inspeções, sessões, auditoria e fotos em base64.
Fotos e metadados são gravados na mesma transação para evitar registros quebrados.
Há bloqueio por arquivo separado (`.lock`), gravação em temporário e rename atômico;
se uma regra falhar, nenhuma alteração da operação é confirmada. Arquivo corrompido
causa erro, sem reinicialização silenciosa. Tokens são aleatórios, expiram após 8h
por padrão e só seu SHA-256 é armazenado. Senhas usam bcrypt com custo 12.

Isso permite executar e demonstrar o backend sem banco. Não equivale a PostgreSQL:
usa um único arquivo, carrega o estado completo e serializa as requisições. Use
apenas para desenvolvimento e dados de demonstração em uma instância/disco local;
não para volume industrial, múltiplos servidores ou filesystem de rede. As fotos
ocupam aproximadamente 33% a mais por causa do base64. Pare a API antes de copiar
`var/state.json` para backup/restauração; trate a cópia como dado privado.

A integração relacional exigida no projeto completo permanece pendente por escopo
desta entrega, conforme o pedido de desenvolver sem banco e frontend.
