<?php
declare(strict_types=1);
namespace GP4\Storage;

use DateTimeImmutable;
use DateTimeZone;
use PDO;
use RuntimeException;
use Throwable;

/** Compatibility adapter for the current array-based domain; intended for demos. */
final class MySqlStore implements Store {
    private const UTC = 'UTC';

    public function __construct(private readonly PDO $pdo) {
        $this->pdo->exec("SET time_zone = '+00:00'");
    }

    public function transaction(callable $callback): mixed {
        if ($this->pdo->inTransaction()) throw new RuntimeException('nested transaction is not supported');
        $this->pdo->beginTransaction();
        try {
            $lock = $this->pdo->query('SELECT id FROM gp4_store_lock WHERE id = 1 FOR UPDATE')->fetchColumn();
            if ((int)$lock !== 1) throw new RuntimeException('API storage lock is missing; apply database migrations');
            $before = $this->loadState();
            $after = $before;
            $result = $callback($after);
            $this->persistChanges($before, $after);
            $this->pdo->commit();
            return $result;
        } catch (Throwable $error) {
            if ($this->pdo->inTransaction()) $this->pdo->rollBack();
            throw $error;
        }
    }

    private function loadState(): array {
        $s = [
            'seq' => [], 'usuarios' => [], 'tokens' => [], 'tentativas' => [], 'produtos' => [],
            'lotes' => [], 'criterios' => [], 'checklists' => [], 'inspecoes' => [],
            'respostas' => [], 'nao_conformidades' => [], 'evidencias' => [], 'auditoria' => [],
        ];

        foreach ($this->rows('SELECT * FROM usuarios ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['usuarios'][$id] = [
                'id' => $id, 'nome' => $r['nome'], 'email' => $r['email'], 'senha_hash' => $r['senha_hash'],
                'perfil' => $r['perfil'], 'ativo' => (bool)$r['ativo'], 'criado_em' => self::iso($r['criado_em']),
            ];
        }
        foreach ($this->rows('SELECT * FROM sessoes ORDER BY token_hash') as $r) {
            $s['tokens'][$r['token_hash']] = [
                'usuario_id' => (int)$r['usuario_id'], 'expira_em' => self::unix($r['expira_em']),
                'demo' => (bool)$r['sessao_demo'],
            ];
        }
        foreach ($this->rows('SELECT * FROM tentativas_login ORDER BY ip_hash') as $r) {
            $s['tentativas'][$r['ip_hash']] = [
                'inicio' => self::unix($r['inicio_em']), 'quantidade' => (int)$r['quantidade'],
            ];
        }
        foreach ($this->rows('SELECT * FROM produtos ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['produtos'][$id] = [
                'id' => $id, 'codigo' => $r['codigo'], 'nome' => $r['nome'], 'descricao' => $r['descricao'],
                'ativo' => (bool)$r['ativo'], 'criado_em' => self::iso($r['criado_em']),
            ];
        }
        foreach ($this->rows('SELECT * FROM lotes ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['lotes'][$id] = [
                'id' => $id, 'codigo' => $r['codigo'], 'produto_id' => (int)$r['produto_id'],
                'quantidade' => (int)$r['quantidade'], 'data_fabricacao' => $r['data_fabricacao'],
                'status' => $r['status'], 'ativo' => (bool)$r['ativo'], 'criado_em' => self::iso($r['criado_em']),
            ];
        }
        foreach ($this->rows('SELECT * FROM criterios ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['criterios'][$id] = [
                'id' => $id, 'nome' => $r['nome'], 'descricao' => $r['descricao'],
                'ativo' => (bool)$r['ativo'], 'criado_em' => self::iso($r['criado_em']),
            ];
        }
        foreach ($this->rows('SELECT * FROM checklists ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['checklists'][$id] = [
                'id' => $id, 'nome' => $r['nome'], 'descricao' => $r['descricao'],
                'ativo' => (bool)$r['ativo'], 'criado_em' => self::iso($r['criado_em']), 'itens' => [],
            ];
        }
        foreach ($this->rows('SELECT * FROM checklist_itens ORDER BY checklist_id, item_id') as $r) {
            $checklistId = (int)$r['checklist_id'];
            $s['checklists'][$checklistId]['itens'][] = [
                'id' => (int)$r['item_id'], 'criterio_id' => (int)$r['criterio_id'],
                'obrigatorio' => (bool)$r['obrigatorio'],
            ];
        }
        foreach ($this->rows('SELECT * FROM inspecoes ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['inspecoes'][$id] = [
                'id' => $id, 'lote_id' => (int)$r['lote_id'], 'checklist_id' => (int)$r['checklist_id'],
                'inspetor_id' => (int)$r['inspetor_id'], 'produto_id' => (int)$r['produto_id'],
                'produto_nome' => $r['produto_nome_snapshot'], 'lote_codigo' => $r['lote_codigo_snapshot'],
                'checklist_nome' => $r['checklist_nome_snapshot'], 'status' => $r['status'], 'itens' => [],
                'iniciada_em' => self::iso($r['iniciada_em']),
                'finalizada_em' => self::isoNullable($r['finalizada_em']), 'criado_em' => self::iso($r['criado_em']),
            ];
        }
        foreach ($this->rows('SELECT * FROM inspecao_itens ORDER BY inspecao_id, item_id') as $r) {
            $inspectionId = (int)$r['inspecao_id'];
            $s['inspecoes'][$inspectionId]['itens'][] = [
                'id' => (int)$r['item_id'], 'criterio_id' => (int)$r['criterio_id'],
                'criterio_nome' => $r['criterio_nome_snapshot'],
                'criterio_descricao' => $r['criterio_descricao_snapshot'],
                'obrigatorio' => (bool)$r['obrigatorio'],
            ];
        }
        foreach ($this->rows('SELECT * FROM respostas_inspecao ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['respostas'][$id] = [
                'id' => $id, 'inspecao_id' => (int)$r['inspecao_id'], 'item_id' => (int)$r['item_id'],
                'resultado' => $r['resultado'], 'observacao' => $r['observacao'],
                'criado_em' => self::iso($r['criado_em']), 'atualizado_em' => self::iso($r['atualizado_em']),
            ];
        }
        foreach ($this->rows('SELECT * FROM nao_conformidades ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['nao_conformidades'][$id] = [
                'id' => $id, 'resposta_id' => (int)$r['resposta_id'], 'inspecao_id' => (int)$r['inspecao_id'],
                'item_id' => (int)$r['item_id'], 'descricao' => $r['descricao'], 'classificacao' => $r['classificacao'],
                'status' => $r['status'], 'criado_em' => self::iso($r['criado_em']),
                'historico' => [],
            ];
        }
        foreach ($this->rows('SELECT * FROM historico_nao_conformidade ORDER BY id') as $r) {
            $ncId = (int)$r['nao_conformidade_id'];
            $s['nao_conformidades'][$ncId]['historico'][] = [
                'status' => $r['status'], 'usuario_id' => (int)$r['usuario_id'],
                'criado_em' => self::iso($r['criado_em']),
            ];
        }
        foreach ($this->rows('SELECT * FROM evidencias ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $s['evidencias'][$id] = [
                'id' => $id, 'nao_conformidade_id' => (int)$r['nao_conformidade_id'],
                'nome_original' => $r['nome_original'], 'mime' => $r['mime'], 'tamanho' => (int)$r['tamanho'],
                'sha256' => $r['sha256'], 'conteudo_base64' => base64_encode($r['conteudo']),
                'criado_em' => self::iso($r['criado_em']),
            ];
        }
        foreach ($this->rows('SELECT * FROM historico_auditoria ORDER BY id') as $r) {
            $id = (int)$r['id'];
            $details = json_decode($r['detalhes'], true);
            $s['auditoria'][$id] = [
                'id' => $id, 'usuario_id' => $r['usuario_id'] === null ? null : (int)$r['usuario_id'],
                'acao' => $r['acao'], 'recurso' => $r['recurso'], 'recurso_id' => (int)$r['recurso_id'],
                'detalhes' => is_array($details) ? $details : [], 'criado_em' => self::iso($r['criado_em']),
            ];
        }
        $setting = $this->pdo->query("SELECT setting_value FROM app_settings WHERE setting_key = 'demo_user_id'")->fetchColumn();
        if ($setting !== false) $s['demo_user_id'] = (int)$setting;

        $storedSeq = $this->pdo->query("SELECT setting_value FROM app_settings WHERE setting_key = 'record_sequences'")->fetchColumn();
        if ($storedSeq !== false) {
            $decodedSeq = json_decode((string)$storedSeq, true);
            if (is_array($decodedSeq)) $s['seq'] = $decodedSeq;
        }
        foreach (['usuarios', 'produtos', 'lotes', 'criterios', 'checklists', 'inspecoes', 'respostas', 'nao_conformidades', 'evidencias', 'auditoria'] as $table) {
            $s['seq'][$table] = max((int)($s['seq'][$table] ?? 0), $s[$table] ? (int)max(array_keys($s[$table])) : 0);
        }
        return $s;
    }

