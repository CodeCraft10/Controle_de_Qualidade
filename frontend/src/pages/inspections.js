import { api } from '../api.js';
import { esc, badge, formatDate, notify, empty, loading } from '../ui.js';
import { getUser, canEditInspection } from '../session.js';

const results = {
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  nao_aplicavel: 'Não aplicável',
};
const option = (value, label, selected = '') =>
  `<option value="${esc(value)}" ${String(value) === String(selected) ? 'selected' : ''}>${esc(label)}</option>`;
const errorMessage = (error) =>
  `<div class="notice error" role="alert">${esc(error.message || 'Não foi possível concluir a operação.')}</div>`;

export async function mountInspections(root, { id } = {}) {
  return id ? mountDetail(root, id) : mountList(root);
}

async function mountList(root) {
  let active = true;
  let listSequence = 0;
  let page = 1;
  let filters = {};
  root.innerHTML = `<header class="page-header"><div><p class="eyebrow">CONTROLE DE QUALIDADE</p><h1>Inspeções</h1><p class="muted">Do checklist à decisão final, cada etapa registrada.</p></div><button class="button" type="button" data-new>Nova inspeção</button></header>
    <section class="card" data-create hidden></section>
    <section class="card"><form class="toolbar" data-filters><div class="field"><label for="inspection-search">Produto ou lote</label><input id="inspection-search" name="q" placeholder="Buscar produto ou lote" maxlength="100"></div><div class="field"><label for="inspection-status">Situação</label><select id="inspection-status" name="status"><option value="">Todas as situações</option>${option('em_andamento', 'Em andamento')}${option('aprovada', 'Aprovada')}${option('reprovada', 'Reprovada')}</select></div><button class="button secondary">Filtrar</button></form><div data-list aria-live="polite">${loading()}</div></section>`;
  const list = root.querySelector('[data-list]');
  const filterForm = root.querySelector('[data-filters]');
  async function load() {
    const sequence = ++listSequence;
    list.innerHTML = loading();
    try {
      const query = new URLSearchParams({ ...filters, page: String(page), limit: '20' });
      const response = await api.request(`/inspecoes?${query}`);
      if (!active || sequence !== listSequence) return;
      list.innerHTML = response.data.length
        ? `<div class="table-wrap"><table><thead><tr><th scope="col">Inspeção</th><th scope="col">Produto / lote</th><th scope="col">Iniciada em</th><th scope="col">Situação</th><th scope="col">Ação</th></tr></thead><tbody>${response.data.map((item) => `<tr><td>#${esc(item.id)}</td><td><strong>${esc(item.produto_nome)}</strong><br><span class="muted">${esc(item.lote_codigo)}</span></td><td>${formatDate(item.iniciada_em)}</td><td>${badge(item.status)}</td><td><a class="button secondary" href="#/inspecoes/${esc(item.id)}">Abrir inspeção <span class="sr-only">${esc(item.id)}</span></a></td></tr>`).join('')}</tbody></table></div><div class="pagination"><span>${response.total} inspeções · página ${page} de ${response.pages}</span><div class="actions"><button type="button" class="button secondary" data-prev ${page <= 1 ? 'disabled' : ''}>Anterior</button><button type="button" class="button secondary" data-next ${page >= response.pages ? 'disabled' : ''}>Próxima</button></div></div>`
        : empty(
            'Nenhuma inspeção encontrada. Abra uma inspeção para iniciar o controle de um lote.',
          );
      list.querySelector('[data-prev]')?.addEventListener('click', () => {
        page -= 1;
        load();
      });
      list.querySelector('[data-next]')?.addEventListener('click', () => {
        page += 1;
        load();
      });
    } catch (error) {
      if (!active || sequence !== listSequence) return;
      list.innerHTML = `${errorMessage(error)}<button class="button secondary" type="button" data-retry>Tentar novamente</button>`;
      list.querySelector('[data-retry]').addEventListener('click', load);
    }
  }
  filterForm.addEventListener('submit', (event) => {
    event.preventDefault();
    filters = Object.fromEntries([...new FormData(filterForm)].filter(([, value]) => value.trim()));
    page = 1;
    load();
  });
  root.querySelector('[data-new]').addEventListener('click', async () => {
    const card = root.querySelector('[data-create]');
    card.hidden = false;
    card.innerHTML = loading();
    try {
      const [lots, checklists, inspections, products] = await Promise.all([
        api.all('/lotes?ativo=true'),
        api.all('/checklists?ativo=true'),
        api.all('/inspecoes'),
        api.all('/produtos?ativo=true'),
      ]);
      if (!active) return;
      const used = new Set(inspections.map((item) => String(item.lote_id)));
      const activeProducts = new Map(products.map((item) => [String(item.id), item.nome]));
      const available = lots.filter(
        (item) =>
          item.status === 'pendente' &&
          !used.has(String(item.id)) &&
          activeProducts.has(String(item.produto_id)),
      );
      card.innerHTML = `<div class="card-header"><div><h2>Nova inspeção</h2><p class="muted">Responsável: ${esc(getUser().nome)}. Selecione um lote e um checklist ativo.</p></div><button class="button secondary" type="button" data-cancel>Cancelar</button></div>${!available.length || !checklists.length ? `<div class="notice">${!available.length ? 'Nenhum lote ativo disponível para inspeção.' : 'Cadastre um checklist ativo com critérios antes de iniciar.'}</div>` : `<form class="form-grid" data-open><div class="field"><label for="new-lot">Lote</label><select id="new-lot" name="lote_id" required><option value="">Selecione o lote</option>${available.map((item) => option(item.id, `${item.codigo} · ${activeProducts.get(String(item.produto_id))}`)).join('')}</select></div><div class="field"><label for="new-checklist">Checklist</label><select id="new-checklist" name="checklist_id" required><option value="">Selecione o checklist</option>${checklists.map((item) => option(item.id, item.nome)).join('')}</select></div><div class="full" data-open-error></div><div class="actions full"><button class="button" type="submit">Iniciar inspeção</button></div></form>`}`;
      card.querySelector('[data-cancel]').addEventListener('click', () => {
        card.hidden = true;
      });
      card.querySelector('[data-open]')?.addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = 'Iniciando…';
        form.querySelector('[data-open-error]').innerHTML = '';
        try {
          const inspection = await api.request('/inspecoes', {
            method: 'POST',
            body: Object.fromEntries(new FormData(form)),
          });
          if (active) {
            notify('Inspeção iniciada.');
            location.hash = `#/inspecoes/${inspection.id}`;
          }
        } catch (error) {
          if (active) form.querySelector('[data-open-error]').innerHTML = errorMessage(error);
        } finally {
          button.disabled = false;
          button.textContent = 'Iniciar inspeção';
        }
      });
      card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      card.querySelector('select')?.focus();
    } catch (error) {
      if (active) card.innerHTML = errorMessage(error);
    }
  });
  await load();
  return () => {
    active = false;
  };
}

