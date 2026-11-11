> A interface atual é uma versão aberta de testes: não existe tela de login e
> não é preciso criar conta para usar o painel. Os serviços de credenciais da API
> permanecem no backend para evolução futura. O antigo comando demo.php foi removido.
> Consulte [publicação na VPS](../docs/implantacao/VPS.md).

# Backend PHP — Controle de Qualidade

API do escopo de Pedro (B01–B07), baseada no `GP4_Plano_Detalhado_Pedro.pdf`.
PHP 8.2 ou superior, extensões JSON e Fileinfo. Para MySQL, habilite também `pdo_mysql`.
Sem dependências externas de runtime; Composer é opcional. O frontend está integrado pela entrada
`public/index.php` na raiz do projeto; veja [instalação na VPS](../docs/implantacao/VPS.md).

## Iniciar localmente

Na raiz do repositório:

```sh
cd backend
cp .env.example .env
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

Sem `DATABASE_DSN`, resposta: `{"status":"ok","storage":"json-local","integracoes":false}`.
Com `DATABASE_DSN` MySQL configurado e migrations aplicadas, `storage` será `mysql`.
Somente `public/` pode ser a raiz pública. O roteador não serve arquivos arbitrários.
O servidor embutido é para desenvolvimento local.

## Executar com Docker

```sh
docker build -t gp4-backend .
docker volume create gp4-state
docker run --rm -it -v gp4-state:/app/var gp4-backend docker run --rm -p 127.0.0.1:8000:8000 -v gp4-state:/app/var gp4-backend
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

## Armazenamento

Sem `DATABASE_DSN`, `var/state.json` guarda cadastros, inspeções, sessões, auditoria
e fotos em base64, com lock e gravação atômica. Com `DATABASE_DSN=mysql:...`, a API
usa MySQL; aplique antes as migrations em `database/migrations/`. O adaptador atual
carrega o estado completo sob uma transação e lock global para manter compatibilidade
com os serviços PHP existentes. É adequado para demonstração e volume pequeno; para
uso maior, a API precisa migrar para consultas específicas. As fotos ficam em BLOB.

Para importar o arquivo JSON, configure `DATABASE_DSN`, `DATABASE_USER` e
`DATABASE_PASSWORD` e execute `php bin/import-json.php <caminho-do-json>`. O
importador exige o caminho explícito, recusa banco com registros e mantém intacto o
arquivo de origem. Faça uma cópia privada do JSON antes da migração.
