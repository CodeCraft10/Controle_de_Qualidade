<?php
declare(strict_types=1);
require dirname(__DIR__, 2) . '/bootstrap.php';
use GP4\Domain\Auth;
if (PHP_SAPI !== 'cli') exit(1);
$accounts = json_decode(stream_get_contents(STDIN), true, 32, JSON_THROW_ON_ERROR);
$ids = gp4_store()->transaction(function (array &$s) use ($accounts): array {
    if ($s['usuarios']) throw new RuntimeException('Fixture exige armazenamento vazio');
    $ids = [];
    foreach ($accounts as $key => $a) {
        $user = Auth::create($s, ['nome' => $a['nome'], 'email' => $a['email'], 'senha' => $a['password'], 'perfil' => $a['perfil']]);
        $ids[$key] = $user['id'];
    }
    return $ids;
});
echo json_encode($ids, JSON_THROW_ON_ERROR);
