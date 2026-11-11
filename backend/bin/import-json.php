<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';

$sourcePath = $argv[1] ?? '';
if ($sourcePath === '' || !is_file($sourcePath) || !is_readable($sourcePath)) {
    fwrite(STDERR, "Uso: php bin/import-json.php <caminho-do-arquivo-json>\n");
    exit(2);
}
if (!str_starts_with(getenv('DATABASE_DSN') ?: '', 'mysql:')) {
    fwrite(STDERR, "Configure DATABASE_DSN MySQL no ambiente ou em backend/.env.\n");
    exit(2);
}

try {
    $source = json_decode((string)file_get_contents($sourcePath), true, 512, JSON_THROW_ON_ERROR);
    $collections = ['usuarios', 'tokens', 'tentativas', 'produtos', 'lotes', 'criterios', 'checklists',
        'inspecoes', 'respostas', 'nao_conformidades', 'evidencias', 'auditoria'];
    if (!is_array($source) || !isset($source['seq']) || !is_array($source['seq'])) {
        throw new RuntimeException('JSON não contém um estado GP4 válido.');
    }
    foreach ($collections as $key) {
        if (!isset($source[$key]) || !is_array($source[$key])) throw new RuntimeException("Coleção ausente ou inválida: $key");
    }

    $result = gp4_store()->transaction(function (array &$state) use ($source, $collections): int {
        foreach ($collections as $key) {
            if (!empty($state[$key])) throw new RuntimeException('Importação cancelada: o banco já contém dados.');
        }
        $count = 0;
        foreach ($collections as $key) $count += count($source[$key]);
        $state = $source;
        return $count;
    });
    fwrite(STDOUT, "Importação concluída: $result registros. O arquivo JSON original foi mantido.\n");
} catch (Throwable $error) {
    fwrite(STDERR, "Importação não concluída: {$error->getMessage()}\n");
    exit(1);
}
