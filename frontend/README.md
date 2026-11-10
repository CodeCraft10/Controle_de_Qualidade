# Frontend — GP4

Interface HTML/CSS/JavaScript com Vite, integrada ao backend PHP. Login, cadastros,
inspeções, desvios, fotos, dashboard, histórico e CSV usam a API real em `/api`.

Para abrir tudo pelo mesmo index e instalar na VPS, siga o
[guia de implantação](../docs/implantacao/VPS.md). O Dockerfile da raiz compila
esta interface e a serve com PHP/Apache. Não use `vite preview` como servidor da API.

## Desenvolvimento

```sh
npm ci
npm run dev
```

Inicie também a API PHP em `127.0.0.1:8000` seguindo o README do backend. O proxy
do Vite encaminha `/api` a essa porta; `API_PROXY_TARGET` permite alterá-la.
`VITE_API_BASE_URL` é opcional e vale `/api` por padrão. Para implantação integrada,
use esse padrão: as chamadas permanecem na mesma origem.

## Build e testes

```sh
npm run build
npm run format:check
npx playwright install --with-deps chromium
npm test
```

`npm test` compila a interface e inicia `public/index.php` com PHP, em porta local
5173 e estado JSON temporário. PHP 8.2+ com Fileinfo deve estar no PATH, ou configure
`PHP_BIN`. Não há dependência de PostgreSQL ou do backend Node.js antigo.
Os testes incluem fluxo completo, permissões, celular, fotos, CSV e revogação de sessão.

Tokens ficam somente em memória; recarregar a página exige entrar novamente.
Logout revoga o token no servidor. Os perfis são verificados também na API.

## Demonstração

O servidor pode habilitar entrada automática sem preencher o login. A interface
consulta `/api/config`, obtém uma sessão de teste e mostra um aviso no painel.
Consulte [como ligar e desligar](../docs/implantacao/VPS.md#testar-sem-preencher-o-login).

Para executar os testes desse modo: `E2E_DEMO=1 npm test`. A fixture usa estado
separado e não cria contas nem modifica dados da VPS.
