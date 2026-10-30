CREATE TABLE IF NOT EXISTS usuarios (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  email VARCHAR(200) NOT NULL UNIQUE,
  senha_hash TEXT NOT NULL,
  perfil VARCHAR(20) NOT NULL CHECK (perfil IN ('admin','supervisor','inspetor')),
  ativo BOOLEAN NOT NULL DEFAULT TRUE,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS produtos (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS lotes (
  id BIGSERIAL PRIMARY KEY,
  codigo VARCHAR(80) NOT NULL UNIQUE,
  produto_id BIGINT NOT NULL REFERENCES produtos(id),
  quantidade INTEGER NOT NULL CHECK (quantidade > 0),
  status VARCHAR(20) NOT NULL DEFAULT 'pendente' CHECK (status IN ('pendente','aprovado','reprovado')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS criterios (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS checklists (
  id BIGSERIAL PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  descricao TEXT,
  ativo BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE TABLE IF NOT EXISTS checklist_itens (
  id BIGSERIAL PRIMARY KEY,
  checklist_id BIGINT NOT NULL REFERENCES checklists(id) ON DELETE RESTRICT,
  criterio_id BIGINT NOT NULL REFERENCES criterios(id),
  obrigatorio BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (checklist_id, criterio_id)
);
CREATE TABLE IF NOT EXISTS inspecoes (
  id BIGSERIAL PRIMARY KEY,
  lote_id BIGINT NOT NULL REFERENCES lotes(id),
  checklist_id BIGINT NOT NULL REFERENCES checklists(id),
  inspetor_id BIGINT NOT NULL REFERENCES usuarios(id),
  status VARCHAR(20) NOT NULL DEFAULT 'em_andamento' CHECK (status IN ('em_andamento','aprovada','reprovada')),
  iniciada_em TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finalizada_em TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS respostas (
  id BIGSERIAL PRIMARY KEY,
  inspecao_id BIGINT NOT NULL REFERENCES inspecoes(id),
  item_id BIGINT NOT NULL REFERENCES checklist_itens(id),
  resultado VARCHAR(20) NOT NULL CHECK (resultado IN ('conforme','nao_conforme','nao_aplicavel')),
  observacao TEXT,
  UNIQUE (inspecao_id, item_id)
);
CREATE TABLE IF NOT EXISTS nao_conformidades (
  id BIGSERIAL PRIMARY KEY,
  resposta_id BIGINT NOT NULL UNIQUE REFERENCES respostas(id),
  descricao TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'aberta' CHECK (status IN ('aberta','em_tratamento','resolvida')),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS evidencias (
  id BIGSERIAL PRIMARY KEY,
  nao_conformidade_id BIGINT NOT NULL REFERENCES nao_conformidades(id),
  nome_original VARCHAR(255) NOT NULL,
  nome_arquivo VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL,
  tamanho INTEGER NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_inspecoes_lote ON inspecoes(lote_id);
CREATE INDEX IF NOT EXISTS idx_inspecoes_data ON inspecoes(iniciada_em);
CREATE INDEX IF NOT EXISTS idx_respostas_inspecao ON respostas(inspecao_id);
