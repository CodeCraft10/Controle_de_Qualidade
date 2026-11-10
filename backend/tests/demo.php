<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';
use GP4\Domain\{Auth, Demo};
use GP4\Http\{ApiError, Application};
use GP4\Storage\JsonStore;
$count = 0;
function verify(bool $condition, string $message): void {
    global $count; if (!$condition) throw new RuntimeException('FALHOU: ' . $message);
    echo 'ok ' . ++$count . ' - ' . $message . "\n";
}
$temp = sys_get_temp_dir() . '/gp4-open-' . bin2hex(random_bytes(6)); mkdir($temp, 0700);
$previousMode = getenv('DEMO_MODE'); $previousPath = getenv('STORAGE_PATH');
try {
    putenv('STORAGE_PATH=' . $temp . '/normal.json');
    $normal = new JsonStore($temp . '/normal.json');
    $normal->transaction(fn(array &$s) => Auth::create($s, ['nome' => 'Conta preservada', 'email' => 'real@example.test', 'senha' => 'Senha-real-12345', 'perfil' => 'admin']));
    $original = file_get_contents($temp . '/normal.json');
    putenv('DEMO_MODE=false');
    verify(Demo::enabled(), 'configuração antiga não reativa a página removida');
    $app = new Application(gp4_store());
    verify($app->handle('GET', '/api/config')[1]['demo_mode'] === true, 'versão de teste sempre disponível');
    $session = $app->handle('POST', '/api/auth/demo')[1]; $token = $session['token'];
    verify($session['usuario']['demo'] && $session['usuario']['perfil'] === 'admin', 'sessão automática sem conta manual');
    verify(!isset($session['usuario']['senha_hash']), 'senha não é exposta');
    try { $app->handle('GET', '/api/produtos'); throw new RuntimeException('API aceitou token ausente'); }
    catch (ApiError $e) { verify($e->status === 401, 'API mantém validação da sessão automática'); }
    $app->handle('POST', '/api/produtos', ['codigo' => 'ABERTO', 'nome' => 'Produto de teste'], [], $token);
    verify(is_file($temp . '/normal.json.demo.json'), 'dados de teste ficam separados');
    verify(file_get_contents($temp . '/normal.json') === $original, 'registros normais não mudam');
    $again = new Application(gp4_store()); $next = $again->handle('POST', '/api/auth/demo')[1];
    verify($again->handle('GET', '/api/produtos', [], [], $next['token'])[1]['total'] === 1, 'reentrada mantém cadastros de teste');
    verify(count(gp4_store()->transaction(fn(array &$s) => $s['usuarios'])) === 1, 'reentrada reutiliza identidade de teste');
    $again->handle('POST', '/api/auth/logout', [], [], $next['token']);
    try { $again->handle('GET', '/api/produtos', [], [], $next['token']); throw new RuntimeException('Token não foi revogado'); }
    catch (ApiError $e) { verify($e->status === 401, 'revogação da sessão continua funcionando'); }
    echo "\n$count verificações da versão aberta passaram.\n";
} finally {
    putenv($previousMode === false ? 'DEMO_MODE' : 'DEMO_MODE=' . $previousMode);
    putenv($previousPath === false ? 'STORAGE_PATH' : 'STORAGE_PATH=' . $previousPath);
    foreach (glob($temp . '/*') as $file) unlink($file);
    rmdir($temp);
}
