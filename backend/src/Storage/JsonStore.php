<?php
declare(strict_types=1);
namespace GP4\Storage;
final class JsonStore implements Store {
    public function __construct(private readonly string $path) {}
    public function transaction(callable $callback): mixed {
        $dir = dirname($this->path);
        if (!is_dir($dir) && !mkdir($dir, 0700, true) && !is_dir($dir)) throw new \RuntimeException('storage unavailable');
        $lock = fopen($this->path . '.lock', 'c');
        if ($lock === false) throw new \RuntimeException('lock unavailable');
        chmod($this->path . '.lock', 0600);
        $temp = null;
        try {
            if (!flock($lock, LOCK_EX)) throw new \RuntimeException('lock failed');
            $state = is_file($this->path)
                ? json_decode(file_get_contents($this->path), true, 512, JSON_THROW_ON_ERROR)
                : ['seq' => [], 'usuarios' => [], 'tokens' => [], 'tentativas' => [], 'produtos' => [],
                   'lotes' => [], 'criterios' => [], 'checklists' => [], 'inspecoes' => [],
                   'respostas' => [], 'nao_conformidades' => [], 'evidencias' => [], 'auditoria' => []];
            if (!is_array($state) || !isset($state['seq'])) throw new \RuntimeException('invalid storage');
            $before = $state;
            $result = $callback($state);
            if ($before !== $state || !is_file($this->path)) {
                $json = json_encode($state, JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
                $temp = tempnam($dir, '.state-');
                if ($temp === false) throw new \RuntimeException('temporary storage failed');
                chmod($temp, 0600);
                $handle = fopen($temp, 'wb');
                if ($handle === false) throw new \RuntimeException('write unavailable');
                try {
                    if (fwrite($handle, $json) !== strlen($json) || !fflush($handle)) throw new \RuntimeException('write failed');
                    if (function_exists('fsync') && !fsync($handle)) throw new \RuntimeException('sync failed');
                } finally { fclose($handle); }
                if (!rename($temp, $this->path)) throw new \RuntimeException('commit failed');
                $temp = null;
            }
            return $result;
        } finally {
            if ($temp !== null && is_file($temp)) unlink($temp);
            flock($lock, LOCK_UN); fclose($lock);
        }
    }
}
