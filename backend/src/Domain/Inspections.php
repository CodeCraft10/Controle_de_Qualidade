<?php
declare(strict_types=1);
namespace GP4\Domain;
use GP4\Http\ApiError;
final class Inspections {
    public static function access(array $u, array $i, bool $edit = false): void {
        if ($u['perfil'] === 'inspetor' && $i['inspetor_id'] !== $u['id']) throw new ApiError(403, 'Inspeção de outro inspetor');
        if ($edit && $i['status'] !== 'em_andamento') throw new ApiError(409, 'Inspeção já finalizada');
    }
    public static function open(array &$s, array $u, array $b): array {
        $lot = Records::active($s, 'lotes', Rules::id($b['lote_id'] ?? null));
        $product = Records::active($s, 'produtos', $lot['produto_id']);
        $check = Records::active($s, 'checklists', Rules::id($b['checklist_id'] ?? null));
        if ($lot['status'] !== 'pendente' || array_filter($s['inspecoes'], fn($i) => $i['lote_id'] === $lot['id'])) throw new ApiError(409, 'Lote já possui inspeção');
        $items = [];
        foreach ($check['itens'] as $item) {
            $criterion = Records::active($s, 'criterios', $item['criterio_id']);
            $items[] = [...$item, 'criterio_nome' => $criterion['nome'], 'criterio_descricao' => $criterion['descricao']];
        }
        if (!$items) throw new ApiError(409, 'Checklist vazio');
        $i = Records::add($s, 'inspecoes', [
            'lote_id' => $lot['id'], 'checklist_id' => $check['id'], 'inspetor_id' => $u['id'],
            'produto_id' => $product['id'], 'produto_nome' => $product['nome'], 'lote_codigo' => $lot['codigo'],
            'checklist_nome' => $check['nome'], 'status' => 'em_andamento', 'itens' => $items,
            'iniciada_em' => Records::now(), 'finalizada_em' => null
        ]);
        Records::audit($s, $u['id'], 'abrir', 'inspecoes', $i['id']); return $i;
    }
    public static function detail(array $s, array $u, int $id): array {
        $i = Records::get($s, 'inspecoes', $id); self::access($u, $i);
        $answers = array_values(array_filter($s['respostas'], fn($r) => $r['inspecao_id'] === $id));
        $mandatory = array_filter($i['itens'], fn($item) => $item['obrigatorio']);
        $responded = array_column($answers, 'item_id');
        return [...$i, 'respostas' => $answers, 'andamento' => [
            'total' => count($i['itens']), 'respondidos' => count($answers), 'obrigatorios' => count($mandatory),
            'obrigatorios_respondidos' => count(array_filter($mandatory, fn($item) => in_array($item['id'], $responded, true))),
            'percentual' => round(count($answers) / count($i['itens']) * 100, 2)
        ]];
    }
    public static function answer(array &$s, array $u, int $id, int $itemId, array $b): array {
        $i = Records::get($s, 'inspecoes', $id); self::access($u, $i, true);
        if (!array_filter($i['itens'], fn($item) => $item['id'] === $itemId)) throw new ApiError(422, 'Item não pertence à inspeção');
        $result = Rules::choice($b['resultado'] ?? null, ['conforme', 'nao_conforme', 'nao_aplicavel'], 'resultado');
        $note = $b['observacao'] ?? '';
        if (!is_string($note) || strlen($note) > 3000) throw new ApiError(422, 'Observação inválida');
        if ($result === 'nao_aplicavel' && trim($note) === '') throw new ApiError(422, 'Justifique não aplicável em observacao');
        $existing = array_values(array_filter($s['respostas'], fn($r) => $r['inspecao_id'] === $id && $r['item_id'] === $itemId))[0] ?? null;
        if ($existing && array_filter($s['nao_conformidades'], fn($n) => $n['resposta_id'] === $existing['id'])) throw new ApiError(409, 'Resposta vinculada a desvio não pode mudar');
        $row = ['inspecao_id' => $id, 'item_id' => $itemId, 'resultado' => $result, 'observacao' => trim($note), 'atualizado_em' => Records::now()];
        if ($existing) { $row = [...$existing, ...$row]; $s['respostas'][$row['id']] = $row; }
        else $row = Records::add($s, 'respostas', $row);
        Records::audit($s, $u['id'], 'responder', 'inspecoes', $id); return $row;
    }
    public static function finish(array &$s, array $u, int $id): array {
        $i = Records::get($s, 'inspecoes', $id); self::access($u, $i, true);
        $answers = array_filter($s['respostas'], fn($r) => $r['inspecao_id'] === $id);
        $status = Rules::finalResult($i['itens'], $answers, $s['nao_conformidades']);
        $i['status'] = $status; $i['finalizada_em'] = Records::now(); $s['inspecoes'][$id] = $i;
        $s['lotes'][$i['lote_id']]['status'] = $status === 'aprovada' ? 'aprovado' : 'reprovado';
        Records::audit($s, $u['id'], 'finalizar', 'inspecoes', $id); return $i;
    }
    public static function deviation(array &$s, array $u, int $answerId, array $b): array {
        $r = Records::get($s, 'respostas', $answerId); $i = Records::get($s, 'inspecoes', $r['inspecao_id']); self::access($u, $i, true);
        if ($r['resultado'] !== 'nao_conforme') throw new ApiError(409, 'Resposta deve ser não conforme');
        if (array_filter($s['nao_conformidades'], fn($n) => $n['resposta_id'] === $answerId)) throw new ApiError(409, 'Resposta já possui desvio');
        $n = Records::add($s, 'nao_conformidades', [
            'resposta_id' => $answerId, 'item_id' => $r['item_id'], 'inspecao_id' => $i['id'], 'descricao' => Rules::text($b['descricao'] ?? null, 'descricao', 3000),
            'classificacao' => Rules::choice($b['classificacao'] ?? 'menor', ['menor', 'maior', 'critica'], 'classificacao'), 'status' => 'aberta',
            'historico' => [['status' => 'aberta', 'usuario_id' => $u['id'], 'criado_em' => Records::now()]]
        ]);
        Records::audit($s, $u['id'], 'criar', 'nao_conformidades', $n['id']); return $n;
    }
    public static function transition(array &$s, array $u, int $id, array $b): array {
        Auth::role($u, ['admin', 'supervisor']); $n = Records::get($s, 'nao_conformidades', $id);
        $next = ['aberta' => 'em_tratamento', 'em_tratamento' => 'resolvida'][$n['status']] ?? null;
        if (!$next || ($b['status'] ?? null) !== $next) throw new ApiError(409, 'Use aberta → em_tratamento → resolvida');
        $n['status'] = $next; $n['historico'][] = ['status' => $next, 'usuario_id' => $u['id'], 'criado_em' => Records::now()];
        $s['nao_conformidades'][$id] = $n; Records::audit($s, $u['id'], 'transicao', 'nao_conformidades', $id); return $n;
    }
}
