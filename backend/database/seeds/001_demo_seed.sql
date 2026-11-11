-- Somente desenvolvimento: todas as contas usam a senha "password".
INSERT INTO usuarios (id, nome, email, senha_hash, perfil) VALUES
  (1, 'Administração Demo', 'admin@gp4.invalid', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4KoEa3Ro9llC/.og/at2uheWG/igi.', 'admin'),
  (2, 'Supervisão Demo', 'supervisor@gp4.invalid', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4KoEa3Ro9llC/.og/at2uheWG/igi.', 'supervisor'),
  (3, 'Inspetor Demo', 'inspetor@gp4.invalid', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4KoEa3Ro9llC/.og/at2uheWG/igi.', 'inspetor');

INSERT INTO produtos (id, codigo, nome, descricao) VALUES
  (1, 'P-DEMO-01', 'Componente fictício A', 'Produto de demonstração.'),
  (2, 'P-DEMO-02', 'Componente fictício B', 'Produto de demonstração.');

INSERT INTO lotes (id, codigo, produto_id, quantidade, data_fabricacao, status) VALUES
  (1, 'L-DEMO-OK', 1, 100, current_date - 2, 'aprovado'),
  (2, 'L-DEMO-NC', 2, 80, current_date - 1, 'reprovado');

INSERT INTO criterios (id, nome, descricao) VALUES
  (1, 'Inspeção visual demo', 'Verificar acabamento superficial.'),
  (2, 'Dimensões demo', 'Verificar medida conforme ficha fictícia.');
INSERT INTO checklists (id, nome, descricao) VALUES
  (1, 'Checklist de demonstração v1', 'Dados inteiramente fictícios.');
INSERT INTO checklist_itens (checklist_id, item_id, criterio_id, obrigatorio) VALUES
  (1, 1, 1, true), (1, 2, 2, true);

INSERT INTO inspecoes
  (id, lote_id, checklist_id, inspetor_id, produto_id, produto_nome_snapshot, lote_codigo_snapshot, checklist_nome_snapshot, status, iniciada_em, finalizada_em)
VALUES
  (1, 1, 1, 3, 1, 'Componente fictício A', 'L-DEMO-OK', 'Checklist de demonstração v1', 'aprovada', now() - interval '2 days', now() - interval '2 days' + interval '10 minutes'),
  (2, 2, 1, 3, 2, 'Componente fictício B', 'L-DEMO-NC', 'Checklist de demonstração v1', 'reprovada', now() - interval '1 day', now() - interval '1 day' + interval '12 minutes');

INSERT INTO inspecao_itens
  (inspecao_id, checklist_id, item_id, criterio_id, criterio_nome_snapshot, criterio_descricao_snapshot, obrigatorio)
VALUES
  (1, 1, 1, 1, 'Inspeção visual demo', 'Verificar acabamento superficial.', true),
  (1, 1, 2, 2, 'Dimensões demo', 'Verificar medida conforme ficha fictícia.', true),
  (2, 1, 1, 1, 'Inspeção visual demo', 'Verificar acabamento superficial.', true),
  (2, 1, 2, 2, 'Dimensões demo', 'Verificar medida conforme ficha fictícia.', true);

INSERT INTO respostas_inspecao (id, inspecao_id, item_id, resultado, observacao, criado_em, atualizado_em) VALUES
  (1, 1, 1, 'conforme', '', now() - interval '2 days' + interval '3 minutes', now() - interval '2 days' + interval '3 minutes'),
  (2, 1, 2, 'conforme', '', now() - interval '2 days' + interval '7 minutes', now() - interval '2 days' + interval '7 minutes'),
  (3, 2, 1, 'nao_conforme', 'Risco superficial fictício.', now() - interval '1 day' + interval '3 minutes', now() - interval '1 day' + interval '3 minutes'),
  (4, 2, 2, 'conforme', '', now() - interval '1 day' + interval '8 minutes', now() - interval '1 day' + interval '8 minutes');
INSERT INTO nao_conformidades (id, resposta_id, inspecao_id, item_id, descricao, classificacao, status, criado_em, atualizado_em)
VALUES (1, 3, 2, 1, 'Risco superficial fictício para demonstração.', 'menor', 'em_tratamento', now() - interval '1 day' + interval '4 minutes', now() - interval '23 hours');
INSERT INTO historico_nao_conformidade (nao_conformidade_id, status, usuario_id, observacao, criado_em) VALUES
  (1, 'aberta', 3, '', now() - interval '1 day' + interval '4 minutes'),
  (1, 'em_tratamento', 2, 'Análise fictícia iniciada.', now() - interval '23 hours');
INSERT INTO acoes_corretivas (id, nao_conformidade_id, descricao, responsavel_id, prazo, status, criada_por, criado_em, atualizado_em)
VALUES (1, 1, 'Revisar etapa de acabamento (exemplo fictício).', 2, current_date + 7, 'em_andamento', 2, now() - interval '23 hours', now() - interval '23 hours');
INSERT INTO historico_acao_corretiva (acao_corretiva_id, status, usuario_id, observacao, criado_em) VALUES
  (1, 'aberta', 2, 'Ação corretiva criada (demonstração).', now() - interval '23 hours' - interval '5 minutes'),
  (1, 'em_andamento', 2, 'Ação em andamento (demonstração).', now() - interval '23 hours');
INSERT INTO evidencias (id, nao_conformidade_id, nome_original, mime, tamanho, sha256, conteudo, criado_em)
VALUES (1, 1, 'evidencia-demo.png', 'image/png', 68,
  '4cf61bf79c8070608ae28cb9e9ebf77f5900d41e96ce588cb8c84cef9502f56e',
  decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lGQAAAAASUVORK5CYII=', 'base64'), now() - interval '1 day' + interval '5 minutes');
INSERT INTO historico_auditoria (id, usuario_id, acao, recurso, recurso_id, detalhes) VALUES
  (1, 1, 'criar', 'produtos', 1, '{"origem":"seed demonstrativa"}'),
  (2, 3, 'abrir', 'inspecoes', 1, '{"origem":"seed demonstrativa"}'),
  (3, 3, 'finalizar', 'inspecoes', 2, '{"origem":"seed demonstrativa"}');

SELECT setval(pg_get_serial_sequence('usuarios', 'id'), (SELECT max(id) FROM usuarios));
SELECT setval(pg_get_serial_sequence('produtos', 'id'), (SELECT max(id) FROM produtos));
SELECT setval(pg_get_serial_sequence('lotes', 'id'), (SELECT max(id) FROM lotes));
SELECT setval(pg_get_serial_sequence('criterios', 'id'), (SELECT max(id) FROM criterios));
SELECT setval(pg_get_serial_sequence('checklists', 'id'), (SELECT max(id) FROM checklists));
SELECT setval(pg_get_serial_sequence('inspecoes', 'id'), (SELECT max(id) FROM inspecoes));
SELECT setval(pg_get_serial_sequence('respostas_inspecao', 'id'), (SELECT max(id) FROM respostas_inspecao));
SELECT setval(pg_get_serial_sequence('nao_conformidades', 'id'), (SELECT max(id) FROM nao_conformidades));
SELECT setval(pg_get_serial_sequence('historico_nao_conformidade', 'id'), (SELECT max(id) FROM historico_nao_conformidade));
SELECT setval(pg_get_serial_sequence('acoes_corretivas', 'id'), (SELECT max(id) FROM acoes_corretivas));
SELECT setval(pg_get_serial_sequence('historico_acao_corretiva', 'id'), (SELECT max(id) FROM historico_acao_corretiva));
SELECT setval(pg_get_serial_sequence('evidencias', 'id'), (SELECT max(id) FROM evidencias));
SELECT setval(pg_get_serial_sequence('historico_auditoria', 'id'), (SELECT max(id) FROM historico_auditoria));