    private function persistChanges(array $before, array $after): void {
        $this->syncSimple($before, $after, 'usuarios', fn(array $r) => $this->saveUser($r));
        $this->syncSimple($before, $after, 'produtos', fn(array $r) => $this->saveProduct($r));
        $this->syncSimple($before, $after, 'lotes', fn(array $r) => $this->saveLot($r));
        $this->syncSimple($before, $after, 'criterios', fn(array $r) => $this->saveCriterion($r));
        $this->syncChecklists($before, $after);
        $this->syncInspections($before, $after);
        $this->syncSimple($before, $after, 'respostas', fn(array $r) => $this->saveAnswer($r));
        $this->syncDeviations($before, $after);
        $this->syncSimple($before, $after, 'evidencias', fn(array $r) => $this->saveEvidence($r));
        $this->syncSimple($before, $after, 'auditoria', fn(array $r) => $this->saveAudit($r));
        $this->syncEphemeral($before, $after, 'tokens', 'sessoes', fn(string $key, array $r) => $this->saveSession($key, $r));
        $this->syncEphemeral($before, $after, 'tentativas', 'tentativas_login', fn(string $key, array $r) => $this->saveAttempt($key, $r));
        if (($before['demo_user_id'] ?? null) !== ($after['demo_user_id'] ?? null) && isset($after['demo_user_id'])) {
            $this->exec('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', ['demo_user_id', (string)$after['demo_user_id']]);
        }
        if (($before['seq'] ?? []) !== ($after['seq'] ?? [])) {
            $this->exec('INSERT INTO app_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)', ['record_sequences', json_encode($after['seq'], JSON_THROW_ON_ERROR)]);
        }
    }

