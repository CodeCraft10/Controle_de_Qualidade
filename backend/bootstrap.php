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
    // Em hospedagem nativa, dados privados ficam fora da pasta publicada.
    // Docker usa STORAGE_PATH explícito no volume persistente.
    $project = realpath(dirname(__DIR__));
    $default = dirname($project) . '/.gp4/' . hash('sha256', $project) . '/state.json';
    $path = getenv('STORAGE_PATH') ?: $default;
    if (!str_starts_with($path, '/')) $path = __DIR__ . '/' . $path;
    $documentRoot = realpath($_SERVER['DOCUMENT_ROOT'] ?? '') ?: null;
    $parent = dirname($path);
    while (!is_dir($parent) && $parent !== dirname($parent)) $parent = dirname($parent);
    $normalizedParent = realpath($parent);
    if ($documentRoot === $project && $normalizedParent &&
        ($normalizedParent === $project || str_starts_with($normalizedParent, $project . DIRECTORY_SEPARATOR))) {
        throw new \RuntimeException('Armazenamento deve ficar fora da raiz pública');
    }
    return new \GP4\Storage\JsonStore($path);
}
