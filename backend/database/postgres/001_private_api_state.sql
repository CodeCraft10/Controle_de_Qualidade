-- Estado transacional temporário da API PHP, isolado da Data API.
-- O modelo relacional PostgreSQL será migrado em uma etapa posterior.
CREATE SCHEMA IF NOT EXISTS gp4;
REVOKE ALL ON SCHEMA gp4 FROM PUBLIC, anon, authenticated;
CREATE TABLE gp4.api_state (
  id integer PRIMARY KEY CHECK (id = 1),
  payload jsonb NOT NULL CHECK (jsonb_typeof(payload) = 'object'),
  updated_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON gp4.api_state FROM PUBLIC, anon, authenticated;
ALTER TABLE gp4.api_state ENABLE ROW LEVEL SECURITY;
INSERT INTO gp4.api_state (id, payload) VALUES (1, '{"seq":{},"usuarios":{},"tokens":{},"tentativas":{},"produtos":{},"lotes":{},"criterios":{},"checklists":{},"inspecoes":{},"respostas":{},"nao_conformidades":{},"evidencias":{},"auditoria":{}}'::jsonb);
