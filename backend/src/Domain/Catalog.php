<?php
declare(strict_types=1);
namespace GP4\Domain;
use GP4\Http\ApiError;
final class Catalog {
    public static function save(array &$s, array $u, string $table, array $body, ?int $id = null): array {
        Auth::role($u, $table === 'usuarios' ? ['admin'] : ['admin', 'supervisor']);
        if ($id === null) {
            if ($table === 'usuarios') {
                $row = Auth::create($s, $body);
            } else {
                $row = self::fields($s, $table, $body);
                $row = Records::add($s, $table, [...$row, 'ativo' => true]);
            }
        } else {
            $old = Records::get($s, $table, $id);
            $allowed = $table === 'usuarios' ? ['nome', 'email', 'perfil', 'senha', 'ativo'] : match($table) {
                'produtos' => ['codigo', 'nome', 'descricao', 'ativo'],
                'lotes' => ['codigo', 'produto_id', 'quantidade', 'data_fabricacao', 'ativo'],
                'criterios' => ['nome', 'descricao', 'ativo'],
                'checklists' => ['nome', 'descricao', 'itens', 'ativo'],
            };
            foreach ($body as $key => $_) if (!in_array($key, $allowed, true)) throw new ApiError(422, 'Campo não editável: ' . $key);
            $activeOnly = array_keys($body) === ['ativo'];
            if (!$activeOnly && self::used($s, $table, $id)) throw new ApiError(409, 'Cadastro em uso: desative e crie nova versão');
            if ($table === 'usuarios') {
                $row = $old;
                if (isset($body['nome'])) $row['nome'] = Rules::text($body['nome'], 'nome');
                if (isset($body['email'])) {
                    $row['email'] = Rules::email($body['email']); Records::unique($s, $table, 'email', $row['email'], $id);
                }
                if (isset($body['perfil'])) $row['perfil'] = Rules::choice($body['perfil'], ['admin', 'supervisor', 'inspetor'], 'perfil');
                if (isset($body['senha'])) $row['senha_hash'] = password_hash(Rules::password($body['senha']), PASSWORD_BCRYPT, ['cost' => 12]);
            } else {
                $row = $activeOnly ? $old : [...$old, ...self::fields($s, $table, [...$old, ...$body], $id)];
            }
            if (array_key_exists('ativo', $body)) $row['ativo'] = Rules::boolean($body['ativo']);
            if ($table === 'usuarios') {
                if ($old['perfil'] === 'admin' && $old['ativo'] && ($row['perfil'] !== 'admin' || !$row['ativo'])) {
                    $admins = array_filter($s['usuarios'], fn($v) => $v['ativo'] && $v['perfil'] === 'admin' && $v['id'] !== $id);
                    if (!$admins) throw new ApiError(409, 'Mantenha ao menos um administrador ativo');
                }
                foreach ($s['tokens'] as $key => $session) if ($session['usuario_id'] === $id) unset($s['tokens'][$key]);
            }
            $s[$table][$id] = $row;
        }
        Records::audit($s, $u['id'], $id === null ? 'criar' : 'editar', $table, $row['id']);
        return $table === 'usuarios' ? Auth::publicUser($row) : $row;
    }
    private static function fields(array &$s, string $table, array $b, int $id = 0): array {
        $row = [];
        if ($table !== 'lotes') $row['nome'] = Rules::text($b['nome'] ?? null, 'nome');
        if ($table !== 'lotes') {
            $description = $b['descricao'] ?? '';
            if (!is_string($description) || strlen($description) > 3000) throw new ApiError(422, 'Descrição inválida');
            $row['descricao'] = trim($description);
        }
        if (in_array($table, ['produtos', 'lotes'], true)) $row['codigo'] = Rules::text($b['codigo'] ?? null, 'codigo', 80);
        $unique = in_array($table, ['produtos', 'lotes'], true) ? 'codigo' : 'nome';
        Records::unique($s, $table, $unique, $row[$unique], $id);
        if ($table === 'lotes') {
            $row['produto_id'] = Rules::id($b['produto_id'] ?? null); Records::active($s, 'produtos', $row['produto_id']);
            $row['quantidade'] = Rules::id($b['quantidade'] ?? null);
            $row['data_fabricacao'] = Rules::date($b['data_fabricacao'] ?? null);
            if ($id === 0) $row['status'] = 'pendente';
        }
        if ($table === 'checklists') {
            $items = $b['itens'] ?? null;
            if (!is_array($items) || !array_is_list($items) || !$items || count($items) > 200) throw new ApiError(422, 'Checklist deve ter de 1 a 200 itens');
            $seen = []; $row['itens'] = [];
            foreach ($items as $item) {
                if (!is_array($item)) throw new ApiError(422, 'Item inválido');
                $criterion = Rules::id($item['criterio_id'] ?? null); Records::active($s, 'criterios', $criterion);
                if (isset($seen[$criterion])) throw new ApiError(409, 'Critério duplicado no checklist');
                $seen[$criterion] = true;
                $row['itens'][] = ['id' => count($row['itens']) + 1, 'criterio_id' => $criterion, 'obrigatorio' => Rules::boolean($item['obrigatorio'] ?? true)];
            }
        }
        return $row;
    }
    private static function used(array $s, string $table, int $id): bool {
        if ($table === 'usuarios') return false;
        if ($table === 'produtos' && array_filter($s['lotes'], fn($l) => $l['produto_id'] === $id)) return true;
        if ($table === 'criterios') foreach ($s['checklists'] as $c) foreach ($c['itens'] as $item) if ($item['criterio_id'] === $id) return true;
        foreach ($s['inspecoes'] as $i) if (($table === 'lotes' && $i['lote_id'] === $id) || ($table === 'checklists' && $i['checklist_id'] === $id)) return true;
        return false;
    }
}
