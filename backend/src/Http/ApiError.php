<?php
declare(strict_types=1);
namespace GP4\Http;
final class ApiError extends \RuntimeException {
    public function __construct(public readonly int $status, string $message) { parent::__construct($message); }
}
