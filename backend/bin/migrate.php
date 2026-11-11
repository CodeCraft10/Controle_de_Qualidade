<?php
declare(strict_types=1);

if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';

if (!extension_loaded('pdo_mysql')) {
    fwrite(STDERR, "Extensão pdo_mysql não habilitada.\n");
    exit(1);
}
$dsn = getenv('DATABASE_DSN') ?: '';
if (!str_starts_with($dsn, 'mysql:')) {
    fwrite(STDERR, "Configure DATABASE_DSN com o driver mysql.\n");
    exit(1);
}

$pdo = new PDO($dsn, getenv('DATABASE_USER') ?: '', getenv('DATABASE_PASSWORD') ?: '', [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_EMULATE_PREPARES => false,
]);
$pdo->exec("SET time_zone = '+00:00'");
$pdo->exec('CREATE TABLE IF NOT EXISTS schema_migrations (version varchar(120) PRIMARY KEY, aplicado_em datetime(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4');
$lock = (int)$pdo->query("SELECT GET_LOCK('gp4_schema_migrations', 30)")->fetchColumn();
if ($lock !== 1) throw new RuntimeException('Não foi possível obter o lock de migrations.');
$files = glob(dirname(__DIR__) . '/database/migrations/*.sql') ?: [];
sort($files, SORT_STRING);
try {
    foreach ($files as $file) {
        $version = basename($file, '.sql');
        $check = $pdo->prepare('SELECT 1 FROM schema_migrations WHERE version = :version');
        $check->execute(['version' => $version]);
        if ($check->fetchColumn()) continue;

        $sql = file_get_contents($file);
        if ($sql === false) throw new RuntimeException("Não foi possível ler migration: $version");
        // The migration files contain no semicolons inside literals or procedures.
        foreach (preg_split('/;\s*(?:\r?\n|$)/', trim($sql)) ?: [] as $statement) {
            if (trim($statement) !== '') $pdo->exec($statement);
        }
        $insert = $pdo->prepare('INSERT INTO schema_migrations (version) VALUES (:version)');
        $insert->execute(['version' => $version]);
        fwrite(STDOUT, "Aplicada: $version\n");
    }
} finally {
    $pdo->query("SELECT RELEASE_LOCK('gp4_schema_migrations')");
}