async function mountDetail(root, id) {
  let active = true;
  let inspection;
  let deviations = [];
  let editable = false;
  let busy = false;
  const disabledControls = new Map();
  const rootError = () => root.querySelector('[data-page-error]');
  const pendingChanges = () =>
    [...root.querySelectorAll('[data-answer]')].some((form) => {
      const item = inspection.itens.find((entry) => String(entry.item_id) === form.dataset.answer);
      return (
        form.elements.resultado.value !== (item.resultado || '') ||
        form.elements.observacao.value.trim() !== (item.observacao || '')
      );
    });
  const isDirty = () => Boolean(inspection && editable && pendingChanges());
  root.canLeave = () => {
    if (busy) {
      notify('Aguarde a conclusão do salvamento antes de sair.');
      return false;
    }
    return (
      !isDirty() ||
      window.confirm('Há respostas ainda não salvas. Deseja sair e descartar essas alterações?')
    );
  };
  const beforeUnload = (event) => {
    if (busy || isDirty()) {
      event.preventDefault();
      event.returnValue = '';
    }
  };
  window.addEventListener('beforeunload', beforeUnload);
  function lock(value) {
    busy = value;
    if (value) {
      root.querySelectorAll('[data-mutation], input, select, textarea').forEach((control) => {
        disabledControls.set(control, control.disabled);
        control.disabled = true;
      });
    } else {
      for (const [control, wasDisabled] of disabledControls) control.disabled = wasDisabled;
      disabledControls.clear();
    }
  }
  function hideReview() {
    root.querySelector('[data-review]')?.replaceChildren();
  }
  function updateProgress() {
    const answered = inspection.itens.filter((item) => item.resposta_id).length;
    const mandatory = inspection.itens.filter((item) => item.obrigatorio);
    const requiredAnswered = mandatory.filter((item) => item.resposta_id).length;
    root.querySelector('[data-progress]').innerHTML =
      `<div class="actions"><strong>${answered} de ${inspection.itens.length} itens salvos</strong><span class="muted">${requiredAnswered} de ${mandatory.length} obrigatórios</span></div><progress max="${inspection.itens.length}" value="${answered}" aria-label="Itens salvos da inspeção"></progress>`;
  }
  function itemMarkup(item, index) {
    const nc = deviations.find((entry) => String(entry.resposta_id) === String(item.resposta_id));
    const canAnswer = editable && !nc;
    return `<div class="card-header"><div><p class="eyebrow">ITEM ${index + 1} · ${item.obrigatorio ? 'OBRIGATÓRIO' : 'OPCIONAL'}</p><h2>${esc(item.criterio_nome)}</h2><p class="muted">${esc(item.criterio_descricao || 'Sem descrição adicional.')}</p></div>${item.resultado ? badge(item.resultado) : '<span class="badge">Pendente</span>'}</div>
      ${
        canAnswer
          ? `<form data-answer="${esc(item.item_id)}" class="form-grid"><div class="field"><label for="result-${esc(item.item_id)}">Resultado</label><select id="result-${esc(item.item_id)}" name="resultado" required><option value="">Selecione o resultado</option>${Object.entries(
              results,
            )
              .map(([value, label]) => option(value, label, item.resultado))
              .join(
                '',
              )}</select></div><div class="field"><label for="observation-${esc(item.item_id)}">Observação</label><textarea id="observation-${esc(item.item_id)}" name="observacao" maxlength="3000" rows="3" aria-describedby="observation-help-${esc(item.item_id)}" ${item.resultado === 'nao_aplicavel' ? 'required' : ''}>${esc(item.observacao || '')}</textarea><small class="muted" id="observation-help-${esc(item.item_id)}">Obrigatória para resultado não aplicável.</small></div><div class="full" data-item-error role="status"></div><div class="actions full"><button type="submit" class="button secondary" data-mutation>Salvar resposta</button><span class="muted" data-save-state>${item.resposta_id ? 'Resposta salva.' : 'Nenhuma resposta salva.'}</span></div></form>`
          : `<p><strong>Observação:</strong> ${esc(item.observacao || 'Não informada.')}</p>${nc ? '<p class="muted">Resposta preservada por possuir uma não conformidade.</p>' : ''}`
      }
      ${nc ? `<div class="notice"><strong>Não conformidade #${esc(nc.id)}</strong><p>${esc(nc.descricao)}</p><a class="button secondary" href="#/nao-conformidades/${esc(nc.id)}">${editable ? 'Ver desvio e anexar fotos' : 'Ver não conformidade'}</a></div>` : editable && item.resultado === 'nao_conforme' ? `<details class="notice" open><summary><strong>Registrar não conformidade</strong></summary><p>Descreva o defeito antes de concluir a inspeção.</p><form class="form-grid" data-nc="${esc(item.item_id)}"><div class="field full"><label for="nc-description-${esc(item.item_id)}">Descrição do defeito</label><textarea id="nc-description-${esc(item.item_id)}" name="descricao" required maxlength="3000" rows="3"></textarea></div><div class="field"><label for="nc-classification-${esc(item.item_id)}">Severidade</label><select id="nc-classification-${esc(item.item_id)}" name="classificacao">${option('menor', 'Menor')}${option('maior', 'Maior')}${option('critica', 'Crítica')}</select></div><div class="full" data-nc-error></div><div class="actions full"><button class="button" type="submit" data-mutation>Registrar desvio</button></div></form></details>` : ''}`;
  }
  async function saveItem(form) {
    const item = inspection.itens.find((entry) => String(entry.item_id) === form.dataset.answer);
    const payload = {
      resultado: form.elements.resultado.value,
      observacao: form.elements.observacao.value.trim(),
    };
    if (!payload.resultado) throw new Error('Selecione um resultado para salvar a resposta.');
    if (payload.resultado === 'nao_aplicavel' && !payload.observacao)
      throw new Error('Justifique o resultado não aplicável na observação.');
    const answer = await api.request(`/inspecoes/${id}/respostas/${item.item_id}`, {
      method: 'PUT',
      body: payload,
    });
    Object.assign(item, {
      resposta_id: answer.id,
      resultado: answer.resultado,
      observacao: answer.observacao,
    });
    return item;
  }
  function renderItem(item) {
    const section = root.querySelector(`[data-item="${item.item_id}"]`);
    if (!section || !active) return;
    section.innerHTML = itemMarkup(item, inspection.itens.indexOf(item));
    wireItem(section);
    updateProgress();
    hideReview();
  }
  function wireItem(section) {
    const form = section.querySelector('[data-answer]');
    form?.addEventListener('input', () => {
      hideReview();
      form.querySelector('[data-save-state]').textContent = 'Alterações ainda não salvas.';
    });
    form?.elements.resultado.addEventListener('change', () => {
      form.elements.observacao.required = form.elements.resultado.value === 'nao_aplicavel';
    });
    form?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;
      lock(true);
      const errorContainer = form.querySelector('[data-item-error]');
      errorContainer.innerHTML = '';
      try {
        const item = await saveItem(form);
        if (active) {
          renderItem(item);
          notify('Resposta salva.');
        }
      } catch (error) {
        if (active) errorContainer.innerHTML = errorMessage(error);
      } finally {
        if (active) lock(false);
      }
    });
    section.querySelector('[data-nc]')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (busy) return;
      const ncForm = event.currentTarget;
      const item = inspection.itens.find((entry) => String(entry.item_id) === ncForm.dataset.nc);
      const answerForm = section.querySelector('[data-answer]');
      ncForm.querySelector('[data-nc-error]').innerHTML = '';
      if (
        answerForm &&
        (answerForm.elements.resultado.value !== item.resultado ||
          answerForm.elements.observacao.value.trim() !== (item.observacao || ''))
      ) {
        ncForm.querySelector('[data-nc-error]').innerHTML = errorMessage(
          new Error('Salve as alterações da resposta antes de registrar o desvio.'),
        );
        return;
      }
      const ncPayload = Object.fromEntries(new FormData(ncForm));
      lock(true);
      try {
        const nc = await api.request(`/respostas/${item.resposta_id}/nao-conformidade`, {
          method: 'POST',
          body: ncPayload,
        });
        deviations.push(nc);
        if (active) {
          renderItem(item);
          notify('Não conformidade registrada. Anexe as fotos antes de finalizar.');
        }
      } catch (error) {
        if (active) ncForm.querySelector('[data-nc-error]').innerHTML = errorMessage(error);
      } finally {
        if (active) lock(false);
      }
    });
  }
  async function load() {
    root.innerHTML = loading();
    try {
      inspection = await api.request(`/inspecoes/${id}`);
      inspection.itens = inspection.itens.map((item) => {
        const answer = inspection.respostas.find((r) => r.item_id === item.id);
        return {
          ...item,
          item_id: item.id,
          resposta_id: answer?.id,
          resultado: answer?.resultado,
          observacao: answer?.observacao,
        };
      });
      const [lot, checklist, found] = await Promise.all([
        api.request(`/lotes/${inspection.lote_id}`),
        api.request(`/checklists/${inspection.checklist_id}`),
        api.all(`/nao-conformidades?lote_id=${inspection.lote_id}`),
      ]);
      if (!active) return;
      deviations = found.filter((item) => String(item.inspecao_id) === String(id));
      editable = inspection.status === 'em_andamento' && canEditInspection(inspection);
      root.innerHTML = `<header class="page-header"><div><p class="eyebrow"><a href="#/inspecoes">INSPEÇÕES</a> / #${esc(id)}</p><h1>Inspeção do lote ${esc(lot.codigo)}</h1><p class="muted">${esc(checklist.nome)} · Iniciada em ${formatDate(inspection.iniciada_em)}</p></div>${badge(inspection.status)}</header>
        <section class="card"><div class="detail-grid"><div><span class="muted">Responsável</span><p>${String(inspection.inspetor_id) === String(getUser().id) ? esc(getUser().nome) : `Inspetor #${esc(inspection.inspetor_id)}`}</p></div><div><span class="muted">Lote</span><p><a href="#/lotes/${esc(lot.id)}">${esc(lot.codigo)}</a> · ${esc(lot.quantidade)} unidades</p></div><div><span class="muted">Finalizada em</span><p>${inspection.finalizada_em ? formatDate(inspection.finalizada_em) : 'Em andamento'}</p></div></div><div data-progress></div></section>
        ${!editable && inspection.status === 'em_andamento' ? '<div class="notice">Consulta da inspeção de outro responsável. As alterações estão disponíveis apenas ao responsável e aos gestores.</div>' : ''}
        ${inspection.status !== 'em_andamento' ? '<div class="notice">Inspeção finalizada. Respostas e evidências estão preservadas para consulta.</div>' : ''}
        <div data-page-error></div><div class="stack">${inspection.itens.map((item, index) => `<section class="card inspection-item" data-item="${esc(item.item_id)}">${itemMarkup(item, index)}</section>`).join('')}</div>
        ${editable ? `<section class="card"><h2>Revisão e conclusão</h2><p class="muted">Salve as respostas e registre os desvios. As fotos devem ser anexadas antes da conclusão.</p><div class="actions"><button class="button secondary" type="button" data-save-all data-mutation>Salvar progresso</button><button class="button" type="button" data-review-button data-mutation>Revisar conclusão</button></div><div data-review aria-live="polite"></div></section>` : ''}`;
      updateProgress();
      root.querySelectorAll('[data-item]').forEach(wireItem);
      root.querySelector('[data-save-all]')?.addEventListener('click', async () => {
        if (busy) return;
        lock(true);
        rootError().innerHTML = '';
        let saved = 0;
        try {
          for (const form of [...root.querySelectorAll('[data-answer]')]) {
            const item = inspection.itens.find(
              (entry) => String(entry.item_id) === form.dataset.answer,
            );
            if (!form.elements.resultado.value) {
              if (form.elements.observacao.value.trim())
                throw new Error(
                  `Selecione um resultado para “${item.criterio_nome}” antes de salvar sua observação.`,
                );
              continue;
            }
            if (
              form.elements.resultado.value === item.resultado &&
              form.elements.observacao.value.trim() === (item.observacao || '')
            )
              continue;
            if (!form.reportValidity())
              throw new Error('Revise os campos indicados antes de salvar.');
            const updated = await saveItem(form);
            if (active) renderItem(updated);
            saved += 1;
          }
          if (active)
            notify(saved ? 'Progresso salvo.' : 'Todas as respostas preenchidas já estão salvas.');
        } catch (error) {
          if (active) rootError().innerHTML = errorMessage(error);
        } finally {
          if (active) lock(false);
        }
      });
      root.querySelector('[data-review-button]')?.addEventListener('click', () => {
        rootError().innerHTML = '';
        const review = root.querySelector('[data-review]');
        const missing = inspection.itens.filter((item) => item.obrigatorio && !item.resposta_id);
        const missingNc = inspection.itens.filter(
          (item) =>
            item.resultado === 'nao_conforme' &&
            !deviations.some((nc) => String(nc.resposta_id) === String(item.resposta_id)),
        );
        if (pendingChanges()) {
          rootError().innerHTML = errorMessage(
            new Error('Há alterações não salvas. Salve o progresso antes de revisar.'),
          );
          return;
        }
        if (missing.length || !inspection.itens.some((item) => item.resposta_id)) {
          rootError().innerHTML = errorMessage(
            new Error(
              'Responda os itens obrigatórios e salve ao menos uma resposta antes de concluir.',
            ),
          );
          return;
        }
        if (missingNc.length) {
          rootError().innerHTML = errorMessage(
            new Error('Registre a não conformidade de cada item com resultado não conforme.'),
          );
          return;
        }
        review.innerHTML = `<div class="notice"><h3>Confira antes de finalizar</h3><ul>${inspection.itens.map((item) => `<li>${esc(item.criterio_nome)}: <strong>${esc(results[item.resultado] || 'Opcional não respondido')}</strong></li>`).join('')}</ul><p>${deviations.length} não conformidade(s) registrada(s). A decisão final será calculada pelo sistema.</p><p>Após finalizar, não será possível alterar respostas nem enviar novas fotos.</p><label><input type="checkbox" data-confirm> Conferi as respostas, os desvios e as evidências.</label><div class="actions"><button class="button" type="button" data-finalize data-mutation disabled>Confirmar e finalizar</button><button class="button secondary" type="button" data-cancel-review>Voltar à inspeção</button></div><div data-final-error></div></div>`;
        review.querySelector('[data-confirm]').addEventListener('change', (event) => {
          review.querySelector('[data-finalize]').disabled = !event.target.checked;
        });
        review.querySelector('[data-cancel-review]').addEventListener('click', hideReview);
        review.querySelector('[data-finalize]').addEventListener('click', async () => {
          if (busy || !review.querySelector('[data-confirm]').checked) return;
          lock(true);
          try {
            await api.request(`/inspecoes/${id}/finalizar`, { method: 'POST' });
            if (active) {
              notify('Inspeção finalizada.');
              await load();
            }
          } catch (error) {
            if (active) review.querySelector('[data-final-error]').innerHTML = errorMessage(error);
          } finally {
            if (active) lock(false);
          }
        });
        review.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        review.querySelector('[data-confirm]').focus();
      });
    } catch (error) {
      if (!active) return;
      root.innerHTML = `<header class="page-header"><h1>Inspeção</h1><a href="#/inspecoes">Voltar às inspeções</a></header>${errorMessage(error)}<button class="button secondary" type="button" data-retry>Tentar novamente</button>`;
      root.querySelector('[data-retry]').addEventListener('click', load);
    }
  }
  await load();
  return () => {
    active = false;
    window.removeEventListener('beforeunload', beforeUnload);
    delete root.canLeave;
  };
}
