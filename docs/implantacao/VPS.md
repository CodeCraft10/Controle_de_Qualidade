# Hospedagem já configurada na raiz do projeto

Se o Nginx já aponta para `/home/codecraft/www`, o `index.php` da raiz encaminha
para a aplicação integrada. Não precisa alterar Nginx nem criar links simbólicos.
Como o frontend já foi compilado nesta VPS, esta atualização exige somente:

```sh
cd /home/codecraft/www
git pull origin main
```

Abra `https://codecraft.devlook.xyz/`. Exibir a tela inicial não exige criar uma
conta; a conta é apenas para acessar as funções protegidas do sistema.
Se o frontend mudar em atualizações futuras, compile com `cd frontend && npm ci && npm run build`.

Em PHP nativo, novos dados ficam por padrão em uma pasta `.gp4/` **ao lado** do
repositório, fora da raiz publicada. Não configure `STORAGE_PATH` dentro da pasta
servida pelo Nginx. Se já houver dados em `backend/var/state.json` da versão anterior,
pare a aplicação e transfira-os para um caminho privado, configurando esse caminho
absoluto no `backend/.env`; não deixe a cópia antiga na raiz publicada. Não há
migração automática nem remoção de dados existentes.

A instalação Docker e a configuração com `public/` como DocumentRoot continuam
suportadas e estão descritas abaixo.

# Executar o sistema integrado na sua VPS

A entrada é **`public/index.php`**. Ela entrega o frontend compilado e encaminha
`/api/*` ao PHP. A interface abre em `/` ou `/index.php`, com navegação por hash.
Frontend e API usam a mesma origem; não é necessário configurar CORS ou abrir
uma segunda porta. O frontend já está ligado à API real.

## Opção recomendada: Docker Compose

Requisitos: Git, Docker Engine e plugin Docker Compose na VPS. Node e PHP são
instalados nas etapas da imagem; não precisam ser instalados no host.

```sh
git clone https://github.com/CodeCraft10/Controle_de_Qualidade.git
cd Controle_de_Qualidade
cp .env.example .env
```

Para abrir diretamente pelo IP da sua VPS privada, edite `.env`:

```dotenv
APP_BIND=0.0.0.0
APP_PORT=8080
```

Inicie e crie a primeira conta:

```sh
docker compose up -d --build
docker compose exec --user www-data app php backend/bin/create-admin.php
```

O assistente pede nome, email e senha de 12 a 72 bytes. Não existe senha padrão.
A senha digitada no terminal é visível; use um terminal privado. O bootstrap só
funciona com o armazenamento vazio. As contas seguintes são criadas pelo administrador
na tela **Inspetores**. Entre com o email e a senha que acabou de definir.

Abra no navegador:

```text
http://IP_DA_SUA_VPS:8080/
```

`http://IP_DA_SUA_VPS:8080/index.php` também funciona. Se não abrir, confira a regra
da porta 8080 no firewall da VPS/provedor. Não exponha a porta no firewall se quiser
acesso exclusivamente via VPN/túnel. Para usar um proxy HTTPS, mantenha
`APP_BIND=127.0.0.1` e encaminhe o domínio à porta 8080. Use HTTPS ao transmitir
credenciais fora de uma rede privada; o Compose não provisiona domínio/certificado.

```sh
docker compose ps
docker compose logs --tail=100 app
curl http://127.0.0.1:8080/api/health
```

A resposta de saúde deve indicar `status: ok`. O status `healthy` verifica a API;
não cria conta automaticamente.

## O que demonstrar pela interface

1. Entre com o administrador e abra **Produtos** para cadastrar uma peça.
2. Em **Critérios**, crie o critério de inspeção.
3. Em **Checklists**, crie o checklist e adicione o critério. Um checklist vazio
   é um rascunho e não pode iniciar uma inspeção.
4. Em **Lotes**, escolha o produto, a quantidade e a data de fabricação.
5. Em **Inspeções**, abra uma inspeção com esse lote/checklist e salve a resposta.
6. Para resultado não conforme, registre o desvio e anexe a foto antes de finalizar.
7. Revise e confirme a conclusão. Confira o lote, o dashboard, o histórico e o CSV.
8. Em **Inspetores**, crie uma conta de inspetor para demonstrar as restrições.

Cada lote tem uma inspeção nesta versão. Para demonstrar outro resultado, crie outro
lote. O inspetor acessa somente suas inspeções; os gestores acessam todas.

## Persistência, atualização e backup

O volume `gp4-state` guarda `backend/var/state.json`, com contas, sessões, cadastros,
inspeções, auditoria e fotos. `docker compose down` preserva os dados. **Não use
`docker compose down -v` para atualizar:** `-v` remove os dados.

```sh
git pull --ff-only
docker compose up -d --build
```

