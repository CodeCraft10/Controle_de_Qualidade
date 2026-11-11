<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';

if (!extension_loaded('pdo_pgsql')) {
    fwrite(STDERR, "Extensão pdo_pgsql não habilitada.\n");
    exit(1);
}
$dsn = getenv('DATABASE_DSN') ?: '';
if (!str_starts_with($dsn, 'pgsql:')) {
    fwrite(STDERR, "Configure DATABASE_DSN com o driver pgsql.\n");
    exit(1);
}

$pdo = new PDO($dsn, getenv('DATABASE_USER') ?: '', getenv('DATABASE_PASSWORD') ?: '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version varchar(120) PRIMARY KEY, aplicado_em timestamptz NOT NULL DEFAULT now())');
$files = glob(dirname(__DIR__) . '/database/migrations/*.sql') ?: [];
sort($files, SORT_STRING);
foreach ($files as $file) {
    $version = basename($file, '.sql');
    $check = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE version = :version');
    $check->execute(['version' => $version]);
    if ($check->fetchColumn()) continue;

    $sql = file_get_contents($file);
    if ($sql === false) throw new RuntimeException("Não foi possível ler migration: $version");
    $pdo->beginTransaction();
    try {
        $pdo->query("SELECT pg_advisory_xact_lock(hashtext('gp4-schema-migrations'))");
        // Recheck after acquiring the lock so concurrent deploys remain safe.
        $check->execute(['version' => $version]);
        if (!$check->fetchColumn()) {
            $pdo->exec($sql);
            $insert = $pdo->prepare('INSERT INTO schema_migrations (version) VALUES (:version)');
            $insert->execute(['version' => $version]);
            fwrite(STDOUT, "Aplicada: $version\n");
        }
        $pdo->commit();
    } catch (Throwable $error) {
        if ($pdo->inTransaction()) $pdo->rollBack();
        throw $error;
    }
}
