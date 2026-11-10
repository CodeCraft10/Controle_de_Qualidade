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
