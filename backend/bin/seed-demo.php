<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';

if ((getenv('APP_ENV') ?: '') === 'production') {
    fwrite(STDERR, "Seed de demonstração bloqueado em APP_ENV=production.\n");
    exit(1);
}
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
$version = 'seed-001-demo';
$check = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE version = :version');
$check->execute(['version' => $version]);
if ($check->fetchColumn()) {
    fwrite(STDOUT, "Seed já aplicado.\n");
    exit(0);
}
$count = (int)$pdo->query('SELECT count(*) FROM usuarios')->fetchColumn();
if ($count > 0) {
    fwrite(STDERR, "Seed recusado: banco já contém usuários. Use um banco de desenvolvimento vazio.\n");
    exit(1);
}
$sql = file_get_contents(dirname(__DIR__) . '/database/seeds/001_demo_seed.sql');
if ($sql === false) throw new RuntimeException('Não foi possível ler o seed.');
$pdo->beginTransaction();
try {
    $pdo->exec($sql);
    $insert = $pdo->prepare('INSERT INTO schema_migrations(version) VALUES (:version)');
    $insert->execute(['version' => $version]);
    $pdo->commit();
    fwrite(STDOUT, "Seed fictício aplicado. Usuários: admin@gp4.invalid, supervisor@gp4.invalid e inspetor@gp4.invalid; senha: password.\n");
} catch (Throwable $error) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    throw $error;
}
