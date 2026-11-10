# Frontend — GP4

Versão temporária aberta para testes. A página de login e seu formulário foram
removidos; o site abre direto no painel. A interface obtém automaticamente uma
sessão de teste da API PHP, sem email, senha ou ativação de configuração.

A pasta `web/` da raiz contém o build versionado. Para atualizar a VPS já configurada,
basta `git pull origin main`. O `index.php` entrega essa versão pronta, ignorando
builds antigos que possam existir em `frontend/dist/`.

## Desenvolvimento

```sh
npm ci
npm run dev
```

Inicie PHP em `127.0.0.1:8000`; o Vite encaminha `/api` a essa porta.

```sh
npm run build
npm run format:check
npx playwright install --with-deps chromium
npm test
```

O build atualiza `../web/`; versione-o junto com mudanças nos fontes. Os testes
iniciam PHP com armazenamento temporário e verificam entrada direta, recarga,
cadastro, inspeção, fotos, CSV e layout de celular. Configure `PHP_BIN` se o
executável PHP não estiver no PATH. Não há dependência de PostgreSQL.

Tokens temporários ficam somente em memória e são obtidos novamente ao recarregar.
As regras de negócio e validações da API continuam ativas. Esta versão é pública
para testes e não deve receber dados reais. Veja [VPS](../docs/implantacao/VPS.md).
