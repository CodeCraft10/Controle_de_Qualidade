<?php
declare(strict_types=1);

// Única entrada pública: nunca expõe fontes, .env, estado ou arquivos do repositório.
$path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
if (!is_string($path)) { http_response_code(400); exit; }
if ($path === '/api' || str_starts_with($path, '/api/')) {
    require dirname(__DIR__) . '/backend/public/index.php';
    return;
}
header('X-Content-Type-Options: nosniff');
header('Referrer-Policy: same-origin');
header_remove('X-Powered-By');
header("Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'");
if (!in_array($_SERVER['REQUEST_METHOD'] ?? 'GET', ['GET', 'HEAD'], true)) {
    http_response_code(405); header('Allow: GET, HEAD'); exit;
}
$dist = dirname(__DIR__) . '/web';
if (in_array($path, ['/', '/index.php', '/index.html'], true)) {
    $file = $dist . '/index.html'; $type = 'text/html; charset=utf-8';
    header('Cache-Control: no-store');
} else {
    // Allowlist de caminhos e MIME; realpath também bloqueia traversal e links para fora.
    $decoded = rawurldecode($path);
    if (!preg_match('#^/(assets/[A-Za-z0-9_.-]+|favicon\.svg)$#D', $decoded)) { http_response_code(404); exit; }
    $file = realpath($dist . $decoded);
    $root = realpath($dist);
    if (!$file || !$root || !str_starts_with($file, $root . DIRECTORY_SEPARATOR)) { http_response_code(404); exit; }
    $types = ['js' => 'text/javascript; charset=utf-8', 'css' => 'text/css; charset=utf-8', 'svg' => 'image/svg+xml', 'woff2' => 'font/woff2', 'woff' => 'font/woff', 'png' => 'image/png'];
    $type = $types[pathinfo($file, PATHINFO_EXTENSION)] ?? null;
    if (!$type) { http_response_code(404); exit; }
    header('Cache-Control: public, max-age=3600');
}
if (!is_file($file)) {
    http_response_code(503); header('Content-Type: text/plain; charset=utf-8');
    echo 'Arquivos da interface ausentes. Atualize o repositório completo.'; exit;
}
header('Content-Type: ' . $type);
header('Content-Length: ' . filesize($file));
if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'HEAD') readfile($file);
