<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
use GP4\Domain\Auth;
use GP4\Http\ApiError;
if (PHP_SAPI !== 'cli') exit(1);
// Senha lida de STDIN: não fica no histórico dos argumentos do processo.
fwrite(STDOUT, "Nome: "); $name = trim(fgets(STDIN) ?: '');
fwrite(STDOUT, "Email: "); $email = trim(fgets(STDIN) ?: '');
fwrite(STDOUT, "Senha (12–72 bytes; entrada visível, não compartilhe o terminal): "); $password = rtrim(fgets(STDIN) ?: '', "\r\n");
try {
    $user = gp4_store()->transaction(function (array &$s) use ($name, $email, $password) {
        if ($s['usuarios']) throw new ApiError(409, 'Bootstrap já realizado; use a API como administrador');
        return Auth::create($s, ['nome' => $name, 'email' => $email, 'senha' => $password, 'perfil' => 'admin']);
    });
    fwrite(STDOUT, "\nAdministrador criado (id " . $user['id'] . ").\n");
} catch (ApiError $e) { fwrite(STDERR, $e->getMessage() . "\n"); exit(1); }
