<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
require dirname(__DIR__) . '/bootstrap.php';
use GP4\Domain\Auth;
use GP4\Storage\JsonStore;

$count = 0;
function verify(bool $condition, string $message): void {
    global $count; if (!$condition) throw new RuntimeException('FALHOU: ' . $message);
    echo 'ok ' . ++$count . ' - ' . $message . "\n";
}
function request(string $method, string $path, int $expected, mixed $body = null, string $token = '', ?string $type = null): array {
    global $base;
    $headers = "Connection: close\r\n";
    if ($token !== '') $headers .= "Authorization: Bearer $token\r\n";
    if ($body !== null) {
        $type ??= 'application/json'; $headers .= "Content-Type: $type\r\n";
        if (!is_string($body)) $body = json_encode($body, JSON_THROW_ON_ERROR);
    }
    $ctx = stream_context_create(['http' => ['method' => $method, 'header' => $headers, 'content' => $body ?? '', 'ignore_errors' => true, 'timeout' => 10]]);
    $raw = file_get_contents($base . $path, false, $ctx);
    $responseHeaders = $http_response_header ?? [];
    preg_match('/HTTP\/\S+ ([0-9]{3})/', $responseHeaders[0] ?? '', $m);
    verify((int)($m[1] ?? 0) === $expected, "$method $path -> $expected");
    return ['body' => json_decode($raw, true), 'raw' => $raw, 'headers' => $responseHeaders];
}
function multipart(string $bytes, string $filename = 'foto.png', string $mime = 'image/png'): array {
    $boundary = 'gp4-test-boundary';
    return ["--$boundary\r\nContent-Disposition: form-data; name=\"arquivo\"; filename=\"$filename\"\r\nContent-Type: $mime\r\n\r\n$bytes\r\n--$boundary--\r\n", "multipart/form-data; boundary=$boundary"];
}
$temp = sys_get_temp_dir() . '/gp4-http-' . bin2hex(random_bytes(8)); mkdir($temp, 0700);
$path = $temp . '/state.json'; $store = new JsonStore($path . '.demo.json');
$store->transaction(fn(array &$s) => Auth::create($s, ['nome' => 'Teste HTTP', 'email' => 'admin@example.test', 'senha' => 'Teste-local-12345', 'perfil' => 'admin']));
$socket = stream_socket_server('tcp://127.0.0.1:0', $errno, $error);
$address = stream_socket_get_name($socket, false); fclose($socket);
$base = 'http://' . $address;
putenv('STORAGE_PATH=' . $path);
$proc = proc_open([PHP_BINARY, '-d', 'upload_max_filesize=5M', '-d', 'post_max_size=6M', '-S', $address, '-t', 'public', 'public/index.php'], [0 => ['pipe', 'r'], 1 => ['file', $temp . '/server.log', 'a'], 2 => ['file', $temp . '/server.log', 'a']], $pipes, dirname(__DIR__));
try {
    $ready = false;
    for ($retry = 0; $retry < 50; $retry++) {
        $conn = @stream_socket_client('tcp://' . $address, $errno, $error, 0.1);
        if ($conn) { fclose($conn); $ready = true; break; } usleep(100000);
    }
    verify($ready, 'servidor PHP iniciou');
    request('GET', '/api/health', 200);
    $denied = request('GET', '/api/produtos', 401);
    verify(isset($denied['body']['erro'], $denied['body']['requestId']), 'erro padronizado com identificador');
    request('POST', '/api/auth/login', 400, '{invalido');
    request('POST', '/api/auth/login', 400, '[]');
    request('POST', '/api/auth/login', 415, 'email=x', '', 'text/plain');
    $a = request('POST', '/api/auth/login', 200, ['email' => 'admin@example.test', 'senha' => 'Teste-local-12345'])['body']['token'];
    $user = request('POST', '/api/usuarios', 201, ['nome' => 'Outro inspetor', 'email' => 'other@example.test', 'senha' => 'Teste-local-12345', 'perfil' => 'inspetor'], $a)['body'];
    $j = request('POST', '/api/auth/login', 200, ['email' => 'other@example.test', 'senha' => 'Teste-local-12345'])['body']['token'];
    $p = request('POST', '/api/produtos', 201, ['codigo' => 'HTTP-1', 'nome' => 'Peça'], $a)['body'];
    $c = request('POST', '/api/criterios', 201, ['nome' => 'Visual'], $a)['body'];
    $cl = request('POST', '/api/checklists', 201, ['nome' => 'Visual padrão', 'itens' => [['criterio_id' => $c['id']]]], $a)['body'];
    $lot = request('POST', '/api/lotes', 201, ['codigo' => 'L-HTTP', 'produto_id' => $p['id'], 'quantidade' => 5, 'data_fabricacao' => '2026-01-01'], $a)['body'];
    $i = request('POST', '/api/inspecoes', 201, ['lote_id' => $lot['id'], 'checklist_id' => $cl['id']], $a)['body'];
    $answer = request('PUT', '/api/inspecoes/' . $i['id'] . '/respostas/1', 200, ['resultado' => 'nao_conforme'], $a)['body'];
    $n = request('POST', '/api/respostas/' . $answer['id'] . '/nao-conformidade', 201, ['descricao' => 'Arranhão'], $a)['body'];
    $url = '/api/nao-conformidades/' . $n['id'] . '/evidencias';
    $png = base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lGQAAAAASUVORK5CYII=');
    [$body, $type] = multipart($png);
    request('POST', $url, 401, $body, '', $type);
    request('POST', $url, 403, $body, $j, $type);
    [$fake, $fakeType] = multipart('<?php echo "x";', 'mentira.jpg', 'image/jpeg');
    request('POST', $url, 422, $fake, $a, $fakeType);
    [$large, $largeType] = multipart(str_repeat('a', 5242881));
    request('POST', $url, 413, $large, $a, $largeType);
    $e = request('POST', $url, 201, $body, $a, $type)['body'];
    verify(!isset($e['conteudo_base64']) && $e['sha256'] === hash('sha256', $png), 'metadados e integridade da foto');
    request('GET', '/api/evidencias/' . $e['id'], 403, null, $j);
    $download = request('GET', '/api/evidencias/' . $e['id'], 200, null, $a);
    verify($download['raw'] === $png, 'foto recuperada byte a byte');
    verify(in_array('Content-Type: image/png', $download['headers'], true), 'MIME real na resposta');
    request('GET', '/api/produtos?sort[]=id', 422, null, $a);
    request('GET', '/api/historico?status=reprovada', 200, null, $a);
    request('POST', '/api/inspecoes/' . $i['id'] . '/finalizar', 200, null, $a);
    request('POST', $url, 409, $body, $a, $type);
    request('GET', '/api/evidencias/' . $e['id'], 200, null, $a);
    request('GET', '/api/relatorios/inspecoes.csv', 200, null, $a);
    // Fluxo aprovado, incluindo visibilidade do próprio inspetor e leitura gerencial.
    $lot2 = request('POST', '/api/lotes', 201, ['codigo' => 'L-APROVADO', 'produto_id' => $p['id'], 'quantidade' => 2, 'data_fabricacao' => '2026-01-01'], $a)['body'];
    $i2 = request('POST', '/api/inspecoes', 201, ['lote_id' => $lot2['id'], 'checklist_id' => $cl['id']], $j)['body'];
    request('PUT', '/api/inspecoes/' . $i2['id'] . '/respostas/1', 200, ['resultado' => 'conforme'], $j);
    $finished = request('POST', '/api/inspecoes/' . $i2['id'] . '/finalizar', 200, null, $j)['body'];
    verify($finished['status'] === 'aprovada', 'fluxo aprovado');
    $metrics = request('GET', '/api/indicadores', 200, null, $a)['body'];
    verify($metrics['taxa_aprovacao'] == 50 && $metrics['taxa_reprovacao'] == 50, 'indicadores com duas inspeções');
    request('GET', '/api/inspecoes/' . $i2['id'], 200, null, $a);
    request('POST', '/api/auth/logout', 204, null, $j);
    request('GET', '/api/auth/me', 401, null, $j);
    $logs = file_get_contents($temp . '/server.log');
    verify(!str_contains($logs, $a) && !str_contains($logs, 'Teste-local-12345') && !str_contains($logs, 'conteudo_base64'), 'logs sem senha, token ou foto');
    echo "\n$count verificações HTTP passaram.\n";
} finally {
    proc_terminate($proc); proc_close($proc);
    foreach (glob($temp . '/*') as $file) unlink($file); rmdir($temp);
}
