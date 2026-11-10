<?php
declare(strict_types=1);
namespace GP4\Domain;
use GP4\Http\ApiError;
use GP4\Storage\Store;
final class Auth {
    public static function publicUser(array $u): array { unset($u['senha_hash']); return $u; }
    public static function role(array $u, array $roles): void {
        if (!in_array($u['perfil'], $roles, true)) throw new ApiError(403, 'Perfil sem permissão');
    }
    public static function user(array $s, string $token): array {
        $session = $s['tokens'][hash('sha256', $token)] ?? null;
        if (($session['demo'] ?? false) && !Demo::enabled()) throw new ApiError(401, 'Modo demonstração desativado');
        if (!$session || $session['expira_em'] <= time()) throw new ApiError(401, 'Sessão inválida ou expirada');
        $user = $s['usuarios'][$session['usuario_id']] ?? null;
        if (!$user || !$user['ativo']) throw new ApiError(401, 'Conta inativa');
        return $user;
    }
    public static function login(Store $store, array $body, string $ip): array {
        $email = Rules::email($body['email'] ?? null);
        $password = is_string($body['senha'] ?? null) ? $body['senha'] : '';
        // Resultado de falha é retornado para persistir o contador; lançar dentro causaria rollback.
        $result = $store->transaction(function (array &$s) use ($email, $password, $ip) {
            $now = time(); $window = max(60, (int)(getenv('LOGIN_WINDOW_SECONDS') ?: 900));
            foreach ($s['tentativas'] as $key => $entry) if ($entry['inicio'] + $window <= $now) unset($s['tentativas'][$key]);
            foreach ($s['tokens'] as $key => $session) if ($session['expira_em'] <= $now) unset($s['tokens'][$key]);
            $key = hash('sha256', $ip); $entry = $s['tentativas'][$key] ?? ['inicio' => $now, 'quantidade' => 0];
            if ($entry['quantidade'] >= max(1, (int)(getenv('LOGIN_MAX_ATTEMPTS') ?: 10))) return ['error' => 429];
            $user = array_values(array_filter($s['usuarios'], fn($u) => $u['email'] === $email))[0] ?? null;
            $hash = $user['senha_hash'] ?? '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2uheWG/igi.';
            $valid = password_verify($password, $hash);
            if (!$user || !$valid || !$user['ativo']) {
                $entry['quantidade']++; $s['tentativas'][$key] = $entry; return ['error' => 401];
            }
            unset($s['tentativas'][$key]);
            $token = bin2hex(random_bytes(32));
            $ttl = max(60, (int)(getenv('TOKEN_TTL') ?: 28800));
            $s['tokens'][hash('sha256', $token)] = ['usuario_id' => $user['id'], 'expira_em' => $now + $ttl];
            return ['token' => $token, 'token_type' => 'Bearer', 'expires_in' => $ttl, 'usuario' => self::publicUser($user)];
        });
        if (isset($result['error'])) throw new ApiError($result['error'], $result['error'] === 429 ? 'Muitas tentativas; aguarde a janela de login' : 'Credenciais inválidas');
        return $result;
    }
    public static function create(array &$s, array $body): array {
        $email = Rules::email($body['email'] ?? null); Records::unique($s, 'usuarios', 'email', $email);
        return Records::add($s, 'usuarios', [
            'nome' => Rules::text($body['nome'] ?? null, 'nome'), 'email' => $email,
            'senha_hash' => password_hash(Rules::password($body['senha'] ?? null), PASSWORD_BCRYPT, ['cost' => 12]),
            'perfil' => Rules::choice($body['perfil'] ?? null, ['admin', 'supervisor', 'inspetor'], 'perfil'), 'ativo' => true
        ]);
    }
}
