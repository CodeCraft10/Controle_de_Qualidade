-- Evolucoes do modelo propostas para rastreabilidade e tratamento de desvios.
ALTER TABLE produtos ADD COLUMN criado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE produtos ADD COLUMN atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE lotes ADD COLUMN atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE criterios ADD COLUMN criado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE criterios ADD COLUMN atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE checklists ADD COLUMN criado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE checklists ADD COLUMN atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE checklist_itens ADD COLUMN criado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE checklist_itens ADD COLUMN atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now();
ALTER TABLE respostas ADD COLUMN criado_em TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE FUNCTION gp4_tocar_atualizacao() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.atualizado_em := now();
  RETURN NEW;
END $$;
CREATE TRIGGER tocar_produtos BEFORE UPDATE ON produtos
  FOR EACH ROW EXECUTE FUNCTION gp4_tocar_atualizacao();
CREATE TRIGGER tocar_lotes BEFORE UPDATE ON lotes
  FOR EACH ROW EXECUTE FUNCTION gp4_tocar_atualizacao();
CREATE TRIGGER tocar_criterios BEFORE UPDATE ON criterios
  FOR EACH ROW EXECUTE FUNCTION gp4_tocar_atualizacao();
CREATE TRIGGER tocar_checklists BEFORE UPDATE ON checklists
  FOR EACH ROW EXECUTE FUNCTION gp4_tocar_atualizacao();
CREATE TRIGGER tocar_checklist_itens BEFORE UPDATE ON checklist_itens
  FOR EACH ROW EXECUTE FUNCTION gp4_tocar_atualizacao();

CREATE TABLE acoes_corretivas (
  id BIGSERIAL PRIMARY KEY,
  nao_conformidade_id BIGINT NOT NULL REFERENCES nao_conformidades(id) ON DELETE RESTRICT,
  descricao TEXT NOT NULL CHECK (length(btrim(descricao)) > 0),
  responsavel_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  prazo DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente','em_andamento','concluida','cancelada')),
  criada_por BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  criada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizada_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  concluida_em TIMESTAMPTZ,
  CHECK ((status = 'concluida') = (concluida_em IS NOT NULL))
);
CREATE INDEX idx_acoes_nc_status ON acoes_corretivas(nao_conformidade_id,status);
CREATE INDEX idx_acoes_responsavel_prazo ON acoes_corretivas(responsavel_id,prazo)
  WHERE status IN ('pendente','em_andamento');

CREATE TABLE historico_auditoria (
  id BIGSERIAL PRIMARY KEY,
  tabela VARCHAR(63) NOT NULL,
  registro_id BIGINT NOT NULL,
  operacao VARCHAR(10) NOT NULL CHECK (operacao IN ('INSERT','UPDATE','DELETE')),
  usuario_id BIGINT REFERENCES usuarios(id) ON DELETE SET NULL,
  ocorrido_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  antes JSONB,
  depois JSONB
);
CREATE INDEX idx_auditoria_tabela_registro ON historico_auditoria(tabela,registro_id,id);
CREATE INDEX idx_auditoria_data ON historico_auditoria(ocorrido_em);

-- A aplicação pode definir gp4.usuario_id por transação para atribuir autoria.
-- Sem esse contexto, a alteração continua registrada com usuario_id nulo.
CREATE FUNCTION gp4_registrar_auditoria() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  row_id BIGINT;
BEGIN
  IF TG_OP <> 'INSERT' THEN old_data := to_jsonb(OLD); END IF;
  IF TG_OP <> 'DELETE' THEN new_data := to_jsonb(NEW); END IF;
  row_id := COALESCE((new_data->>'id')::BIGINT,(old_data->>'id')::BIGINT);
  INSERT INTO historico_auditoria(tabela,registro_id,operacao,usuario_id,antes,depois)
  VALUES (TG_TABLE_NAME,row_id,TG_OP,
    NULLIF(current_setting('gp4.usuario_id',true),'')::BIGINT,old_data,new_data);
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER auditoria_produtos AFTER INSERT OR UPDATE OR DELETE ON produtos
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_lotes AFTER INSERT OR UPDATE OR DELETE ON lotes
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_criterios AFTER INSERT OR UPDATE OR DELETE ON criterios
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_checklists AFTER INSERT OR UPDATE OR DELETE ON checklists
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_checklist_itens AFTER INSERT OR UPDATE OR DELETE ON checklist_itens
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_inspecoes AFTER INSERT OR UPDATE OR DELETE ON inspecoes
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_respostas AFTER INSERT OR UPDATE OR DELETE ON respostas
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_nao_conformidades AFTER INSERT OR UPDATE OR DELETE ON nao_conformidades
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_evidencias AFTER INSERT OR UPDATE OR DELETE ON evidencias
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
CREATE TRIGGER auditoria_acoes_corretivas AFTER INSERT OR UPDATE OR DELETE ON acoes_corretivas
  FOR EACH ROW EXECUTE FUNCTION gp4_registrar_auditoria();
