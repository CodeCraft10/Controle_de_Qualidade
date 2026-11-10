<?php
declare(strict_types=1);
namespace GP4\Domain;
use GP4\Http\ApiError;
final class Rules {
    public static function text(mixed $value, string $field, int $max = 200): string {
        if (!is_string($value) || trim($value) === '' || strlen($value) > $max) throw new ApiError(422, "$field é obrigatório e deve ter até $max bytes");
        return trim($value);
    }
    public static function id(mixed $value): int {
        if ((!is_int($value) && !is_string($value)) || !preg_match('/^[1-9][0-9]{0,8}$/', (string)$value)) throw new ApiError(422, 'Identificador inválido');
        return (int)$value;
    }
    public static function boolean(mixed $value): bool {
        if (!is_bool($value)) throw new ApiError(422, 'Use booleano true ou false');
        return $value;
    }
    public static function choice(mixed $value, array $options, string $field): string {
        if (!is_string($value) || !in_array($value, $options, true)) throw new ApiError(422, "$field inválido");
        return $value;
    }
    public static function password(mixed $value): string {
        if (!is_string($value) || strlen($value) < 12 || strlen($value) > 72) throw new ApiError(422, 'Senha deve ter de 12 a 72 bytes');
        return $value;
    }
    public static function email(mixed $value): string {
        $email = strtolower(self::text($value, 'email', 254));
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) throw new ApiError(422, 'Email inválido');
        return $email;
    }
    public static function date(mixed $value): string {
        $text = self::text($value, 'data', 10);
        $date = \DateTimeImmutable::createFromFormat('!Y-m-d', $text);
        if (!$date || $date->format('Y-m-d') !== $text) throw new ApiError(422, 'Data deve ser válida no formato YYYY-MM-DD');
        return $text;
    }
    public static function finalResult(array $items, array $answers, array $deviations): string {
        if (!$answers) throw new ApiError(409, 'Inspeção sem respostas');
        foreach ($items as $item) {
            $answer = array_values(array_filter($answers, fn($a) => $a['item_id'] === $item['id']))[0] ?? null;
            if ($item['obrigatorio'] && !$answer) throw new ApiError(409, 'Responda todos os itens obrigatórios');
        }
        $failed = false;
        foreach ($answers as $answer) {
            if ($answer['resultado'] === 'nao_conforme') {
                $failed = true;
                if (!array_filter($deviations, fn($d) => $d['resposta_id'] === $answer['id'])) throw new ApiError(409, 'Registre um desvio para cada resposta não conforme');
            }
        }
        return $failed ? 'reprovada' : 'aprovada';
    }
}
