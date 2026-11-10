# Validação atual: painel sem tela de login

A interface de login e os estilos exclusivos dessa tela foram removidos. O build
pronto é versionado em `web/`, permitindo atualização na VPS apenas com git pull.
A CI confere o build contra os fontes e testa os endpoints e o pacote Apache.

Os testes de navegador atuais cobrem entrada direta e recarga, compatibilidade
com a URL antiga /#/login, sessão automática, cadastro, inspeção, desvio, foto,
relatório, CSV, layout móvel e erro de rede recuperável. As regras de perfis e
credenciais continuam cobertas pelas suítes PHP, sem formulário de login no frontend.

`php backend/tests/demo.php` verifica acesso automático mesmo com configuração
antiga desligada, separação dos dados normais, continuidade dos registros de teste,
validação de sessão e revogação do token. Não há mais alternância por demo.php.

A instalação do servidor particular depende de executar git pull nessa máquina.
Os testes usam armazenamento temporário; nenhum acesso administrativo à VPS foi usado.
