<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';
use GP4\Domain\{Auth, Demo};
use GP4\Http\{ApiError, Application};

$count = 0;
function verify(bool $condition, string $message): void {
    global $count; if (!$condition) throw new RuntimeException('FALHOU: ' . $message);
    echo 'ok ' . ++$count . ' - ' . $message . "\n";
}
function denied(callable $fn, int $status, string $message): void {
    try { $fn(); } catch (ApiError $e) { verify($e->status === $status, $message); return; }
    throw new RuntimeException('FALHOU: ' . $message);
}
$temp = sys_get_temp_dir() . '/gp4-demo-' . bin2hex(random_bytes(6)); mkdir($temp, 0700);
$previousMode = getenv('DEMO_MODE'); $previousPath = getenv('STORAGE_PATH');
try {
    putenv('STORAGE_PATH=' . $temp . '/normal.json'); putenv('DEMO_MODE=false');
    $normal = gp4_store(); $normalApp = new Application($normal);
    $normal->transaction(fn(array &$s) => Auth::create($s, ['nome' => 'Administrador real', 'email' => 'real@example.test', 'senha' => 'Senha-real-12345', 'perfil' => 'admin']));
    $original = file_get_contents($temp . '/normal.json');
    verify($normalApp->handle('GET', '/api/config')[1]['demo_mode'] === false, 'demonstração desligada por padrão');
    denied(fn() => $normalApp->handle('POST', '/api/auth/demo'), 404, 'entrada automática indisponível quando desligada');
    denied(fn() => $normalApp->handle('GET', '/api/produtos'), 401, 'autenticação normal preservada');
    putenv('DEMO_MODE=1'); verify(!Demo::enabled(), 'ativação exige valor true explícito');
    putenv('DEMO_MODE=true');
    $demo = gp4_store(); $app = new Application($demo);
    verify($app->handle('GET', '/api/config')[1]['demo_mode'] === true, 'configuração informa modo ligado');
    $session = $app->handle('POST', '/api/auth/demo')[1];
    verify($session['usuario']['demo'] === true && $session['usuario']['perfil'] === 'admin', 'sessão automática de demonstração');
    verify(!isset($session['usuario']['senha_hash']), 'sessão não revela hash ou senha');
    $token = $session['token'];
    denied(fn() => $app->handle('GET', '/api/produtos'), 401, 'modo demo não remove validação dos tokens');
    $product = $app->handle('POST', '/api/produtos', ['codigo' => 'DEMO', 'nome' => 'Peça de teste'], [], $token)[1];
    verify($product['nome'] === 'Peça de teste', 'cadastro funciona sem login manual');
    verify(is_file($temp . '/normal.json.demo.json'), 'estado demo usa arquivo separado');
    verify(file_get_contents($temp . '/normal.json') === $original, 'contas e dados normais não foram alterados');
    $state = $demo->transaction(fn(array &$s) => $s);
    verify(count($state['usuarios']) === 1 && $state['usuarios'][1]['email'] !== 'real@example.test', 'contas reais ausentes na demonstração');
    putenv('DEMO_MODE=false');
    denied(fn() => Auth::user($state, $token), 401, 'token demo recusado imediatamente ao desligar');
    $restored = new Application(gp4_store());
    denied(fn() => $restored->handle('GET', '/api/produtos', [], [], $token), 401, 'token demo não acessa armazenamento normal');
    $real = $restored->handle('POST', '/api/auth/login', ['email' => 'real@example.test', 'senha' => 'Senha-real-12345'])[1];
    verify($real['usuario']['nome'] === 'Administrador real', 'login normal restaurado');
    verify($restored->handle('GET', '/api/produtos', [], [], $real['token'])[1]['total'] === 0, 'dados de teste não aparecem no modo normal');
    putenv('DEMO_MODE=true');
    $again = new Application(gp4_store()); $next = $again->handle('POST', '/api/auth/demo')[1];
    verify($again->handle('GET', '/api/produtos', [], [], $next['token'])[1]['total'] === 1, 'testes podem continuar ao reativar');
    verify(count(gp4_store()->transaction(fn(array &$s) => $s['usuarios'])) === 1, 'reentrada reutiliza usuário demo');
    mkdir($temp . '/config'); mkdir($temp . '/config/bin');
    copy(dirname(__DIR__) . '/bin/demo.php', $temp . '/config/bin/demo.php');
    file_put_contents($temp . '/config/.env', "# Configuração existente\nSTORAGE_PATH=/privado/state.json\nDEMO_MODE=false\n");
    foreach (['on' => 'true', 'off' => 'false'] as $argument => $value) {
        $process = proc_open([PHP_BINARY, $temp . '/config/bin/demo.php', $argument], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes);
        fclose($pipes[0]); stream_get_contents($pipes[1]); stream_get_contents($pipes[2]); fclose($pipes[1]); fclose($pipes[2]);
        verify(proc_close($process) === 0, 'comando de configuração: ' . $argument);
        $text = file_get_contents($temp . '/config/.env');
        verify(str_contains($text, "DEMO_MODE=$value") && str_contains($text, 'STORAGE_PATH=/privado/state.json') && substr_count($text, 'DEMO_MODE=') === 1, 'comando preserva outras configurações: ' . $argument);
    }
    echo "\n$count verificações da demonstração passaram.\n";
} finally {
    putenv($previousMode === false ? 'DEMO_MODE' : 'DEMO_MODE=' . $previousMode);
    putenv($previousPath === false ? 'STORAGE_PATH' : 'STORAGE_PATH=' . $previousPath);
    foreach (glob($temp . '/*') as $file) if (is_file($file)) unlink($file);
    foreach (glob($temp . '/config/bin/*') as $file) unlink($file);
    if (is_dir($temp . '/config/bin')) rmdir($temp . '/config/bin');
    if (is_file($temp . '/config/.env')) unlink($temp . '/config/.env');
    if (is_dir($temp . '/config')) rmdir($temp . '/config');
    rmdir($temp);
}
