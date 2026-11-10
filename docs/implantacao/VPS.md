# Publicar a versão temporária sem login

Esta versão abre diretamente no painel, sem formulário de acesso, sem criar conta
e sem ativar configuração. Qualquer pessoa com o link pode usar os dados de teste.
Não use dados reais nesta versão aberta. A autenticação da interface poderá ser
reintroduzida em uma etapa futura; o antigo comando `demo.php on/off` foi removido.

## VPS existente: codecraft.devlook.xyz

O Nginx já aponta para `/home/codecraft/www` e o PHP-FPM já funciona. Execute:

```sh
cd /home/codecraft/www
git pull origin main
```

Abra `https://codecraft.devlook.xyz/`. A URL antiga `/#/login` também encaminha ao
painel. Se a aba estiver aberta há algum tempo, atualize com Ctrl+Shift+R.

Não precisa de sudo, Docker, alteração no Nginx, criação de usuário ou recompilação.
A pasta **`web/`**, versionada no Git, contém a interface pronta. O index da raiz
encaminha a aplicação, os assets e `/api` pelo mesmo domínio.

Configurações antigas `DEMO_MODE=false` no ambiente ou no `backend/.env` não
reativam a tela removida. As outras configurações do backend continuam válidas.

## Dados persistentes

A versão aberta continua usando os dados de teste separados do modo anterior.
O arquivo ativo tem sufixo `.demo.json`; os registros normais anteriores não são
apagados nem modificados. Em PHP nativo, o caminho padrão fica em `.gp4/` ao lado
do repositório, fora da pasta publicada. `STORAGE_PATH`, quando configurado,
especifica o caminho base privado; o sufixo é acrescentado automaticamente.

Não configure dados privados dentro da raiz publicada. Para dados legados em
`backend/var/`, transfira-os para um caminho privado com a aplicação parada e
configure o caminho correspondente. Não há migração ou exclusão automática.

## Instalação opcional com Docker

Em uma VPS com Docker Engine e Compose:

```sh
git clone https://github.com/CodeCraft10/Controle_de_Qualidade.git
cd Controle_de_Qualidade
cp .env.example .env
# Edite APP_BIND=0.0.0.0 em .env para acesso direto pelo IP.
docker compose up -d --build
```

Abra `http://IP_DA_VPS:8080/`. O painel entra automaticamente. A imagem usa Apache
com `public/` como DocumentRoot e volume persistente. Para proxy HTTPS local,
mantenha `APP_BIND=127.0.0.1` e configure domínio/certificado no proxy.

Para atualizar: `git pull origin main` e `docker compose up -d --build`.
`docker compose down` preserva dados; `docker compose down -v` remove o volume.
O arquivo ativo no volume é `/var/www/html/backend/var/state.json.demo.json`.
Faça backup com a aplicação parada, mantenha a cópia privada e ajuste a posse para
`www-data` ao restaurar. O armazenamento JSON é para testes em uma instância;
PostgreSQL permanece uma integração futura.

## Desenvolvimento e testes

A interface pronta está em `web/`. Ao modificar os fontes, atualize e versione
esse build junto com o código:

```sh
cd frontend
npm ci
npm run build
npm test
```

A CI verifica se o build publicado corresponde aos fontes. `npm test` percorre
entrada direta, cadastro, inspeção, foto, relatório, recarga e celular contra PHP
real com dados temporários. A instalação na VPS não precisa executar esse build.

Para testar localmente sem Docker:

```sh
php -d upload_max_filesize=5M -d post_max_size=6M -S 127.0.0.1:8000 -t public public/index.php
```

Abra `http://127.0.0.1:8000/`. O servidor embutido é para teste local. O exemplo
`deploy/nginx.conf` continua disponível para instalação nativa com raiz `public/`.
