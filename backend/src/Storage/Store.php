<?php
declare(strict_types=1);
namespace GP4\Storage;
interface Store {
    /** A callback recebe o estado por referência. Exceção desfaz todas as alterações. */
    public function transaction(callable $callback): mixed;
}
