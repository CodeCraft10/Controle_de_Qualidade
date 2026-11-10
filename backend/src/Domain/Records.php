<?php
declare(strict_types=1);
namespace GP4\Domain;
use GP4\Http\ApiError;
final class Records {
    public static function now(): string { return gmdate('Y-m-d\TH:i:s\Z'); }
    public static function add(array &$s, string $table, array $row): array {
        $id = ($s['seq'][$table] ?? 0) + 1; $s['seq'][$table] = $id;
        $row = ['id' => $id, ...$row, 'criado_em' => self::now()];
        $s[$table][$id] = $row; return $row;
    }
    public static function get(array $s, string $table, int $id): array {
        return $s[$table][$id] ?? throw new ApiError(404, 'Registro não encontrado');
    }
    public static function active(array $s, string $table, int $id): array {
        $row = self::get($s, $table, $id);
        if (!$row['ativo']) throw new ApiError(409, 'Registro relacionado inativo');
        return $row;
    }
    public static function unique(array $s, string $table, string $key, string $value, int $except = 0): void {
        foreach ($s[$table] as $row) if ($row['id'] !== $except && strtolower($row[$key]) === strtolower($value)) throw new ApiError(409, "$key já cadastrado");
    }
    public static function audit(array &$s, int $user, string $action, string $resource, int $id): void {
        self::add($s, 'auditoria', ['usuario_id' => $user, 'acao' => $action, 'recurso' => $resource, 'recurso_id' => $id]);
    }
}
