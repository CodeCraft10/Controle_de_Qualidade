-- Ajuste os filtros abaixo antes de executar as consultas pelo phpMyAdmin.
SET @data_inicio = NULL;
SET @data_fim = NULL;
SET @produto_id = NULL;
SET @lote_id = NULL;
SET @inspetor_id = NULL;
SET @status = NULL;

-- Total inclui inspeções em andamento; taxas consideram apenas as finalizadas.
SELECT
    COUNT(*) AS total,
    SUM(status = 'em_andamento') AS em_andamento,
    SUM(status IN ('aprovada', 'reprovada')) AS finalizadas,
    SUM(status = 'aprovada') AS aprovadas,
    SUM(status = 'reprovada') AS reprovadas,
    COALESCE(ROUND(100.0 * SUM(status = 'aprovada') /
        NULLIF(SUM(status IN ('aprovada', 'reprovada')), 0), 2), 0) AS taxa_aprovacao,
    COALESCE(ROUND(100.0 * SUM(status = 'reprovada') /
        NULLIF(SUM(status IN ('aprovada', 'reprovada')), 0), 2), 0) AS taxa_reprovacao
FROM inspecoes
WHERE (@data_inicio IS NULL OR DATE(iniciada_em - INTERVAL 3 HOUR) >= @data_inicio)
  AND (@data_fim IS NULL OR DATE(iniciada_em - INTERVAL 3 HOUR) <= @data_fim)
  AND (@produto_id IS NULL OR produto_id = @produto_id)
  AND (@lote_id IS NULL OR lote_id = @lote_id)
  AND (@inspetor_id IS NULL OR inspetor_id = @inspetor_id);

-- Histórico paginado. Para mudar o tamanho ou a página, edite LIMIT/OFFSET.
SELECT i.id, i.iniciada_em, i.finalizada_em, i.status,
       i.lote_id, i.lote_codigo_snapshot, i.produto_id, i.produto_nome_snapshot,
       i.inspetor_id, u.nome AS inspetor_nome, i.checklist_nome_snapshot
FROM inspecoes AS i
JOIN usuarios AS u ON u.id = i.inspetor_id
WHERE (@data_inicio IS NULL OR DATE(i.iniciada_em - INTERVAL 3 HOUR) >= @data_inicio)
  AND (@data_fim IS NULL OR DATE(i.iniciada_em - INTERVAL 3 HOUR) <= @data_fim)
  AND (@produto_id IS NULL OR i.produto_id = @produto_id)
  AND (@lote_id IS NULL OR i.lote_id = @lote_id)
  AND (@inspetor_id IS NULL OR i.inspetor_id = @inspetor_id)
  AND (@status IS NULL OR i.status = @status)
ORDER BY i.iniciada_em DESC, i.id DESC
LIMIT 20 OFFSET 0;

-- Desvios agrupados por produto, classificação e estado.
SELECT i.produto_id, i.produto_nome_snapshot AS produto,
       n.classificacao, n.status, COUNT(*) AS quantidade
FROM nao_conformidades AS n
JOIN inspecoes AS i ON i.id = n.inspecao_id
GROUP BY i.produto_id, i.produto_nome_snapshot, n.classificacao, n.status
ORDER BY quantidade DESC, produto, n.classificacao;
