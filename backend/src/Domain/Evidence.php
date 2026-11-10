<?php
declare(strict_types=1);
namespace GP4\Domain;
use GP4\Http\ApiError;
final class Evidence {
    public static function upload(array &$s, array $u, int $id, ?array $file): array {
        $n = Records::get($s, 'nao_conformidades', $id);
        Inspections::access($u, Records::get($s, 'inspecoes', $n['inspecao_id']), true);
        if (!$file || !is_int($file['error'] ?? null)) throw new ApiError(422, 'Envie foto no campo arquivo');
        if (in_array($file['error'], [UPLOAD_ERR_INI_SIZE, UPLOAD_ERR_FORM_SIZE], true)) throw new ApiError(413, 'Foto excede limite');
        if ($file['error'] !== UPLOAD_ERR_OK || !is_string($file['tmp_name'] ?? null) || !is_uploaded_file($file['tmp_name'])) throw new ApiError(422, 'Falha no upload');
        $max = min(5242880, max(1, (int)(getenv('MAX_UPLOAD_BYTES') ?: 5242880)));
        $size = filesize($file['tmp_name']);
        if ($size === false || $size < 1 || $size > $max) throw new ApiError(413, 'Foto excede limite');
        $mime = (new \finfo(FILEINFO_MIME_TYPE))->file($file['tmp_name']);
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) throw new ApiError(422, 'Tipo permitido: JPEG, PNG ou WebP');
        $image = @getimagesize($file['tmp_name']);
        if (!$image || $image['mime'] !== $mime || $image[0] * $image[1] > 40000000) throw new ApiError(422, 'Imagem inválida ou muito grande');
        $existing = array_filter($s['evidencias'], fn($e) => $e['nao_conformidade_id'] === $id);
        if (count($existing) >= 10) throw new ApiError(409, 'Limite de 10 fotos por desvio');
        $bytes = file_get_contents($file['tmp_name']);
        if ($bytes === false) throw new \RuntimeException('upload read failed');
        $e = Records::add($s, 'evidencias', ['nao_conformidade_id' => $id, 'nome_original' => substr(preg_replace('/[\x00-\x1f\x7f]/', '', basename(str_replace('\\', '/', (string)($file['name'] ?? 'foto')))), 0, 200), 'mime' => $mime, 'tamanho' => $size,
            'sha256' => hash('sha256', $bytes), 'conteudo_base64' => base64_encode($bytes)]);
        Records::audit($s, $u['id'], 'anexar', 'nao_conformidades', $id); return self::metadata($e);
    }
    public static function metadata(array $e): array { unset($e['conteudo_base64']); return $e; }
    public static function get(array $s, array $u, int $id): array {
        $e = Records::get($s, 'evidencias', $id); $n = Records::get($s, 'nao_conformidades', $e['nao_conformidade_id']);
        Inspections::access($u, Records::get($s, 'inspecoes', $n['inspecao_id'])); return $e;
    }
}
