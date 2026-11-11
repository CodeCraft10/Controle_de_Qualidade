-- Somente desenvolvimento: todas as contas usam a senha "password".
INSERT INTO usuarios (id, nome, email, senha_hash, perfil) VALUES
  (1, 'Administração Demo', 'admin@gp4.invalid', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4KoEa3Ro9llC/.og/at2uheWG/igi.', 'admin'),
  (2, 'Supervisão Demo', 'supervisor@gp4.invalid', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4KoEa3Ro9llC/.og/at2uheWG/igi.', 'supervisor'),
  (3, 'Inspetor Demo', 'inspetor@gp4.invalid', '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4KoEa3Ro9llC/.og/at2uheWG/igi.', 'inspetor');

INSERT INTO produtos (id, codigo, nome, descricao) VALUES
  (1, 'P-DEMO-01', 'Componente fictício A', 'Produto de demonstração.'),
  (2, 'P-DEMO-02', 'Componente fictício B', 'Produto de demonstração.');

INSERT INTO lotes (id, codigo, produto_id, quantidade, data_fabricacao, status) VALUES
  (1, 'L-DEMO-OK', 1, 100, DATE_SUB(CURRENT_DATE, INTERVAL 2 DAY), 'aprovado'),
  (2, 'L-DEMO-NC', 2, 80, DATE_SUB(CURRENT_DATE, INTERVAL 1 DAY), 'reprovado');

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
  (1, 1, 1, 3, 1, 'Componente fictício A', 'L-DEMO-OK', 'Checklist de demonstração v1', 'aprovada', DATE_SUB(NOW(6), INTERVAL 2 DAY), DATE_SUB(NOW(6), INTERVAL 2 DAY) + INTERVAL 10 MINUTE),
  (2, 2, 1, 3, 2, 'Componente fictício B', 'L-DEMO-NC', 'Checklist de demonstração v1', 'reprovada', DATE_SUB(NOW(6), INTERVAL 1 DAY), DATE_SUB(NOW(6), INTERVAL 1 DAY) + INTERVAL 12 MINUTE);

INSERT INTO inspecao_itens
  (inspecao_id, checklist_id, item_id, criterio_id, criterio_nome_snapshot, criterio_descricao_snapshot, obrigatorio)
VALUES
  (1, 1, 1, 1, 'Inspeção visual demo', 'Verificar acabamento superficial.', true),
  (1, 1, 2, 2, 'Dimensões demo', 'Verificar medida conforme ficha fictícia.', true),
  (2, 1, 1, 1, 'Inspeção visual demo', 'Verificar acabamento superficial.', true),
  (2, 1, 2, 2, 'Dimensões demo', 'Verificar medida conforme ficha fictícia.', true);

INSERT INTO respostas_inspecao (id, inspecao_id, item_id, resultado, observacao, criado_em, atualizado_em) VALUES
  (1, 1, 1, 'conforme', '', DATE_SUB(NOW(6), INTERVAL 2 DAY) + INTERVAL 3 MINUTE, DATE_SUB(NOW(6), INTERVAL 2 DAY) + INTERVAL 3 MINUTE),
  (2, 1, 2, 'conforme', '', DATE_SUB(NOW(6), INTERVAL 2 DAY) + INTERVAL 7 MINUTE, DATE_SUB(NOW(6), INTERVAL 2 DAY) + INTERVAL 7 MINUTE),
  (3, 2, 1, 'nao_conforme', 'Risco superficial fictício.', DATE_SUB(NOW(6), INTERVAL 1 DAY) + INTERVAL 3 MINUTE, DATE_SUB(NOW(6), INTERVAL 1 DAY) + INTERVAL 3 MINUTE),
  (4, 2, 2, 'conforme', '', DATE_SUB(NOW(6), INTERVAL 1 DAY) + INTERVAL 8 MINUTE, DATE_SUB(NOW(6), INTERVAL 1 DAY) + INTERVAL 8 MINUTE);
INSERT INTO nao_conformidades (id, resposta_id, inspecao_id, item_id, descricao, classificacao, status, criado_em, atualizado_em)
VALUES (1, 3, 2, 1, 'Risco superficial fictício para demonstração.', 'menor', 'em_tratamento', DATE_SUB(NOW(6), INTERVAL 1 DAY) + INTERVAL 4 MINUTE, DATE_SUB(NOW(6), INTERVAL 23 HOUR));
INSERT INTO historico_nao_conformidade (nao_conformidade_id, status, usuario_id, observacao, criado_em) VALUES
  (1, 'aberta', 3, '', DATE_SUB(NOW(6), INTERVAL 1 DAY) + INTERVAL 4 MINUTE),
  (1, 'em_tratamento', 2, 'Análise fictícia iniciada.', DATE_SUB(NOW(6), INTERVAL 23 HOUR));
INSERT INTO acoes_corretivas (id, nao_conformidade_id, descricao, responsavel_id, prazo, status, criada_por, criado_em, atualizado_em)
VALUES (1, 1, 'Revisar etapa de acabamento (exemplo fictício).', 2, DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 'em_andamento', 2, DATE_SUB(NOW(6), INTERVAL 23 HOUR), DATE_SUB(NOW(6), INTERVAL 23 HOUR));
INSERT INTO historico_acao_corretiva (acao_corretiva_id, status, usuario_id, observacao, criado_em) VALUES
  (1, 'aberta', 2, 'Ação corretiva criada (demonstração).', DATE_SUB(NOW(6), INTERVAL 23 HOUR) - INTERVAL 5 MINUTE),
  (1, 'em_andamento', 2, 'Ação em andamento (demonstração).', DATE_SUB(NOW(6), INTERVAL 23 HOUR));
INSERT INTO evidencias (id, nao_conformidade_id, nome_original, mime, tamanho, sha256, conteudo, criado_em)
VALUES (1, 1, 'evidencia-demo.png', 'image/png', 68,
  '4cf61bf79c8070608ae28cb9e9ebf77f5900d41e96ce588cb8c84cef9502f56e',
  FROM_BASE64('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lGQAAAAASUVORK5CYII='), DATE_SUB(NOW(6), INTERVAL 1 DAY) + INTERVAL 5 MINUTE);
INSERT INTO historico_auditoria (id, usuario_id, acao, recurso, recurso_id, detalhes) VALUES
  (1, 1, 'criar', 'produtos', 1, '{"origem":"seed demonstrativa"}'),
  (2, 3, 'abrir', 'inspecoes', 1, '{"origem":"seed demonstrativa"}'),
  (3, 3, 'finalizar', 'inspecoes', 2, '{"origem":"seed demonstrativa"}');