    private function syncSimple(array $before, array $after, string $key, callable $save): void {
        $deletable = ['produtos' => 'produtos', 'lotes' => 'lotes', 'criterios' => 'criterios'];
        if (isset($deletable[$key])) {
            foreach ($before[$key] as $id => $_) {
                if (!array_key_exists($id, $after[$key])) $this->exec('DELETE FROM ' . $deletable[$key] . ' WHERE id = ?', [(int)$id]);
            }
        }
        foreach ($after[$key] as $id => $row) {
            if (($before[$key][$id] ?? null) !== $row) $save($row);
        }
    }

    private function syncEphemeral(array $before, array $after, string $stateKey, string $table, callable $save): void {
        foreach ($before[$stateKey] as $key => $_) {
            if (!array_key_exists($key, $after[$stateKey])) $this->exec("DELETE FROM $table WHERE " . ($stateKey === 'tokens' ? 'token_hash' : 'ip_hash') . ' = ?', [$key]);
        }
        foreach ($after[$stateKey] as $key => $row) {
            if (($before[$stateKey][$key] ?? null) !== $row) $save((string)$key, $row);
        }
    }

    private function syncChecklists(array $before, array $after): void {
        foreach ($before['checklists'] as $id => $_) {
            if (!array_key_exists($id, $after['checklists'])) {
                $this->exec('DELETE FROM checklist_itens WHERE checklist_id = ?', [(int)$id]);
                $this->exec('DELETE FROM checklists WHERE id = ?', [(int)$id]);
            }
        }
        foreach ($after['checklists'] as $id => $r) {
            $old = $before['checklists'][$id] ?? null;
            if ($old !== $r) $this->saveChecklist($r);
            $oldItems = $old['itens'] ?? [];
            if ($oldItems !== $r['itens']) {
                $this->exec('DELETE FROM checklist_itens WHERE checklist_id = ?', [(int)$id]);
                foreach ($r['itens'] as $item) {
                    $this->exec('INSERT INTO checklist_itens (checklist_id, item_id, criterio_id, obrigatorio) VALUES (?, ?, ?, ?)', [
                        (int)$id, (int)$item['id'], (int)$item['criterio_id'], (bool)$item['obrigatorio'],
                    ]);
                }
            }
        }
    }

    private function syncInspections(array $before, array $after): void {
        foreach ($after['inspecoes'] as $id => $r) {
            $old = $before['inspecoes'][$id] ?? null;
            if ($old !== $r) $this->saveInspection($r);
            if (($old['itens'] ?? []) !== $r['itens']) {
                foreach ($r['itens'] as $item) {
                    $this->exec('INSERT INTO inspecao_itens (inspecao_id, checklist_id, item_id, criterio_id, criterio_nome_snapshot, criterio_descricao_snapshot, obrigatorio) VALUES (?, ?, ?, ?, ?, ?, ?)', [
                        (int)$id, (int)$r['checklist_id'], (int)$item['id'], (int)$item['criterio_id'],
                        $item['criterio_nome'], $item['criterio_descricao'] ?? '', (bool)$item['obrigatorio'],
                    ]);
                }
            }
        }
    }

