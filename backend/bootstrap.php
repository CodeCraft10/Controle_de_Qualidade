<?php
declare(strict_types=1);

spl_autoload_register(function (string $class): void {
    $prefix = 'GP4\\';
    if (str_starts_with($class, $prefix)) {
        $file = __DIR__ . '/src/' . str_replace('\\', '/', substr($class, strlen($prefix))) . '.php';
        if (is_file($file)) require $file;
    }
});

// Valores do processo têm prioridade; parser simples, sem expansão de comandos.
if (is_file(__DIR__ . '/.env')) {
    foreach (file(__DIR__ . '/.env', FILE_IGNORE_NEW_LINES) as $line) {
        $line = trim($line);
        if ($line === '' || str_starts_with($line, '#') || !str_contains($line, '=')) continue;
        [$key, $value] = explode('=', $line, 2);
        if (preg_match('/^[A-Z_]+$/', $key) && getenv($key) === false) putenv($key . '=' . trim($value, " \t\"'"));
    }
}
date_default_timezone_set('UTC');
function gp4_store(): \GP4\Storage\JsonStore {
    $path = getenv('STORAGE_PATH') ?: 'var/state.json';
    if (!str_starts_with($path, '/')) $path = __DIR__ . '/' . $path;
    return new \GP4\Storage\JsonStore($path);
}
