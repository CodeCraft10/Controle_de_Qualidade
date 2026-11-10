<?php
declare(strict_types=1);
namespace GP4\Domain;
use GP4\Http\ApiError;
final class Queries {
    public static function filtered(array $s, array $u, string $table, array $q): array {
        foreach ($q as $value) if (!is_string($value)) throw new ApiError(422, 'Filtros devem ser valores simples');
        $inspectionTable = in_array($table, ['inspecoes', 'nao_conformidades'], true);
        foreach (['produto_id', 'lote_id', 'inspetor_id'] as $key) if (isset($q[$key])) Rules::id($q[$key]);
        foreach (['data_inicio', 'data_fim'] as $key) if (isset($q[$key])) Rules::date($q[$key]);
        if (isset($q['data_inicio'], $q['data_fim']) && $q['data_inicio'] > $q['data_fim']) throw new ApiError(422, 'Intervalo de datas invertido');
        if (isset($q['ativo']) && !in_array($q['ativo'], ['true', 'false'], true)) throw new ApiError(422, 'ativo deve ser true ou false');
        if (isset($q['status'])) Rules::choice($q['status'], match($table) {
            'inspecoes' => ['em_andamento', 'aprovada', 'reprovada'],
            'nao_conformidades' => ['aberta', 'em_tratamento', 'resolvida'],
            'lotes' => ['pendente', 'aprovado', 'reprovado'],
            default => []
        }, 'status');
        $rows = [];
        foreach ($s[$table] as $row) {
            $i = $table === 'inspecoes' ? $row : ($table === 'nao_conformidades' ? $s['inspecoes'][$row['inspecao_id']] : null);
            if ($i && $u['perfil'] === 'inspetor' && $i['inspetor_id'] !== $u['id']) continue;
            if (isset($q['status']) && ($row['status'] ?? null) !== $q['status']) continue;
            if (isset($q['ativo']) && ($row['ativo'] ?? null) !== ($q['ativo'] === 'true')) continue;
            $match = true;
            foreach (['produto_id', 'lote_id', 'inspetor_id'] as $key) {
                if (isset($q[$key]) && ($inspectionTable ? ($i[$key] ?? null) : ($row[$key] ?? null)) !== (int)$q[$key]) $match = false;
            }
            if (!$match) continue;
            $when = ($i ?? $row)['criado_em'];
            $date = (new \DateTimeImmutable($when))->setTimezone(new \DateTimeZone('America/Sao_Paulo'))->format('Y-m-d');
            if (isset($q['data_inicio']) && $date < $q['data_inicio']) continue;
            if (isset($q['data_fim']) && $date > $q['data_fim']) continue;
            if (isset($q['q'])) {
                $haystack = implode(' ', array_filter($row, 'is_scalar'));
                if (stripos($haystack, $q['q']) === false) continue;
            }
            $rows[] = $row;
        }
        return $rows;
    }
    public static function page(array $rows, array $q, array $sorts = ['id', 'criado_em']): array {
        $page = isset($q['page']) ? Rules::id($q['page']) : 1;
        $limit = isset($q['limit']) ? Rules::id($q['limit']) : 20;
        if ($limit > 100) throw new ApiError(422, 'limit deve ser até 100');
        $sort = Rules::choice($q['sort'] ?? 'id', $sorts, 'sort');
        $direction = Rules::choice($q['order'] ?? 'desc', ['asc', 'desc'], 'order');
        usort($rows, function ($a, $b) use ($sort, $direction) {
            $cmp = ($a[$sort] <=> $b[$sort]) ?: ($a['id'] <=> $b['id']); return $direction === 'asc' ? $cmp : -$cmp;
        });
        $total = count($rows);
        return ['data' => array_slice($rows, ($page - 1) * $limit, $limit), 'total' => $total, 'page' => $page, 'limit' => $limit, 'pages' => (int)ceil($total / $limit)];
    }
    public static function metrics(array $rows): array {
        $approved = count(array_filter($rows, fn($i) => $i['status'] === 'aprovada'));
        $failed = count(array_filter($rows, fn($i) => $i['status'] === 'reprovada'));
        $done = $approved + $failed;
        return ['total' => count($rows), 'em_andamento' => count($rows) - $done, 'aprovadas' => $approved, 'reprovadas' => $failed,
            'taxa_aprovacao' => $done ? round($approved / $done * 100, 2) : 0,
            'taxa_reprovacao' => $done ? round($failed / $done * 100, 2) : 0];
    }
    public static function csv(array $rows): string {
        $f = fopen('php://temp', 'w+');
        fputcsv($f, ['id', 'lote', 'produto', 'inspetor_id', 'status', 'iniciada_em', 'finalizada_em'], ';', '"', '');
        foreach ($rows as $i) {
            $cells = [$i['id'], $i['lote_codigo'], $i['produto_nome'], $i['inspetor_id'], $i['status'], $i['iniciada_em'], $i['finalizada_em'] ?? ''];
            // Impede fórmulas quando o CSV é aberto em planilhas.
            $cells = array_map(fn($v) => is_string($v) && preg_match('/^[\s]*[=+@\-]/u', $v) ? "'" . $v : $v, $cells);
            fputcsv($f, $cells, ';', '"', '');
        }
        rewind($f); $csv = stream_get_contents($f); fclose($f); return $csv;
    }
}