    private function syncDeviations(array $before, array $after): void {
        foreach ($after['nao_conformidades'] as $id => $r) {
            $old = $before['nao_conformidades'][$id] ?? null;
            if ($old !== $r) $this->saveDeviation($r);
            $oldHistory = $old['historico'] ?? [];
            $history = $r['historico'] ?? [];
            if (count($history) < count($oldHistory) || array_slice($history, 0, count($oldHistory)) !== $oldHistory) {
                throw new RuntimeException('deviation history must be append-only');
            }
            foreach (array_slice($history, count($oldHistory)) as $event) {
                $this->exec('INSERT INTO historico_nao_conformidade (nao_conformidade_id, status, usuario_id, criado_em) VALUES (?, ?, ?, ?)', [
                    (int)$id, $event['status'], (int)$event['usuario_id'], self::sqlTime($event['criado_em']),
                ]);
            }
        }
    }

    private function saveUser(array $r): void {
        $this->exec('INSERT INTO usuarios (id, nome, email, senha_hash, perfil, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome=VALUES(nome), email=VALUES(email), senha_hash=VALUES(senha_hash), perfil=VALUES(perfil), ativo=VALUES(ativo), atualizado_em=VALUES(atualizado_em)', [
            (int)$r['id'], $r['nome'], $r['email'], $r['senha_hash'], $r['perfil'], (bool)$r['ativo'],
            self::sqlTime($r['criado_em']), self::sqlTime($r['atualizado_em'] ?? $r['criado_em']),
        ]);
    }

    private function saveProduct(array $r): void {
        $this->exec('INSERT INTO produtos (id, codigo, nome, descricao, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE codigo=VALUES(codigo), nome=VALUES(nome), descricao=VALUES(descricao), ativo=VALUES(ativo), atualizado_em=VALUES(atualizado_em)', [
            (int)$r['id'], $r['codigo'], $r['nome'], $r['descricao'], (bool)$r['ativo'],
            self::sqlTime($r['criado_em']), self::sqlTime($r['atualizado_em'] ?? $r['criado_em']),
        ]);
    }

    private function saveLot(array $r): void {
        $this->exec('INSERT INTO lotes (id, codigo, produto_id, quantidade, data_fabricacao, status, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE codigo=VALUES(codigo), produto_id=VALUES(produto_id), quantidade=VALUES(quantidade), data_fabricacao=VALUES(data_fabricacao), status=VALUES(status), ativo=VALUES(ativo), atualizado_em=VALUES(atualizado_em)', [
            (int)$r['id'], $r['codigo'], (int)$r['produto_id'], (int)$r['quantidade'], $r['data_fabricacao'], $r['status'],
            (bool)$r['ativo'], self::sqlTime($r['criado_em']), self::sqlTime($r['atualizado_em'] ?? $r['criado_em']),
        ]);
    }

    private function saveCriterion(array $r): void {
        $this->exec('INSERT INTO criterios (id, nome, descricao, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome=VALUES(nome), descricao=VALUES(descricao), ativo=VALUES(ativo), atualizado_em=VALUES(atualizado_em)', [
            (int)$r['id'], $r['nome'], $r['descricao'], (bool)$r['ativo'],
            self::sqlTime($r['criado_em']), self::sqlTime($r['atualizado_em'] ?? $r['criado_em']),
        ]);
    }

    private function saveChecklist(array $r): void {
        $this->exec('INSERT INTO checklists (id, nome, descricao, ativo, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome=VALUES(nome), descricao=VALUES(descricao), ativo=VALUES(ativo), atualizado_em=VALUES(atualizado_em)', [
            (int)$r['id'], $r['nome'], $r['descricao'], (bool)$r['ativo'],
            self::sqlTime($r['criado_em']), self::sqlTime($r['atualizado_em'] ?? $r['criado_em']),
        ]);
    }

    private function saveInspection(array $r): void {
        $this->exec('INSERT INTO inspecoes (id, lote_id, checklist_id, inspetor_id, produto_id, produto_nome_snapshot, lote_codigo_snapshot, checklist_nome_snapshot, status, iniciada_em, finalizada_em, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), finalizada_em=VALUES(finalizada_em)', [
            (int)$r['id'], (int)$r['lote_id'], (int)$r['checklist_id'], (int)$r['inspetor_id'], (int)$r['produto_id'],
            $r['produto_nome'], $r['lote_codigo'], $r['checklist_nome'], $r['status'], self::sqlTime($r['iniciada_em']),
            self::sqlTime($r['finalizada_em']), self::sqlTime($r['criado_em']),
        ]);
    }

