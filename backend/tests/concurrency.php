<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';
use GP4\Storage\JsonStore;
use GP4\Domain\{Auth, Catalog, Inspections};
use GP4\Http\ApiError;
if (($argv[1] ?? '') === 'worker') {
    $store = new JsonStore($argv[2]);
    for ($n = 0; $n < 20; $n++) $store->transaction(function (array &$s) { $s['contador_teste'] = ($s['contador_teste'] ?? 0) + 1; usleep(1000); });
    try {
        $store->transaction(fn(array &$s) => Inspections::finish($s, $s['usuarios'][1], 1));
        echo 'finalizou';
    } catch (ApiError $e) { if ($e->status !== 409) throw $e; echo 'bloqueado'; }
    exit;
}
$temp = sys_get_temp_dir() . '/gp4-race-' . bin2hex(random_bytes(8)); mkdir($temp, 0700);
$path = $temp . '/state.json'; $store = new JsonStore($path);
$store->transaction(function (array &$s) {
    $u = Auth::create($s, ['nome' => 'Teste', 'email' => 'race@example.test', 'senha' => 'Teste-local-12345', 'perfil' => 'admin']);
    $p = Catalog::save($s, $u, 'produtos', ['codigo' => 'RACE', 'nome' => 'Peça']);
    $l = Catalog::save($s, $u, 'lotes', ['codigo' => 'L-RACE', 'produto_id' => $p['id'], 'quantidade' => 1, 'data_fabricacao' => '2026-01-01']);
    $c = Catalog::save($s, $u, 'criterios', ['nome' => 'Visual']);
    $cl = Catalog::save($s, $u, 'checklists', ['nome' => 'Padrão', 'itens' => [['criterio_id' => $c['id']]]]);
    $i = Inspections::open($s, $u, ['lote_id' => $l['id'], 'checklist_id' => $cl['id']]);
    Inspections::answer($s, $u, $i['id'], 1, ['resultado' => 'conforme']);
});
$jobs = [];
try {
    for ($n = 0; $n < 4; $n++) {
        $proc = proc_open([PHP_BINARY, __FILE__, 'worker', $path], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        $jobs[] = [$proc, $pipes];
    }
    $winners = 0; $blocked = 0;
    foreach ($jobs as [$proc, $pipes]) {
        fclose($pipes[0]); $out = stream_get_contents($pipes[1]); $error = stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]);
        if (proc_close($proc) !== 0) throw new RuntimeException($error);
        $winners += $out === 'finalizou' ? 1 : 0; $blocked += $out === 'bloqueado' ? 1 : 0;
    }
    $state = $store->transaction(fn(array &$s) => $s);
    if ($state['contador_teste'] !== 80) throw new RuntimeException('Gravação perdida');
    echo "ok 1 - 4 processos, 80 transações sem perda de gravação\n";
    if ($winners !== 1 || $blocked !== 3) throw new RuntimeException('Dupla finalização na concorrência');
    echo "ok 2 - uma finalização confirmada e três bloqueadas\n";
    if ($state['inspecoes'][1]['status'] !== 'aprovada' || $state['lotes'][1]['status'] !== 'aprovado') throw new RuntimeException('Estado inconsistente');
    echo "ok 3 - inspeção e lote consistentes após concorrência\n\n3 verificações de concorrência passaram.\n";
} finally { foreach (glob($temp . '/*') as $file) unlink($file); rmdir($temp); }
