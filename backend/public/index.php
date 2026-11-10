<?php
declare(strict_types=1);
require dirname(__DIR__) . '/bootstrap.php';
use GP4\Http\{ApiError, Application};

ini_set('display_errors', '0');
$requestId = bin2hex(random_bytes(12)); $started = microtime(true);
header('X-Request-Id: ' . $requestId); header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store'); header("Content-Security-Policy: default-src 'none'; frame-ancestors 'none'");
header('Referrer-Policy: no-referrer'); header_remove('X-Powered-By');
try {
    $method = $_SERVER['REQUEST_METHOD'];
    $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
    if (!is_string($path)) throw new ApiError(400, 'URL inválida');
    $body = [];
    $length = (int)($_SERVER['CONTENT_LENGTH'] ?? 0);
    $contentType = strtolower(explode(';', $_SERVER['CONTENT_TYPE'] ?? '')[0]);
    $multipart = $contentType === 'multipart/form-data';
    if ($multipart && $method !== 'POST') throw new ApiError(415, 'Multipart exige POST');
    if ($multipart && !preg_match('#^/api/nao-conformidades/[1-9][0-9]{0,8}/evidencias$#', $path)) throw new ApiError(415, 'Multipart somente para evidências');
    $maxUpload = min(5242880, max(1, (int)(getenv('MAX_UPLOAD_BYTES') ?: 5242880)));
    if ($length > ($multipart ? $maxUpload + 65536 : 1048576)) throw new ApiError(413, 'Corpo excede limite permitido');
    if (!$multipart && in_array($method, ['POST', 'PUT', 'PATCH'], true)) {
        $raw = file_get_contents('php://input', false, null, 0, 1048577);
        if (strlen($raw) > 1048576) throw new ApiError(413, 'JSON excede 1 MiB');
        if ($raw !== '') {
            if ($contentType !== 'application/json') throw new ApiError(415, 'Use Content-Type application/json');
            try { $obj = json_decode($raw, false, 64, JSON_THROW_ON_ERROR); }
            catch (\JsonException) { throw new ApiError(400, 'JSON inválido'); }
            if (!$obj instanceof \stdClass) throw new ApiError(400, 'Corpo deve ser um objeto JSON');
            $body = json_decode($raw, true, 64, JSON_THROW_ON_ERROR);
        }
    }
    $auth = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    $token = preg_match('/^Bearer ([a-f0-9]{64})$/', $auth, $m) ? $m[1] : '';
    [$status, $payload, $headers] = (new Application(gp4_store()))->handle($method, $path, $body, $_GET, $token, $_FILES, $_SERVER['REMOTE_ADDR'] ?? 'local');
} catch (ApiError $e) {
    $status = $e->status; $payload = ['erro' => $e->getMessage(), 'requestId' => $requestId]; $headers = [];
    if ($status === 429) $headers['Retry-After'] = (string)max(60, (int)(getenv('LOGIN_WINDOW_SECONDS') ?: 900));
} catch (\Throwable) {
    $status = 500; $payload = ['erro' => 'Erro interno', 'requestId' => $requestId]; $headers = [];
}
http_response_code($status);
foreach ($headers as $key => $value) header($key . ': ' . $value);
if (!isset($headers['Content-Type'])) header('Content-Type: application/json; charset=utf-8');
if ($status !== 204) echo is_string($payload) ? $payload : json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR);
// Não grava corpos, query strings, emails, senhas, tokens nem conteúdo de fotos.
error_log(json_encode(['requestId' => $requestId, 'method' => $_SERVER['REQUEST_METHOD'], 'status' => $status, 'duration_ms' => round((microtime(true) - $started) * 1000)]));