    private function saveAnswer(array $r): void {
        $this->exec('INSERT INTO respostas_inspecao (id, inspecao_id, item_id, resultado, observacao, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE resultado=VALUES(resultado), observacao=VALUES(observacao), atualizado_em=VALUES(atualizado_em)', [
            (int)$r['id'], (int)$r['inspecao_id'], (int)$r['item_id'], $r['resultado'], $r['observacao'],
            self::sqlTime($r['criado_em']), self::sqlTime($r['atualizado_em']),
        ]);
    }

    private function saveDeviation(array $r): void {
        $this->exec('INSERT INTO nao_conformidades (id, resposta_id, inspecao_id, item_id, descricao, classificacao, status, criado_em, atualizado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE status=VALUES(status), atualizado_em=VALUES(atualizado_em)', [
            (int)$r['id'], (int)$r['resposta_id'], (int)$r['inspecao_id'], (int)$r['item_id'], $r['descricao'],
            $r['classificacao'], $r['status'], self::sqlTime($r['criado_em']), self::sqlTime($r['atualizado_em'] ?? $r['criado_em']),
        ]);
    }

    private function saveEvidence(array $r): void {
        $bytes = base64_decode($r['conteudo_base64'], true);
        if ($bytes === false) throw new RuntimeException('invalid base64 evidence in application state');
        $this->exec('INSERT INTO evidencias (id, nao_conformidade_id, nome_original, mime, tamanho, sha256, conteudo, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE nome_original=VALUES(nome_original), mime=VALUES(mime), tamanho=VALUES(tamanho), sha256=VALUES(sha256), conteudo=VALUES(conteudo)', [
            (int)$r['id'], (int)$r['nao_conformidade_id'], $r['nome_original'], $r['mime'], (int)$r['tamanho'],
            $r['sha256'], $bytes, self::sqlTime($r['criado_em']),
        ]);
    }

    private function saveAudit(array $r): void {
        $details = json_encode($r['detalhes'] ?? (object)[], JSON_THROW_ON_ERROR | JSON_UNESCAPED_UNICODE);
        $this->exec('INSERT INTO historico_auditoria (id, usuario_id, acao, recurso, recurso_id, detalhes, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE usuario_id=VALUES(usuario_id), acao=VALUES(acao), recurso=VALUES(recurso), recurso_id=VALUES(recurso_id), detalhes=VALUES(detalhes)', [
            (int)$r['id'], $r['usuario_id'] === null ? null : (int)$r['usuario_id'], $r['acao'], $r['recurso'],
            (int)$r['recurso_id'], $details, self::sqlTime($r['criado_em']),
        ]);
    }

    private function saveSession(string $hash, array $r): void {
        $this->exec('INSERT INTO sessoes (token_hash, usuario_id, expira_em, sessao_demo) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE usuario_id=VALUES(usuario_id), expira_em=VALUES(expira_em), sessao_demo=VALUES(sessao_demo)', [
            $hash, (int)$r['usuario_id'], gmdate('Y-m-d H:i:s', (int)$r['expira_em']), (bool)($r['demo'] ?? false),
        ]);
    }

    private function saveAttempt(string $hash, array $r): void {
        $this->exec('INSERT INTO tentativas_login (ip_hash, inicio_em, quantidade, atualizado_em) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE inicio_em=VALUES(inicio_em), quantidade=VALUES(quantidade), atualizado_em=VALUES(atualizado_em)', [
            $hash, gmdate('Y-m-d H:i:s', (int)$r['inicio']), (int)$r['quantidade'], gmdate('Y-m-d H:i:s'),
        ]);
    }

    private function exec(string $sql, array $params): void {
        $statement = $this->pdo->prepare($sql);
        $statement->execute($params);
    }

    private function rows(string $sql): array {
        return $this->pdo->query($sql)->fetchAll(PDO::FETCH_ASSOC);
    }

    private static function iso(string $value): string {
        return (new DateTimeImmutable($value, new DateTimeZone(self::UTC)))->format('Y-m-d\TH:i:s\Z');
    }

    private static function isoNullable(?string $value): ?string {
        return $value === null ? null : self::iso($value);
    }

    private static function sqlTime(?string $value): ?string {
        if ($value === null) return null;
        return (new DateTimeImmutable($value, new DateTimeZone(self::UTC)))->setTimezone(new DateTimeZone(self::UTC))->format('Y-m-d H:i:s.u');
    }

    private static function unix(string $value): int {
        return (new DateTimeImmutable($value, new DateTimeZone(self::UTC)))->getTimestamp();
    }
}
