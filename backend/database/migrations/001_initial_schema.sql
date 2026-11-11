CREATE TABLE usuarios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL CHECK (TRIM(nome) <> ''),
    email VARCHAR(254) NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
    perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('admin', 'supervisor', 'inspetor')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY usuarios_email_uq (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE produtos (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(80) NOT NULL CHECK (TRIM(codigo) <> ''),
    nome VARCHAR(200) NOT NULL CHECK (TRIM(nome) <> ''),
    descricao VARCHAR(3000) NOT NULL DEFAULT '',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY produtos_codigo_uq (codigo)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE lotes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    codigo VARCHAR(80) NOT NULL CHECK (TRIM(codigo) <> ''),
    produto_id BIGINT UNSIGNED NOT NULL,
    quantidade BIGINT UNSIGNED NOT NULL CHECK (quantidade > 0),
    data_fabricacao DATE NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovado', 'reprovado')),
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY lotes_codigo_uq (codigo),
    UNIQUE KEY lotes_id_produto_uq (id, produto_id),
    KEY lotes_produto_id_idx (produto_id),
    KEY lotes_status_idx (status),
    CONSTRAINT lotes_produto_fk FOREIGN KEY (produto_id) REFERENCES produtos(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE criterios (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL CHECK (TRIM(nome) <> ''),
    descricao VARCHAR(3000) NOT NULL DEFAULT '',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY criterios_nome_uq (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE checklists (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(200) NOT NULL CHECK (TRIM(nome) <> ''),
    descricao VARCHAR(3000) NOT NULL DEFAULT '',
    ativo BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY checklists_nome_uq (nome)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE checklist_itens (
    checklist_id BIGINT UNSIGNED NOT NULL,
    item_id INT UNSIGNED NOT NULL CHECK (item_id > 0),
    criterio_id BIGINT UNSIGNED NOT NULL,
    obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    PRIMARY KEY (checklist_id, item_id),
    UNIQUE KEY checklist_criterio_uq (checklist_id, criterio_id),
    UNIQUE KEY checklist_snapshot_fk_uq (checklist_id, item_id, criterio_id),
    KEY checklist_criterio_idx (criterio_id),
    CONSTRAINT checklist_itens_checklist_fk FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE RESTRICT,
    CONSTRAINT checklist_itens_criterio_fk FOREIGN KEY (criterio_id) REFERENCES criterios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE inspecoes (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    lote_id BIGINT UNSIGNED NOT NULL,
    checklist_id BIGINT UNSIGNED NOT NULL,
    inspetor_id BIGINT UNSIGNED NOT NULL,
    produto_id BIGINT UNSIGNED NOT NULL,
    produto_nome_snapshot VARCHAR(200) NOT NULL,
    lote_codigo_snapshot VARCHAR(80) NOT NULL,
    checklist_nome_snapshot VARCHAR(200) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'aprovada', 'reprovada')),
    iniciada_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    finalizada_em DATETIME(6) NULL,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY inspecao_lote_uq (lote_id),
    UNIQUE KEY inspecao_id_checklist_uq (id, checklist_id),
    KEY inspecoes_iniciada_em_idx (iniciada_em),
    KEY inspecoes_produto_idx (produto_id),
    KEY inspecoes_inspetor_idx (inspetor_id),
    KEY inspecoes_status_idx (status),
    CONSTRAINT inspecoes_lote_produto_fk FOREIGN KEY (lote_id, produto_id) REFERENCES lotes(id, produto_id) ON DELETE RESTRICT,
    CONSTRAINT inspecoes_checklist_fk FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE RESTRICT,
    CONSTRAINT inspecoes_inspetor_fk FOREIGN KEY (inspetor_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CHECK ((status = 'em_andamento' AND finalizada_em IS NULL) OR (status <> 'em_andamento' AND finalizada_em IS NOT NULL))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE inspecao_itens (
    inspecao_id BIGINT UNSIGNED NOT NULL,
    checklist_id BIGINT UNSIGNED NOT NULL,
    item_id INT UNSIGNED NOT NULL CHECK (item_id > 0),
    criterio_id BIGINT UNSIGNED NOT NULL,
    criterio_nome_snapshot VARCHAR(200) NOT NULL,
    criterio_descricao_snapshot VARCHAR(3000) NOT NULL DEFAULT '',
    obrigatorio BOOLEAN NOT NULL,
    PRIMARY KEY (inspecao_id, item_id),
    KEY inspecao_itens_criterio_idx (criterio_id),
    CONSTRAINT inspecao_itens_inspecao_fk FOREIGN KEY (inspecao_id, checklist_id) REFERENCES inspecoes(id, checklist_id) ON DELETE RESTRICT,
    CONSTRAINT inspecao_itens_checklist_fk FOREIGN KEY (checklist_id, item_id, criterio_id) REFERENCES checklist_itens(checklist_id, item_id, criterio_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE respostas_inspecao (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    inspecao_id BIGINT UNSIGNED NOT NULL,
    item_id INT UNSIGNED NOT NULL,
    resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('conforme', 'nao_conforme', 'nao_aplicavel')),
    observacao VARCHAR(3000) NOT NULL DEFAULT '',
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY resposta_item_uq (inspecao_id, item_id),
    UNIQUE KEY resposta_desvio_fk_uq (id, inspecao_id, item_id),
    CONSTRAINT respostas_item_fk FOREIGN KEY (inspecao_id, item_id) REFERENCES inspecao_itens(inspecao_id, item_id) ON DELETE RESTRICT,
    CHECK (resultado <> 'nao_aplicavel' OR TRIM(observacao) <> '')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE nao_conformidades (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    resposta_id BIGINT UNSIGNED NOT NULL,
    inspecao_id BIGINT UNSIGNED NOT NULL,
    item_id INT UNSIGNED NOT NULL,
    descricao VARCHAR(3000) NOT NULL CHECK (TRIM(descricao) <> ''),
    classificacao VARCHAR(20) NOT NULL DEFAULT 'menor' CHECK (classificacao IN ('menor', 'maior', 'critica')),
    status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_tratamento', 'resolvida')),
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    UNIQUE KEY desvio_resposta_uq (resposta_id),
    KEY nao_conformidades_inspecao_idx (inspecao_id),
    KEY nao_conformidades_status_idx (status),
    CONSTRAINT desvio_resposta_fk FOREIGN KEY (resposta_id, inspecao_id, item_id) REFERENCES respostas_inspecao(id, inspecao_id, item_id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE historico_nao_conformidade (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nao_conformidade_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('aberta', 'em_tratamento', 'resolvida')),
    usuario_id BIGINT UNSIGNED NOT NULL,
    observacao VARCHAR(3000) NOT NULL DEFAULT '',
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY historico_nc_parent_idx (nao_conformidade_id, criado_em),
    CONSTRAINT historico_nc_desvio_fk FOREIGN KEY (nao_conformidade_id) REFERENCES nao_conformidades(id) ON DELETE RESTRICT,
    CONSTRAINT historico_nc_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE evidencias (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nao_conformidade_id BIGINT UNSIGNED NOT NULL,
    nome_original VARCHAR(200) NOT NULL,
    mime VARCHAR(30) NOT NULL CHECK (mime IN ('image/jpeg', 'image/png', 'image/webp')),
    tamanho BIGINT UNSIGNED NOT NULL CHECK (tamanho > 0 AND tamanho <= 5242880),
    sha256 CHAR(64) NOT NULL CHECK (sha256 REGEXP '^[0-9a-f]{64}$'),
    conteudo MEDIUMBLOB NOT NULL,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY evidencias_nc_idx (nao_conformidade_id),
    CONSTRAINT evidencias_nc_fk FOREIGN KEY (nao_conformidade_id) REFERENCES nao_conformidades(id) ON DELETE RESTRICT,
    CHECK (tamanho = OCTET_LENGTH(conteudo))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE acoes_corretivas (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    nao_conformidade_id BIGINT UNSIGNED NOT NULL,
    descricao VARCHAR(3000) NOT NULL CHECK (TRIM(descricao) <> ''),
    responsavel_id BIGINT UNSIGNED NULL,
    prazo DATE NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
    conclusao VARCHAR(3000) NOT NULL DEFAULT '',
    criada_por BIGINT UNSIGNED NOT NULL,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY acoes_corretivas_nc_idx (nao_conformidade_id),
    KEY acoes_corretivas_status_prazo_idx (status, prazo),
    CONSTRAINT acoes_nc_fk FOREIGN KEY (nao_conformidade_id) REFERENCES nao_conformidades(id) ON DELETE RESTRICT,
    CONSTRAINT acoes_responsavel_fk FOREIGN KEY (responsavel_id) REFERENCES usuarios(id) ON DELETE RESTRICT,
    CONSTRAINT acoes_criada_por_fk FOREIGN KEY (criada_por) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE historico_acao_corretiva (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    acao_corretiva_id BIGINT UNSIGNED NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('aberta', 'em_andamento', 'concluida', 'cancelada')),
    usuario_id BIGINT UNSIGNED NOT NULL,
    observacao VARCHAR(3000) NOT NULL DEFAULT '',
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY historico_acao_parent_idx (acao_corretiva_id, criado_em),
    CONSTRAINT historico_acao_fk FOREIGN KEY (acao_corretiva_id) REFERENCES acoes_corretivas(id) ON DELETE RESTRICT,
    CONSTRAINT historico_acao_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE historico_auditoria (
    id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
    usuario_id BIGINT UNSIGNED NULL,
    acao VARCHAR(60) NOT NULL,
    recurso VARCHAR(60) NOT NULL,
    recurso_id BIGINT UNSIGNED NOT NULL,
    detalhes JSON NOT NULL,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY auditoria_recurso_idx (recurso, recurso_id, criado_em),
    KEY auditoria_usuario_idx (usuario_id, criado_em),
    CONSTRAINT auditoria_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE sessoes (
    token_hash CHAR(64) NOT NULL PRIMARY KEY CHECK (token_hash REGEXP '^[0-9a-f]{64}$'),
    usuario_id BIGINT UNSIGNED NOT NULL,
    expira_em DATETIME(6) NOT NULL,
    criado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    KEY sessoes_expira_em_idx (expira_em),
    CONSTRAINT sessoes_usuario_fk FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;

CREATE TABLE tentativas_login (
    ip_hash CHAR(64) NOT NULL PRIMARY KEY CHECK (ip_hash REGEXP '^[0-9a-f]{64}$'),
    inicio_em DATETIME(6) NOT NULL,
    quantidade INT UNSIGNED NOT NULL,
    atualizado_em DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_as_ci;
