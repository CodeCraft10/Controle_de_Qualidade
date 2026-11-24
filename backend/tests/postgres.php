<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') exit(1);
require dirname(__DIR__) . '/bootstrap.php';
use GP4\Storage\PostgresStore;
if (!str_starts_with(getenv('DATABASE_DSN') ?: '', 'pgsql:')) {
    fwrite(STDERR, "Configure DATABASE_DSN=pgsql:... para executar o teste de integração.\n");
    exit(2);
}
$store = gp4_store();
if (!$store instanceof PostgresStore) throw new RuntimeException('PostgresStore não selecionado');
$before = $store->transaction(fn(array &$state) => $state);
try {
    $store->transaction(function (array &$state): void {
        $state['seq']['postgres_rollback_probe'] = 1;
        throw new RuntimeException('expected rollback');
    });
} catch (RuntimeException $e) {
    if ($e->getMessage() !== 'expected rollback') throw $e;
}
$after = $store->transaction(fn(array &$state) => $state);
if ($before !== $after) throw new RuntimeException('rollback did not preserve state');
echo "PostgreSQL transaction and rollback: OK\n";
