<?php
declare(strict_types=1);
namespace GP4\Storage;
use PDO;
use RuntimeException;
use Throwable;

/** Adaptador transacional temporário até a persistência relacional por entidade. */
final class PostgresStore implements Store {
    public function __construct(private readonly PDO $pdo) {}
    public function transaction(callable $callback): mixed {
        if ($this->pdo->inTransaction()) throw new RuntimeException('nested transaction is not supported');
        $this->pdo->beginTransaction();
        try {
            $payload = $this->pdo->query('SELECT payload FROM gp4.api_state WHERE id = 1 FOR UPDATE')->fetchColumn();
            if ($payload === false) throw new RuntimeException('API state is missing; apply PostgreSQL migrations');
            $state = json_decode((string)$payload, true, 512, JSON_THROW_ON_ERROR);
            if (!is_array($state) || !isset($state['seq']) || !is_array($state['seq'])) throw new RuntimeException('invalid PostgreSQL application state');
            $before = $state;
            $result = $callback($state);
            if ($before !== $state) {
                $update = $this->pdo->prepare('UPDATE gp4.api_state SET payload = CAST(? AS jsonb), updated_at = now() WHERE id = 1');
                $update->execute([json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE)]);
            }
            $this->pdo->commit();
            return $result;
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
    }
}