Faça backup com a aplicação parada para obter uma cópia consistente:

```sh
mkdir -p backups
docker compose stop app
docker compose cp app:/var/www/html/backend/var/state.json backups/state.json
docker compose start app
chmod 600 backups/state.json
```

Proteja esse backup: ele contém hashes de senhas e fotos. Para restaurar, pare a
aplicação, copie o arquivo de volta com `docker compose cp`, ajuste a posse para
`www-data:www-data` caso necessário e inicie novamente. Não coloque backups no Git.

O armazenamento continua sendo **JSON local**, adequado à demonstração privada e
pequeno volume em uma instância. A integração com PostgreSQL permanece futura;
não escale esse volume para vários servidores. A memória usada cresce com o estado
e com as fotos (armazenadas em base64). A imagem limita PHP a 256 MiB.

## Sem Docker: PHP local ou Nginx/PHP-FPM

Para testar localmente com PHP 8.2+, Fileinfo e Node 22.12+:

```sh
cd frontend
npm ci
npm run build
cd ..
php backend/bin/create-admin.php
php -d upload_max_filesize=5M -d post_max_size=6M -S 127.0.0.1:8000 -t public public/index.php
```

Abra `http://127.0.0.1:8000/`. O servidor embutido é apenas para teste local.
Em uma VPS sem Docker, use Nginx/Apache com PHP-FPM/mod_php. O exemplo
[`deploy/nginx.conf`](../../deploy/nginx.conf) usa PHP 8.3-FPM; ajuste caminho,
socket e domínio para a instalação real. Configure `upload_max_filesize=5M` e
`post_max_size=6M` no PHP-FPM, habilite Fileinfo e reinicie o serviço.

O usuário do PHP deve poder escrever em `backend/var/`:

```sh
sudo chown -R www-data:www-data backend/var
sudo chmod 700 backend/var
sudo -u www-data php backend/bin/create-admin.php
```

O `DocumentRoot` precisa ser a pasta **`public/`**, nunca a raiz do repositório.
A compilação em `frontend/dist/` fica fora da raiz pública e é servida pelo index.
Em Apache, habilite `mod_rewrite` e `AllowOverride All` para usar `public/.htaccess`.

## Testes reproduzíveis

```sh
php backend/tests/run.php
php backend/tests/http.php
php backend/tests/concurrency.php
python3 tests/entrypoint.py
cd frontend
npm ci
npx playwright install --with-deps chromium
npm test
```

Use `PHP_BIN=/caminho/php` se o executável não estiver no PATH. Para validar a imagem
Apache sem modificar dados da instalação:

```sh
docker build -t gp4-integrado .
python3 tests/entrypoint.py --docker-image gp4-integrado
```

O smoke cria um contêiner descartável com porta aleatória, uma conta sintética e
verifica login, cadastro, logout, assets e bloqueio de arquivos privados. Os testes
de navegador usam estado temporário e não acessam o volume da sua VPS.

## Testar sem preencher o login

O modo demonstração abre o painel automaticamente como administrador de teste.
Ele fica **desligado por padrão**. Para ativar na hospedagem PHP/Nginx existente:

```sh
cd /home/codecraft/www
git pull origin main
(cd frontend && npm run build)
php backend/bin/demo.php on
```

Recarregue `https://codecraft.devlook.xyz/`. Não é preciso criar conta. Um aviso
identifica a demonstração. Enquanto estiver ligada, qualquer pessoa que acessar
o domínio poderá usar as funções de teste; use somente dados fictícios.

Para voltar a exigir login:

```sh
php backend/bin/demo.php off
```

Recarregue a página. Tokens da demonstração são recusados após desligá-la. A
conta normal, se ainda não existir, pode ser criada pelo `create-admin.php` quando
a demonstração estiver desligada.

A configuração fica em `backend/.env`, ignorado pelo Git; o comando preserva
as outras variáveis. Uma variável `DEMO_MODE` definida no ambiente do servidor tem
prioridade sobre esse arquivo. O frontend precisa ser recompilado nesta atualização
porque a entrada automática foi adicionada à interface; alternar on/off depois
não exige recompilar nem reiniciar o Nginx.

Dados e contas de demonstração usam um arquivo separado, com sufixo `.demo.json`,
e não alteram os registros normais. Ao desligar, a API volta ao armazenamento
normal; os dados de teste continuam guardados para uma próxima demonstração.
O modo não fornece senha compartilhada nem remove a autenticação do código.

Em Docker Compose, defina `DEMO_MODE=true` no `.env` da raiz e execute
`docker compose up -d`; para restaurar, use `DEMO_MODE=false` e repita o comando.
O volume persistente contém os dois estados separados. Não use o comando de
edição de arquivo dentro do contêiner para configurar o Compose.
