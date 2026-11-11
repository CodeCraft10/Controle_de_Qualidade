-- Indicadores gerais. Inclui inspeções em andamento no total, mas as taxas usam
-- somente as inspeções finalizadas, conforme backend/src/Domain/Queries.php.
SELECT
    count(*) AS total,
    count(*) FILTER (WHERE status = 'em_andamento') AS em_andamento,
    count(*) FILTER (WHERE status IN ('aprovada', 'reprovada')) AS finalizadas,
    count(*) FILTER (WHERE status = 'aprovada') AS aprovadas,
    count(*) FILTER (WHERE status = 'reprovada') AS reprovadas,
    coalesce(round(100.0 * count(*) FILTER (WHERE status = 'aprovada') /
        nullif(count(*) FILTER (WHERE status IN ('aprovada', 'reprovada')), 0), 2), 0) AS taxa_aprovacao,
    coalesce(round(100.0 * count(*) FILTER (WHERE status = 'reprovada') /
        nullif(count(*) FILTER (WHERE status IN ('aprovada', 'reprovada')), 0), 2), 0) AS taxa_reprovacao
FROM inspecoes
WHERE (CAST(:data_inicio AS date) IS NULL OR (iniciada_em AT TIME ZONE 'America/Sao_Paulo')::date >= CAST(:data_inicio AS date))
  AND (CAST(:data_fim AS date) IS NULL OR (iniciada_em AT TIME ZONE 'America/Sao_Paulo')::date <= CAST(:data_fim AS date))
  AND (CAST(:produto_id AS bigint) IS NULL OR produto_id = CAST(:produto_id AS bigint))
  AND (CAST(:lote_id AS bigint) IS NULL OR lote_id = CAST(:lote_id AS bigint))
  AND (CAST(:inspetor_id AS bigint) IS NULL OR inspetor_id = CAST(:inspetor_id AS bigint));

-- Histórico por período, produto, lote e inspetor; use LIMIT/OFFSET na API.
SELECT i.id, i.iniciada_em, i.finalizada_em, i.status,
       i.lote_id, i.lote_codigo_snapshot, i.produto_id, i.produto_nome_snapshot,
       i.inspetor_id, u.nome AS inspetor_nome, i.checklist_nome_snapshot
FROM inspecoes AS i
JOIN usuarios AS u ON u.id = i.inspetor_id
WHERE (CAST(:data_inicio AS date) IS NULL OR (i.iniciada_em AT TIME ZONE 'America/Sao_Paulo')::date >= CAST(:data_inicio AS date))
  AND (CAST(:data_fim AS date) IS NULL OR (i.iniciada_em AT TIME ZONE 'America/Sao_Paulo')::date <= CAST(:data_fim AS date))
  AND (CAST(:produto_id AS bigint) IS NULL OR i.produto_id = CAST(:produto_id AS bigint))
  AND (CAST(:lote_id AS bigint) IS NULL OR i.lote_id = CAST(:lote_id AS bigint))
  AND (CAST(:inspetor_id AS bigint) IS NULL OR i.inspetor_id = CAST(:inspetor_id AS bigint))
  AND (CAST(:status AS text) IS NULL OR i.status = CAST(:status AS text))
ORDER BY i.iniciada_em DESC, i.id DESC
LIMIT :limite OFFSET :deslocamento;

-- Não conformidades por produto e classificação, mantendo o snapshot do nome.
SELECT i.produto_id, i.produto_nome_snapshot AS produto,
       n.classificacao, n.status, count(*) AS quantidade
FROM nao_conformidades AS n
JOIN inspecoes AS i ON i.id = n.inspecao_id
GROUP BY i.produto_id, i.produto_nome_snapshot, n.classificacao, n.status
ORDER BY quantidade DESC, produto, n.classificacao;
