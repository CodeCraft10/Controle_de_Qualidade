<?php
declare(strict_types=1);
namespace GP4\Http;
use GP4\Domain\{Auth, Catalog, Evidence, Inspections, Queries, Records, Rules};
use GP4\Storage\Store;
final class Application {
    public function __construct(private readonly Store $store) {}
    /** Resposta [status, corpo, cabeçalhos]; toda mutação de domínio é atômica no adaptador. */
    public function handle(string $method, string $path, array $body = [], array $query = [], string $token = '', array $files = [], string $ip = 'local'): array {
        if ($method === 'GET' && $path === '/api/health') return [200, ['status' => 'ok', 'storage' => 'json-local', 'integracoes' => false], []];
        if ($method === 'POST' && $path === '/api/auth/login') return [200, Auth::login($this->store, $body, $ip), []];
        return $this->store->transaction(function (array &$s) use ($method, $path, $body, $query, $token, $files) {
            $u = Auth::user($s, $token);
            if ($path === '/api/auth/me' && $method === 'GET') return [200, Auth::publicUser($u), []];
            if ($path === '/api/auth/logout' && $method === 'POST') {
                unset($s['tokens'][hash('sha256', $token)]); return [204, null, []];
            }
            if (preg_match('#^/api/checklists/([1-9][0-9]{0,8})/itens(?:/([1-9][0-9]{0,8}))?$#', $path, $m)) {
                $id = Rules::id($m[1]); $check = Records::get($s, 'checklists', $id);
                if ($method === 'GET' && !isset($m[2])) {
                    $items = array_map(fn($item) => [...$item, 'criterio' => Records::get($s, 'criterios', $item['criterio_id'])['nome']], $check['itens']);
                    return [200, ['data' => $items], []];
                }
                Auth::role($u, ['admin', 'supervisor']);
                if ($method === 'POST' && !isset($m[2])) {
                    $saved = Catalog::save($s, $u, 'checklists', ['itens' => [...$check['itens'], $body]], $id);
                    return [201, $saved['itens'][array_key_last($saved['itens'])], []];
                }
                if ($method === 'DELETE' && isset($m[2])) {
                    $itemId = Rules::id($m[2]);
                    $items = array_values(array_filter($check['itens'], fn($item) => $item['id'] !== $itemId));
                    if (count($items) === count($check['itens'])) throw new ApiError(404, 'Item não encontrado');
                    Catalog::save($s, $u, 'checklists', ['itens' => $items], $id);
                    return [204, null, []];
                }
                throw new ApiError(405, 'Método não permitido');
            }
            if (preg_match('#^/api/(produtos|lotes|criterios|checklists|usuarios|inspetores)(?:/([1-9][0-9]{0,8}))?$#', $path, $m)) {
                $resource = $m[1]; $table = $resource === 'inspetores' ? 'usuarios' : $resource;
                if ($table === 'usuarios') Auth::role($u, $resource === 'inspetores' ? ['admin', 'supervisor'] : ['admin']);
                $id = isset($m[2]) ? Rules::id($m[2]) : null;
                if ($method === 'GET') {
                    if ($id !== null) {
                        $row = Records::get($s, $table, $id);
                        if ($resource === 'inspetores' && $row['perfil'] !== 'inspetor') throw new ApiError(404, 'Inspetor não encontrado');
                        return [200, $table === 'usuarios' ? Auth::publicUser($row) : $row, []];
                    }
                    $rows = Queries::filtered($s, $u, $table, $query);
                    if ($resource === 'inspetores') $rows = array_values(array_filter($rows, fn($r) => $r['perfil'] === 'inspetor'));
                    if ($table === 'usuarios') $rows = array_map([Auth::class, 'publicUser'], $rows);
                    return [200, Queries::page($rows, $query), []];
                }
                if ($resource !== 'inspetores' && $method === 'POST' && $id === null) return [201, Catalog::save($s, $u, $table, $body), []];
                if ($resource !== 'inspetores' && $method === 'PATCH' && $id !== null) return [200, Catalog::save($s, $u, $table, $body, $id), []];
                // DELETE é desativação referencial, preservando os históricos.
                if ($resource !== 'inspetores' && $method === 'DELETE' && $id !== null) {
                    Catalog::save($s, $u, $table, ['ativo' => false], $id); return [204, null, []];
                }
                throw new ApiError(405, 'Método não permitido');
            }
            if (in_array($path, ['/api/inspecoes', '/api/historico'], true) && $method === 'GET') return [200, Queries::page(Queries::filtered($s, $u, 'inspecoes', $query), $query, ['id', 'criado_em', 'iniciada_em', 'status']), []];
            if ($path === '/api/inspecoes' && $method === 'POST') return [201, Inspections::open($s, $u, $body), []];
            if (preg_match('#^/api/inspecoes/([1-9][0-9]{0,8})(?:/(finalizar|respostas/([1-9][0-9]{0,8})))?$#', $path, $m)) {
                $id = Rules::id($m[1]); $action = $m[2] ?? '';
                if ($method === 'GET' && $action === '') return [200, Inspections::detail($s, $u, $id), []];
                if ($method === 'POST' && $action === 'finalizar') return [200, Inspections::finish($s, $u, $id), []];
                if ($method === 'PUT' && isset($m[3])) return [200, Inspections::answer($s, $u, $id, Rules::id($m[3]), $body), []];
                throw new ApiError(405, 'Método não permitido');
            }
            if (preg_match('#^/api/respostas/([1-9][0-9]{0,8})/nao-conformidade$#', $path, $m) && $method === 'POST') return [201, Inspections::deviation($s, $u, Rules::id($m[1]), $body), []];
            if ($path === '/api/nao-conformidades' && $method === 'GET') return [200, Queries::page(Queries::filtered($s, $u, 'nao_conformidades', $query), $query, ['id', 'criado_em', 'status']), []];
            if (preg_match('#^/api/nao-conformidades/([1-9][0-9]{0,8})(/evidencias)?$#', $path, $m)) {
                $id = Rules::id($m[1]); $n = Records::get($s, 'nao_conformidades', $id);
                Inspections::access($u, Records::get($s, 'inspecoes', $n['inspecao_id']));
                if (isset($m[2])) {
                    if ($method === 'POST') return [201, Evidence::upload($s, $u, $id, $files['arquivo'] ?? null), []];
                    if ($method === 'GET') return [200, ['data' => array_values(array_map([Evidence::class, 'metadata'], array_filter($s['evidencias'], fn($e) => $e['nao_conformidade_id'] === $id)))], []];
                } else {
                    if ($method === 'GET') return [200, $n, []];
                    if ($method === 'PATCH') return [200, Inspections::transition($s, $u, $id, $body), []];
                }
                throw new ApiError(405, 'Método não permitido');
            }
            if (preg_match('#^/api/evidencias/([1-9][0-9]{0,8})$#', $path, $m) && $method === 'GET') {
                $e = Evidence::get($s, $u, Rules::id($m[1]));
                $extension = ['image/png' => 'png', 'image/jpeg' => 'jpg', 'image/webp' => 'webp'][$e['mime']];
                return [200, base64_decode($e['conteudo_base64'], true), ['Content-Type' => $e['mime'], 'Content-Disposition' => 'attachment; filename="evidencia-' . $e['id'] . '.' . $extension . '"']];
            }
            if (in_array($path, ['/api/indicadores', '/api/relatorios/inspecoes', '/api/relatorios/inspecoes.csv'], true) && $method === 'GET') {
                $rows = Queries::filtered($s, $u, 'inspecoes', $query);
                if ($path === '/api/indicadores') return [200, [...Queries::metrics($rows), 'nao_conformidades' => count(array_filter($s['nao_conformidades'], fn($n) => in_array($n['inspecao_id'], array_column($rows, 'id'), true)))], []];
                $page = Queries::page($rows, $query, ['id', 'criado_em', 'iniciada_em', 'status']);
                if (str_ends_with($path, '.csv')) return [200, Queries::csv($page['data']), ['Content-Type' => 'text/csv; charset=utf-8', 'Content-Disposition' => 'attachment; filename="inspecoes.csv"']];
                return [200, $page, []];
            }
            if ($path === '/api/auditoria' && $method === 'GET') {
                Auth::role($u, ['admin', 'supervisor']); return [200, Queries::page(Queries::filtered($s, $u, 'auditoria', $query), $query), []];
            }
            throw new ApiError(404, 'Rota não encontrada');
        });
    }
}
