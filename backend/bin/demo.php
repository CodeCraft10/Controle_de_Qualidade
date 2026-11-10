<?php
declare(strict_types=1);
if (PHP_SAPI !== 'cli') { http_response_code(404); exit; }
$mode = $argv[1] ?? '';
if (!in_array($mode, ['on', 'off'], true)) {
    fwrite(STDERR, "Uso: php backend/bin/demo.php on|off\n"); exit(1);
}
$file = dirname(__DIR__) . '/.env';
$text = is_file($file) ? file_get_contents($file) : '';
if ($text === false) { fwrite(STDERR, "Não foi possível ler backend/.env\n"); exit(1); }
$value = 'DEMO_MODE=' . ($mode === 'on' ? 'true' : 'false');
$text = preg_replace('/^[ \t]*DEMO_MODE[ \t]*=.*\R?/m', '', $text);
$text = rtrim($text) . "\n" . $value . "\n";
$temp = tempnam(dirname($file), '.demo-config-');
if ($temp === false) { fwrite(STDERR, "Não foi possível gravar configuração\n"); exit(1); }
chmod($temp, 0600);
if (file_put_contents($temp, $text, LOCK_EX) === false || !rename($temp, $file)) {
    @unlink($temp); fwrite(STDERR, "Não foi possível atualizar backend/.env\n"); exit(1);
}
echo $mode === 'on'
    ? "Demonstração ativada: entrada sem login e dados de teste separados. Atualize a página.\n"
    : "Demonstração desativada: login normal restaurado. Atualize a página.\n";
echo "Uma variável DEMO_MODE definida no servidor tem prioridade sobre backend/.env.\n";
