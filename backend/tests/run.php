<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';
use GP4\Domain\{Auth, Queries, Records};
use GP4\Storage\JsonStore;
use GP4\Http\{ApiError, Application};

$count = 0;
function check(bool $condition, string $message): void {
    global $count; if (!$condition) throw new RuntimeException('FALHOU: ' . $message);
    $count++; echo "ok $count - $message\n";
}
function fails(callable $fn, int $status, string $message): void {
    try { $fn(); } catch (ApiError $e) { check($e->status === $status, $message . ' (HTTP ' . $e->status . ')'); return; }
    throw new RuntimeException('FALHOU: ' . $message . ' não bloqueou');
}
$temp = sys_get_temp_dir() . '/gp4-' . bin2hex(random_bytes(8)); mkdir($temp, 0700);
$store = new JsonStore($temp . '/state.json'); $app = new Application($store);
$call = fn($method, $path, $b = [], $token = '', $q = []) => $app->handle($method, $path, $b, $q, $token)[1];
try {
    $admin = $store->transaction(fn(array &$s) => Auth::create($s, ['nome' => 'Admin teste', 'email' => 'admin@example.test', 'senha' => 'Teste-local-12345', 'perfil' => 'admin']));
    check(password_verify('Teste-local-12345', $admin['senha_hash']), 'senha com hash verificável');
    check(!isset(Auth::publicUser($admin)['senha_hash']), 'hash não exposto');
    check($call('GET', '/api/health')['storage'] === 'json-local', 'saúde independente de banco');
    fails(fn() => $call('GET', '/api/produtos'), 401, 'bloqueia requisição anônima');
    fails(fn() => $call('POST', '/api/auth/login', ['email' => 'admin@example.test', 'senha' => 'errada']), 401, 'credencial inválida');
    $a = $call('POST', '/api/auth/login', ['email' => 'admin@example.test', 'senha' => 'Teste-local-12345'])['token'];
    check(strlen($a) === 64, 'token aleatório');
    $state = $store->transaction(fn(array &$s) => $s);
    check(!isset($state['tokens'][$a]) && isset($state['tokens'][hash('sha256', $a)]), 'somente digest de token no armazenamento');
    fails(fn() => $call('DELETE', '/api/usuarios/1', [], $a), 409, 'protege último administrador');
    $u = $call('POST', '/api/usuarios', ['nome' => 'Inspetor', 'email' => 'i@example.test', 'senha' => 'Teste-local-12345', 'perfil' => 'inspetor'], $a);
    $v = $call('POST', '/api/usuarios', ['nome' => 'Outro', 'email' => 'j@example.test', 'senha' => 'Teste-local-12345', 'perfil' => 'inspetor'], $a);
    $i = $call('POST', '/api/auth/login', ['email' => 'i@example.test', 'senha' => 'Teste-local-12345'])['token'];
    $j = $call('POST', '/api/auth/login', ['email' => 'j@example.test', 'senha' => 'Teste-local-12345'])['token'];
    fails(fn() => $call('POST', '/api/produtos', ['nome' => 'x', 'codigo' => 'X'], $i), 403, 'inspetor não administra cadastros');
    fails(fn() => $call('GET', '/api/usuarios', [], $i), 403, 'inspetor não lista contas');
    $p = $call('POST', '/api/produtos', ['codigo' => '=SUM(A1)', 'nome' => 'Produto teste'], $a);
    fails(fn() => $call('POST', '/api/produtos', ['codigo' => '=sum(a1)', 'nome' => 'duplicado'], $a), 409, 'duplicidade sem diferenciar maiúsculas');
    fails(fn() => $call('POST', '/api/lotes', ['codigo' => 'L', 'produto_id' => 999, 'quantidade' => 10, 'data_fabricacao' => '2026-01-01'], $a), 404, 'vínculo inexistente');
    fails(fn() => $call('POST', '/api/lotes', ['codigo' => 'L', 'produto_id' => $p['id'], 'quantidade' => 10, 'data_fabricacao' => '2026-02-30'], $a), 422, 'data impossível');
    $l = $call('POST', '/api/lotes', ['codigo' => '=LOT', 'produto_id' => $p['id'], 'quantidade' => 10, 'data_fabricacao' => '2026-01-01'], $a);
    $c = $call('POST', '/api/criterios', ['nome' => 'Acabamento'], $a);
    $c2 = $call('POST', '/api/criterios', ['nome' => 'Dimensão'], $a);
    $draft = $call('POST', '/api/checklists', ['nome' => 'Vazio', 'itens' => []], $a);
    check($draft['itens'] === [], 'checklist vazio pode ser salvo como rascunho');
    fails(fn() => $call('POST', '/api/inspecoes', ['lote_id' => $l['id'], 'checklist_id' => $draft['id']], $i), 409, 'checklist vazio não pode iniciar inspeção');
    fails(fn() => $call('POST', '/api/checklists', ['nome' => 'Duplicado', 'itens' => [['criterio_id' => $c['id']], ['criterio_id' => $c['id']]]], $a), 409, 'itens duplicados');
    $draftItem = $call('POST', '/api/checklists/' . $draft['id'] . '/itens', ['criterio_id' => $c['id']], $a);
    check($call('GET', '/api/checklists/' . $draft['id'] . '/itens', [], $a)['data'][0]['criterio'] === 'Acabamento', 'itens consultáveis pela interface');
    fails(fn() => $call('POST', '/api/checklists/' . $draft['id'] . '/itens', ['criterio_id' => $c['id']], $a), 409, 'adição de item duplicado bloqueada');
    fails(fn() => $call('POST', '/api/checklists/' . $draft['id'] . '/itens', ['criterio_id' => $c2['id']], $i), 403, 'inspetor não edita itens do checklist');
    $call('DELETE', '/api/checklists/' . $draft['id'] . '/itens/' . $draftItem['id'], [], $a);
    check($call('GET', '/api/checklists/' . $draft['id'] . '/itens', [], $a)['data'] === [], 'remoção do último item mantém rascunho');
    $cl = $call('POST', '/api/checklists', ['nome' => 'Padrão', 'itens' => [['criterio_id' => $c['id']], ['criterio_id' => $c2['id']]]], $a);
    $inspection = $call('POST', '/api/inspecoes', ['lote_id' => $l['id'], 'checklist_id' => $cl['id']], $i); $id = $inspection['id'];
    check($inspection['itens'][0]['criterio_nome'] === 'Acabamento', 'snapshot de critérios');
    fails(fn() => $call('DELETE', '/api/checklists/' . $cl['id'] . '/itens/1', [], $a), 409, 'remoção de item histórico bloqueada');
    fails(fn() => $call('PATCH', '/api/checklists/' . $cl['id'], ['nome' => 'Mudança'], $a), 409, 'checklist histórico estável');
    fails(fn() => $call('PATCH', '/api/produtos/' . $p['id'], ['nome' => 'Mudança'], $a), 409, 'produto referenciado estável');
    fails(fn() => $call('POST', '/api/inspecoes', ['lote_id' => $l['id'], 'checklist_id' => $cl['id']], $i), 409, 'impede inspeção duplicada');
    fails(fn() => $call('GET', '/api/inspecoes/' . $id, [], $j), 403, 'leitura privada por responsável');
    check($call('GET', '/api/inspecoes', [], $j)['total'] === 0, 'listagem respeita escopo');
    check($call('GET', '/api/indicadores', [], $j)['total'] === 0, 'indicadores respeitam escopo');
    fails(fn() => $call('POST', "/api/inspecoes/$id/finalizar", [], $i), 409, 'não finaliza vazia');
    fails(fn() => $call('PUT', "/api/inspecoes/$id/respostas/99", ['resultado' => 'conforme'], $i), 422, 'item de fora bloqueado');
    fails(fn() => $call('PUT', "/api/inspecoes/$id/respostas/1", ['resultado' => 'nao_aplicavel'], $i), 422, 'não aplicável exige justificativa');
    $r = $call('PUT', "/api/inspecoes/$id/respostas/1", ['resultado' => 'nao_conforme'], $i);
    fails(fn() => $call('POST', "/api/inspecoes/$id/finalizar", [], $i), 409, 'não finaliza incompleta');
    $call('PUT', "/api/inspecoes/$id/respostas/2", ['resultado' => 'nao_aplicavel', 'observacao' => 'Sem medição neste modelo'], $i);
    fails(fn() => $call('POST', "/api/inspecoes/$id/finalizar", [], $i), 409, 'não conforme exige desvio');
    $n = $call('POST', '/api/respostas/' . $r['id'] . '/nao-conformidade', ['descricao' => 'Risco na peça'], $i);
    fails(fn() => $call('POST', '/api/respostas/' . $r['id'] . '/nao-conformidade', ['descricao' => 'Duplicado'], $i), 409, 'desvio duplicado bloqueado');
    fails(fn() => $call('PUT', "/api/inspecoes/$id/respostas/1", ['resultado' => 'conforme'], $i), 409, 'resposta com desvio imutável');
    fails(fn() => $call('GET', '/api/nao-conformidades/' . $n['id'], [], $j), 403, 'desvio privado');
    check($call('GET', '/api/inspecoes/' . $id, [], $i)['andamento']['percentual'] === 100.0, 'progresso 100%');
    $before = file_get_contents($temp . '/state.json');
    fails(function () use ($store) { $store->transaction(function (array &$s) { $s['produtos'] = []; throw new ApiError(409, 'rollback'); }); }, 409, 'exceção durante transação');
    check(file_get_contents($temp . '/state.json') === $before, 'rollback preserva arquivo inteiro');
    check($call('POST', "/api/inspecoes/$id/finalizar", [], $i)['status'] === 'reprovada', 'reprovação calculada');
    $state = $store->transaction(fn(array &$s) => $s);
    check($state['lotes'][$l['id']]['status'] === 'reprovado', 'resultado e lote atualizados juntos');
    fails(fn() => $call('POST', "/api/inspecoes/$id/finalizar", [], $i), 409, 'dupla finalização bloqueada');
    fails(fn() => $call('PUT', "/api/inspecoes/$id/respostas/2", ['resultado' => 'conforme'], $i), 409, 'resposta finalizada imutável');
    fails(fn() => $call('PATCH', '/api/nao-conformidades/' . $n['id'], ['status' => 'em_tratamento'], $i), 403, 'inspetor não trata desvio');
    fails(fn() => $call('PATCH', '/api/nao-conformidades/' . $n['id'], ['status' => 'resolvida'], $a), 409, 'não pula estado');
    $call('PATCH', '/api/nao-conformidades/' . $n['id'], ['status' => 'em_tratamento'], $a);
    $resolved = $call('PATCH', '/api/nao-conformidades/' . $n['id'], ['status' => 'resolvida'], $a);
    check(count($resolved['historico']) === 3, 'histórico das transições');
    check($call('GET', '/api/inspecoes/' . $id, [], $a)['status'] === 'reprovada', 'resolver não altera resultado histórico');
    $m = $call('GET', '/api/indicadores', [], $a);
    check($m['taxa_reprovacao'] === 100.0 && $m['taxa_aprovacao'] === 0.0, 'fórmulas de indicadores');
    check(Queries::metrics([])['taxa_aprovacao'] === 0, 'zero finalizadas sem divisão por zero');
    check(str_contains($call('GET', '/api/relatorios/inspecoes.csv', [], $a), "'=LOT"), 'CSV neutraliza fórmula');
    check($call('GET', '/api/historico', [], $a, ['status' => 'aprovada'])['total'] === 0, 'filtro de status');
    fails(fn() => $call('GET', '/api/historico', [], $a, ['data_inicio' => '2026-02-30']), 422, 'filtro com data inválida');
    fails(fn() => $call('GET', '/api/historico', [], $a, ['data_inicio' => '2026-03-01', 'data_fim' => '2026-01-01']), 422, 'intervalo invertido');
    fails(fn() => $call('GET', '/api/historico', [], $a, ['sort' => 'senha_hash']), 422, 'ordenação com lista permitida');
    fails(fn() => $call('GET', '/api/historico', [], $a, ['limit' => '101']), 422, 'limite de paginação');
    check($call('GET', '/api/historico', [], $a, ['page' => '2', 'limit' => '1'])['data'] === [], 'paginação fora do intervalo');
    $call('DELETE', '/api/produtos/' . $p['id'], [], $a);
    check($call('GET', '/api/produtos/' . $p['id'], [], $a)['ativo'] === false, 'exclusão lógica');
    check($call('GET', '/api/inspecoes/' . $id, [], $a)['produto_nome'] === 'Produto teste', 'histórico permanece após desativação');
    $call('PATCH', '/api/usuarios/' . $u['id'], ['senha' => 'Nova-senha-12345'], $a);
    fails(fn() => $call('GET', '/api/auth/me', [], $i), 401, 'troca de senha revoga sessões');
    $call('DELETE', '/api/usuarios/' . $v['id'], [], $a);
    fails(fn() => $call('GET', '/api/auth/me', [], $j), 401, 'conta inativa revoga sessão');
    $call('POST', '/api/auth/logout', [], $a);
    fails(fn() => $call('GET', '/api/auth/me', [], $a), 401, 'logout revoga token');
    for ($t = 0; $t < 10; $t++) fails(fn() => Auth::login($store, ['email' => 'admin@example.test', 'senha' => 'invalida'], 'rate-test'), 401, 'falha de login contabilizada');
    fails(fn() => Auth::login($store, ['email' => 'admin@example.test', 'senha' => 'Teste-local-12345'], 'rate-test'), 429, 'limitação persistente de login');
    $expired = Auth::login($store, ['email' => 'admin@example.test', 'senha' => 'Teste-local-12345'], 'expiry-test')['token'];
    $store->transaction(function (array &$s) use ($expired) { $s['tokens'][hash('sha256', $expired)]['expira_em'] = time() - 1; });
    fails(fn() => $call('GET', '/api/auth/me', [], $expired), 401, 'token expirado bloqueado');
    // Segunda instância lê o estado gravado pela primeira (persistência entre processos/requisições).
    $other = new JsonStore($temp . '/state.json');
    check(count($other->transaction(fn(array &$s) => $s['inspecoes'])) === 1, 'estado recuperável por nova instância');
    file_put_contents($temp . '/broken.json', '{');
    try { (new JsonStore($temp . '/broken.json'))->transaction(fn(array &$s) => null); throw new RuntimeException('corrupção ignorada'); }
    catch (JsonException) { check(file_get_contents($temp . '/broken.json') === '{', 'corrupção não reinicializa nem apaga dados'); }
    echo "\n$count verificações passaram.\n";
} finally { foreach (glob($temp . '/*') as $file) unlink($file); rmdir($temp); }
