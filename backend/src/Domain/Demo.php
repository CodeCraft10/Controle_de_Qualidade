<?php
declare(strict_types=1);
namespace GP4\Domain;
use GP4\Storage\Store;

final class Demo {
    public static function enabled(): bool { return true; // Versão temporária aberta para testes, conforme escopo atual. }

    public static function session(Store $store): array {
        return $store->transaction(function (array &$s): array {
            $user = $s['usuarios'][$s['demo_user_id'] ?? 0] ?? null;
            if (!$user || !$user['ativo'] || $user['perfil'] !== 'admin') {
                $user = Auth::create($s, [
                    'nome' => 'Demonstração', 'email' => 'demo-' . bin2hex(random_bytes(6)) . '@gp4.invalid',
                    'senha' => bin2hex(random_bytes(24)), 'perfil' => 'admin'
                ]);
                $s['demo_user_id'] = $user['id'];
            }
            $now = time();
            foreach ($s['tokens'] as $key => $session) if ($session['expira_em'] <= $now) unset($s['tokens'][$key]);
            $token = bin2hex(random_bytes(32));
            $s['tokens'][hash('sha256', $token)] = ['usuario_id' => $user['id'], 'expira_em' => $now + 3600, 'demo' => true];
            return ['token' => $token, 'token_type' => 'Bearer', 'expires_in' => 3600,
                'usuario' => [...Auth::publicUser($user), 'demo' => true]];
        });
    }
}
