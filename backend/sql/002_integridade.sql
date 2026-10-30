-- Proposta provisória de integração: revisar com Luiz antes de adotar no banco da equipe.
ALTER TABLE usuarios ADD COLUMN token_version INTEGER NOT NULL DEFAULT 1;
CREATE UNIQUE INDEX usuarios_email_normalizado ON usuarios(lower(email));
ALTER TABLE lotes ADD COLUMN ativo BOOLEAN NOT NULL DEFAULT true;
CREATE UNIQUE INDEX uma_inspecao_por_lote ON inspecoes(lote_id);
ALTER TABLE inspecoes ADD CONSTRAINT inspecao_fim_consistente CHECK (
  (status = 'em_andamento' AND finalizada_em IS NULL) OR
  (status <> 'em_andamento' AND finalizada_em IS NOT NULL)
);
ALTER TABLE checklist_itens ADD CONSTRAINT item_checklist_unico UNIQUE(id,checklist_id);
ALTER TABLE inspecoes ADD CONSTRAINT inspecao_checklist_unico UNIQUE(id,checklist_id);
ALTER TABLE respostas ADD COLUMN checklist_id BIGINT NOT NULL;
ALTER TABLE respostas ADD CONSTRAINT resposta_checklist_fk FOREIGN KEY (inspecao_id,checklist_id) REFERENCES inspecoes(id,checklist_id);
ALTER TABLE respostas ADD CONSTRAINT resposta_item_fk FOREIGN KEY (item_id,checklist_id) REFERENCES checklist_itens(id,checklist_id);
ALTER TABLE nao_conformidades ADD COLUMN classificacao VARCHAR(20) NOT NULL DEFAULT 'menor' CHECK(classificacao IN ('menor','maior','critica'));
CREATE TABLE nao_conformidade_historico (
  id BIGSERIAL PRIMARY KEY,
  nao_conformidade_id BIGINT NOT NULL REFERENCES nao_conformidades(id),
  usuario_id BIGINT NOT NULL REFERENCES usuarios(id),
  status VARCHAR(20) NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE inspecao_itens (
  inspecao_id BIGINT NOT NULL REFERENCES inspecoes(id),
  item_id BIGINT NOT NULL REFERENCES checklist_itens(id),
  criterio_nome VARCHAR(150) NOT NULL,
  criterio_descricao TEXT,
  obrigatorio BOOLEAN NOT NULL,
  PRIMARY KEY(inspecao_id,item_id)
);
CREATE INDEX idx_lotes_produto ON lotes(produto_id);
CREATE INDEX idx_itens_criterio ON checklist_itens(criterio_id);
CREATE INDEX idx_inspecoes_checklist ON inspecoes(checklist_id);
CREATE INDEX idx_inspecoes_inspetor ON inspecoes(inspetor_id);
CREATE INDEX idx_respostas_item ON respostas(item_id);
CREATE INDEX idx_evidencias_nc ON evidencias(nao_conformidade_id);
CREATE INDEX idx_nc_historico ON nao_conformidade_historico(nao_conformidade_id,id);
