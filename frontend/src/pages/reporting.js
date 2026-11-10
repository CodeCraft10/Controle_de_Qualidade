import { api } from '../api.js';
import { esc, badge, formatDate, notify, empty, loading, download } from '../ui.js';
import { getUser, canManage } from '../session.js';

const number = new Intl.NumberFormat('pt-BR');
const percent = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 2 });
const labels = { aprovada: 'Aprovadas', reprovada: 'Reprovadas', em_andamento: 'Em andamento' };

// These styles only extend the shared design system for the reporting views.
const styles = `<style>
  .report-page .report-filters{margin-bottom:24px}
  .report-page .report-primary-filters{display:grid;grid-template-columns:minmax(200px,2fr) repeat(2,minmax(145px,1fr));gap:16px}
  .report-page .report-secondary-filters{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px;margin-top:16px}
  .report-page .report-filter-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:20px}
  .report-page .report-filter-footer p{margin:0;font-size:.8rem;max-width:520px}
  .report-page details.report-advanced{margin-top:16px}
  .report-page details.report-advanced summary{cursor:pointer;color:#142D4E;font-weight:600;font-size:.875rem;width:fit-content;padding:4px 0}
  .report-page .report-grid{display:grid;grid-template-columns:minmax(0,1.3fr) minmax(260px,1fr);gap:24px;margin:24px 0}
  .report-page .report-metric-note{font-size:.8rem;color:#64748b;display:block;margin-top:8px}
  .report-page .report-distribution{display:grid;gap:24px;margin:24px 0 8px}
  .report-page .report-bar-label{display:flex;justify-content:space-between;gap:16px;font-size:.875rem;margin-bottom:10px}
  .report-page .report-bar-track{background:#edf1f6;border-radius:5px;height:10px;overflow:hidden}
  .report-page .report-bar-fill{height:100%;border-radius:5px;min-width:0}
  .report-page .report-rate{display:flex;align-items:center;justify-content:center;gap:28px;flex-wrap:wrap;padding:8px 0}
  .report-page .report-ring{width:152px;height:152px;flex:0 0 auto}
  .report-page .report-rate-label{font-size:.875rem;max-width:180px;line-height:1.6}
  .report-page .report-rate-label strong{display:block;color:#142D4E;font-size:1.05rem;margin-bottom:6px}
  .report-page .report-help{font-size:.8rem;line-height:1.6;margin-top:18px}
  .report-page .report-table-top{display:flex;gap:16px;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap}
  .report-page .report-table-top h2{margin:0 0 5px}
  .report-page .report-table-top p{margin:0}
  .report-page .report-count{color:#64748b;font-size:.85rem}
  .report-page .report-cell-main{font-weight:600;color:#142D4E;display:block}
  .report-page .report-cell-sub{display:block;font-size:.75rem;color:#64748b;margin-top:4px}
  .report-page .report-pagination-controls{display:flex;align-items:center;gap:10px;flex-wrap:wrap}
  .report-page .report-pagination-controls select{width:auto;min-width:74px}
  .report-page .report-pager-status{min-width:85px;text-align:center;font-size:.85rem;color:#475569}
  .report-page .report-export-note{font-size:.8rem;margin:12px 0 0}
  .report-page .report-live{font-size:.8rem;margin:0 0 16px;color:#64748b}
  .report-page .report-filter-error:empty,.report-page .report-lookup-note:empty{display:none}
  @media(max-width:1000px){.report-page .report-secondary-filters{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media(max-width:760px){.report-page .report-grid{grid-template-columns:1fr}.report-page .report-primary-filters{grid-template-columns:1fr 1fr}.report-page .report-search-field{grid-column:1/-1}}
  @media(max-width:480px){.report-page .report-primary-filters,.report-page .report-secondary-filters{grid-template-columns:1fr}.report-page .report-search-field{grid-column:auto}.report-page .report-filter-footer .actions{width:100%}.report-page .report-filter-footer .button{flex:1}.report-page .report-pagination-controls{width:100%;justify-content:space-between}}
</style>`;

function options(rows, text) {
  return rows.map((row) => `<option value="${esc(row.id)}">${esc(text(row))}</option>`).join('');
}

function filtersMarkup() {
  return `<form class="card report-filters" data-report-filters aria-label="Filtros de inspeções">
    <div class="report-primary-filters">
      <div class="field report-search-field"><label for="report-search">Pesquisar produto ou lote</label><input id="report-search" name="busca" type="search" maxlength="100" placeholder="Nome do produto ou código do lote"></div>
      <div class="field"><label for="report-from">Data inicial</label><input id="report-from" name="de" type="date"></div>
      <div class="field"><label for="report-to">Data final</label><input id="report-to" name="ate" type="date"></div>
    </div>
    <details class="report-advanced"><summary>Filtros adicionais</summary>
      <div class="report-secondary-filters">
        <div class="field"><label for="report-product">Produto</label><select id="report-product" name="produto_id" disabled><option value="">Carregando produtos…</option></select></div>
        <div class="field"><label for="report-lot">Lote</label><select id="report-lot" name="lote_id" disabled><option value="">Carregando lotes…</option></select></div>
        <div class="field"><label for="report-inspector">Responsável pela inspeção</label><select id="report-inspector" name="inspetor_id" disabled><option value="">Carregando responsáveis…</option></select></div>
        <div class="field"><label for="report-status">Resultado</label><select id="report-status" name="status"><option value="">Todos os resultados</option><option value="em_andamento">Em andamento</option><option value="aprovada">Aprovada</option><option value="reprovada">Reprovada</option></select></div>
      </div>
      ${canManage() ? '' : '<p class="muted report-help">No filtro de responsável, você pode consultar todas as inspeções ou somente as suas.</p>'}
      <div class="report-lookup-note notice" role="status"></div>
    </details>
    <div class="report-filter-error notice error" role="alert"></div>
    <div class="report-filter-footer"><p class="muted">O período considera a abertura da inspeção, com o dia final incluído, no horário de Brasília.</p><div class="actions"><button class="button secondary" type="reset">Limpar filtros</button><button class="button" type="submit">Aplicar filtros</button></div></div>
  </form>`;
}

function errorMarkup(error) {
  return `<div class="card"><div class="notice error" role="alert"><strong>Não foi possível carregar os dados.</strong><p>${esc(error.message || 'Verifique a conexão e tente novamente.')}</p></div><button class="button secondary" type="button" data-report-retry>Tentar novamente</button></div>`;
}

function filterValues(form) {
  const values = Object.fromEntries(
    [...new FormData(form)]
      .map(([key, value]) => [key, String(value).trim()])
      .filter(([, value]) => value),
  );
  if (values.de && values.ate && values.de > values.ate)
    throw new Error('A data final deve ser igual ou posterior à data inicial.');
  return values;
}

function query(values, extra = {}) {
  return new URLSearchParams({ ...values, ...extra }).toString();
}

function inspectionTable(rows, { compact = false } = {}) {
  if (!rows.length)
    return empty('Nenhuma inspeção encontrada. Ajuste os filtros ou inicie uma nova inspeção.');
  return `<div class="table-wrap"><table><caption class="sr-only">Inspeções consultadas na API</caption><thead><tr><th scope="col">Inspeção / lote</th><th scope="col">Produto</th>${compact ? '' : '<th scope="col">Responsável</th><th scope="col">Checklist</th>'}<th scope="col">Abertura</th>${compact ? '' : '<th scope="col">Conclusão</th>'}<th scope="col">Resultado</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>${rows
    .map(
      (row) => `<tr>
    <td><span class="report-cell-main">${esc(row.lote)}</span><span class="report-cell-sub">Inspeção #${esc(row.id)}</span></td>
    <td>${esc(row.produto)}</td>${compact ? '' : `<td>${esc(row.inspetor)}</td><td>${esc(row.checklist)}</td>`}
    <td>${esc(formatDate(row.iniciada_em))}</td>${compact ? '' : `<td>${row.finalizada_em ? esc(formatDate(row.finalizada_em)) : '<span class="muted">Em andamento</span>'}</td>`}
    <td>${badge(row.status)}</td><td><a class="button secondary" href="#/inspecoes/${encodeURIComponent(row.id)}" aria-label="Ver inspeção ${esc(row.id)} do lote ${esc(row.lote)}">Ver</a></td>
  </tr>`,
    )
    .join('')}</tbody></table></div>`;
}

function dashboardMarkup(data, recent) {
  const approved = Number(data.aprovadas);
  const rejected = Number(data.reprovadas);
  const pending = Number(data.em_andamento);
  const total = Number(data.total);
  const finished = Number(data.finalizadas);
  const rate = Math.max(0, Math.min(100, Number(data.taxa_aprovacao)));
  const distribution = [
    { key: 'aprovada', count: approved, color: '#15803d' },
    { key: 'reprovada', count: rejected, color: '#b91c1c' },
    { key: 'em_andamento', count: pending, color: '#2563eb' },
  ];
  const metrics = [
    {
      label: 'Inspeções registradas',
      value: number.format(total),
      note: 'No período e filtros selecionados',
    },
    {
      label: 'Taxa de aprovação',
      value: finished ? `${percent.format(rate)}%` : '—',
      note: finished
        ? `${number.format(finished)} inspeções finalizadas`
        : 'Sem inspeções finalizadas',
    },
    {
      label: 'Não conformidades',
      value: number.format(data.nao_conformidades),
      note: 'Desvios ligados às inspeções filtradas',
    },
    {
      label: 'Em andamento',
      value: number.format(pending),
      note: 'Inspeções aguardando conclusão',
    },
  ];
  return `<div class="metric-grid">${metrics.map((metric) => `<article class="metric-card"><h2>${metric.label}</h2><div class="metric-value">${metric.value}</div><span class="report-metric-note">${metric.note}</span></article>`).join('')}</div>
    <div class="report-grid">
      <section class="card" aria-labelledby="distribution-heading"><div class="card-header"><div><p class="eyebrow">ACOMPANHAMENTO</p><h2 id="distribution-heading">Situação das inspeções</h2></div></div>
        <div class="report-distribution">${distribution.map(({ key, count, color }) => `<div><div class="report-bar-label"><span>${labels[key]}</span><strong>${number.format(count)}</strong></div><div class="report-bar-track" role="meter" aria-label="${labels[key]}" aria-valuemin="0" aria-valuemax="${Math.max(1, total)}" aria-valuenow="${count}" aria-valuetext="${number.format(count)} de ${number.format(total)} inspeções"><div class="report-bar-fill" style="background:${color};width:${total ? (count / total) * 100 : 0}%"></div></div></div>`).join('')}</div>
        <p class="muted report-help">${total ? `${number.format(finished)} de ${number.format(total)} inspeções já foram finalizadas.` : 'Ainda não há inspeções para os filtros selecionados.'}</p>
      </section>
      <section class="card" aria-labelledby="approval-heading"><div class="card-header"><div><p class="eyebrow">RESULTADO DA QUALIDADE</p><h2 id="approval-heading">Aprovação dos lotes</h2></div></div>
        <div class="report-rate"><svg class="report-ring" viewBox="0 0 160 160" role="img" aria-label="${finished ? `Taxa de aprovação: ${percent.format(rate)} por cento das inspeções finalizadas` : 'Sem inspeções finalizadas'}"><circle cx="80" cy="80" r="64" fill="none" stroke="#edf1f6" stroke-width="13"/><circle cx="80" cy="80" r="64" fill="none" stroke="#2563eb" stroke-width="13" pathLength="100" stroke-dasharray="${rate} 100" transform="rotate(-90 80 80)"/><text x="80" y="84" text-anchor="middle" fill="#142D4E" font-size="25" font-weight="700">${finished ? `${percent.format(rate)}%` : '—'}</text><text x="80" y="106" text-anchor="middle" fill="#64748b" font-size="11">${finished ? 'de aprovação' : 'sem resultados'}</text></svg>
          <div class="report-rate-label"><strong>${number.format(approved)} aprovadas</strong>${number.format(rejected)} reprovadas<br>${number.format(pending)} em andamento</div></div>
        <p class="muted report-help">Taxa calculada pelo backend: aprovadas ÷ finalizadas × 100. Inspeções em andamento não entram no denominador.</p>
      </section>
    </div>
    <section class="card" aria-labelledby="recent-heading"><div class="report-table-top"><div><p class="eyebrow">RASTREABILIDADE</p><h2 id="recent-heading">Inspeções recentes</h2><p class="report-count">Até 5 inspeções mais recentes para os filtros aplicados.</p></div><a class="button secondary" href="#/historico">Ver histórico completo</a></div>${inspectionTable(recent.data, { compact: true })}</section>`;
}

async function mountReporting(root, mode) {
  let active = true;
  let requestController;
  let exportController;
  let lookupController;
  let applied = {};
  let page = 1;
  let limit = 20;
  let result = null;
  let lots = [];
  let generation = 0;
  let exporting = false;
  const dashboard = mode === 'dashboard';
  const reports = mode === 'reports';
  const title = dashboard
    ? 'Visão geral'
    : reports
      ? 'Relatórios de inspeção'
      : 'Histórico de inspeções';
  const description = dashboard
    ? 'Acompanhe as inspeções e os resultados do controle de qualidade.'
    : reports
      ? 'Consulte os resultados e exporte os registros para análise.'
      : 'Encontre inspeções, consulte os resultados e acompanhe a rastreabilidade dos lotes.';
  root.innerHTML = `<div class="report-page">${styles}<div class="page-header"><div><p class="eyebrow">${dashboard ? 'PAINEL DE QUALIDADE' : 'CONSULTAS E RASTREABILIDADE'}</p><h1>${title}</h1><p class="muted">${description}</p></div><div class="actions">${dashboard ? '<a class="button secondary" href="#/relatorios">Ver relatórios</a><a class="button" href="#/inspecoes">Iniciar inspeção</a>' : reports ? '<a class="button secondary" href="#/historico">Ver histórico</a>' : '<a class="button secondary" href="#/relatorios">Ver relatórios</a>'}</div></div>${filtersMarkup()}<div class="report-live" role="status" aria-live="polite" data-report-status></div><div data-report-results aria-busy="true">${loading()}</div></div>`;
  const form = root.querySelector('[data-report-filters]');
  const results = root.querySelector('[data-report-results]');
  const live = root.querySelector('[data-report-status]');
  const filterError = root.querySelector('.report-filter-error');
  const productSelect = form.elements.produto_id;
  const lotSelect = form.elements.lote_id;
  const inspectorSelect = form.elements.inspetor_id;

  function populateLots() {
    const previous = lotSelect.value;
    const available = lots.filter(
      (lot) => !productSelect.value || String(lot.produto_id) === productSelect.value,
    );
    lotSelect.innerHTML =
      '<option value="">Todos os lotes</option>' + options(available, (lot) => lot.codigo);
    if (available.some((lot) => String(lot.id) === previous)) lotSelect.value = previous;
  }

  async function loadLookups() {
    lookupController?.abort();
    const controller = new AbortController();
    lookupController = controller;
    const note = root.querySelector('.report-lookup-note');
    note.textContent = '';
    const user = getUser();
    const outcomes = await Promise.allSettled([
      api.all('/produtos?ordenar=nome&direcao=asc', { signal: controller.signal }),
      api.all('/lotes?ordenar=codigo&direcao=asc', { signal: controller.signal }),
      canManage()
        ? api.all('/usuarios?ordenar=nome&direcao=asc', { signal: controller.signal })
        : Promise.resolve([{ id: user.id, nome: 'Minhas inspeções' }]),
    ]);
    if (!active || controller.signal.aborted) return;
    const selectors = [productSelect, lotSelect, inspectorSelect];
    const defaults = ['Todos os produtos', 'Todos os lotes', 'Todos os responsáveis'];
    outcomes.forEach((outcome, index) => {
      const select = selectors[index];
      if (outcome.status === 'rejected') {
        select.innerHTML = `<option value="">${defaults[index]} (filtro indisponível)</option>`;
        select.disabled = true;
      } else {
        const previous = select.value;
        if (index === 1) {
          lots = outcome.value;
          populateLots();
        } else
          select.innerHTML =
            `<option value="">${defaults[index]}</option>` +
            options(outcome.value, (row) =>
              index === 0 ? `${row.codigo} · ${row.nome}` : row.nome,
            );
        if ([...select.options].some((option) => option.value === previous))
          select.value = previous;
        select.disabled = false;
      }
    });
    if (outcomes.some((outcome) => outcome.status === 'rejected')) {
      note.innerHTML =
        'Alguns seletores não puderam ser carregados. A consulta permanece disponível com os demais filtros. <button class="button secondary" type="button" data-report-lookups>Tentar carregar filtros</button>';
    }
  }

  function tableMarkup(response) {
    const start = response.total ? (response.page - 1) * response.limit + 1 : 0;
    const end = Math.min(response.page * response.limit, response.total);
    return `<section class="card" aria-labelledby="report-table-heading"><div class="report-table-top"><div><h2 id="report-table-heading">${reports ? 'Registros do relatório' : 'Inspeções encontradas'}</h2><p class="report-count">${number.format(response.total)} ${response.total === 1 ? 'registro encontrado' : 'registros encontrados'}</p></div>${reports ? `<button class="button secondary" type="button" data-report-export ${response.total && !exporting ? '' : 'disabled'}>${exporting ? 'Exportando…' : 'Exportar página CSV'}</button>` : ''}</div>
      ${inspectionTable(response.data)}
      <div class="pagination"><span class="muted">${start ? `${number.format(start)}–${number.format(end)} de ${number.format(response.total)}` : 'Nenhum registro'}</span><div class="report-pagination-controls"><label for="report-limit">Por página</label><select id="report-limit" data-report-limit>${[20, 50, 100].map((value) => `<option value="${value}" ${value === limit ? 'selected' : ''}>${value}</option>`).join('')}</select><button class="button secondary" type="button" data-report-prev ${page <= 1 ? 'disabled' : ''} aria-label="Página anterior">Anterior</button><span class="report-pager-status">${response.pages ? `Página ${page} de ${response.pages}` : 'Página 1'}</span><button class="button secondary" type="button" data-report-next ${page >= response.pages ? 'disabled' : ''} aria-label="Próxima página">Próxima</button></div></div>
      ${reports ? '<p class="muted report-export-note">O CSV inclui apenas a página exibida, com os mesmos filtros e ordenação. Para exportar mais registros, escolha até 100 por página e percorra as páginas.</p>' : ''}</section>`;
  }

  async function refresh() {
    requestController?.abort();
    const controller = new AbortController();
    requestController = controller;
    const currentGeneration = ++generation;
    result = null;
    results.setAttribute('aria-busy', 'true');
    results.innerHTML = loading();
    live.textContent = 'Consultando os registros…';
    try {
      if (dashboard) {
        const [data, recent] = await Promise.all([
          api.request(`/indicadores?${query(applied)}`, { signal: controller.signal }),
          api.request(
            `/relatorios/inspecoes?${query(applied, { page: 1, limit: 5, ordenar: 'iniciada_em', direcao: 'desc' })}`,
            { signal: controller.signal },
          ),
        ]);
        if (!active || currentGeneration !== generation) return;
        results.innerHTML = dashboardMarkup(data, recent);
        live.textContent = `${number.format(data.total)} inspeções nos filtros aplicados. Dados atualizados agora.`;
      } else {
        const response = await api.request(
          `/relatorios/inspecoes?${query(applied, { page, limit, ordenar: 'iniciada_em', direcao: 'desc' })}`,
          { signal: controller.signal },
        );
        if (!active || currentGeneration !== generation) return;
        result = response;
        results.innerHTML = tableMarkup(response);
        live.textContent = `${number.format(response.total)} registros encontrados. ${response.pages ? `Página ${response.page} de ${response.pages}.` : ''}`;
      }
    } catch (error) {
      if (!active || currentGeneration !== generation || controller.signal.aborted) return;
      results.innerHTML = errorMarkup(error);
      live.textContent = 'A consulta não foi concluída.';
    } finally {
      if (active && currentGeneration === generation) results.setAttribute('aria-busy', 'false');
    }
  }

  async function exportPage(button) {
    if (exporting || !result?.total) return;
    exporting = true;
    button.disabled = true;
    button.textContent = 'Exportando…';
    exportController = new AbortController();
    const exportPageNumber = result.page;
    const exportLimit = result.limit;
    const exportFilters = { ...applied };
    try {
      const blob = await api.blob(
        `/relatorios/inspecoes?${query(exportFilters, { formato: 'csv', page: exportPageNumber, limit: exportLimit, ordenar: 'iniciada_em', direcao: 'desc' })}`,
        { signal: exportController.signal },
      );
      if (!active) return;
      download(blob, `gp4-inspecoes-pagina-${exportPageNumber}.csv`);
      notify(`CSV da página ${exportPageNumber} exportado.`);
    } catch (error) {
      if (active && !exportController.signal.aborted)
        notify(error.message || 'Não foi possível exportar o relatório.', 'error');
    } finally {
      exporting = false;
      if (active) {
        const currentButton = root.querySelector('[data-report-export]');
        if (currentButton) {
          currentButton.disabled = !result?.total;
          currentButton.textContent = 'Exportar página CSV';
        }
      }
    }
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    filterError.textContent = '';
    try {
      applied = filterValues(form);
      page = 1;
      void refresh();
    } catch (error) {
      filterError.textContent = error.message;
      form.elements.ate.focus();
    }
  });
  form.addEventListener('reset', () => {
    // Wait until the native reset has restored the fields before refreshing the dependent selector.
    queueMicrotask(() => {
      if (!active) return;
      applied = {};
      page = 1;
      filterError.textContent = '';
      populateLots();
      void refresh();
    });
  });
  productSelect.addEventListener('change', populateLots);
  function onClick(event) {
    const button = event.target.closest('button');
    if (!button || button.disabled) return;
    if (button.hasAttribute('data-report-retry')) void refresh();
    if (button.hasAttribute('data-report-lookups')) void loadLookups();
    if (button.hasAttribute('data-report-prev') && page > 1) {
      page -= 1;
      void refresh();
    }
    if (button.hasAttribute('data-report-next') && result && page < result.pages) {
      page += 1;
      void refresh();
    }
    if (button.hasAttribute('data-report-export')) void exportPage(button);
  }
  function onChange(event) {
    if (event.target.matches('[data-report-limit]')) {
      limit = Number(event.target.value);
      page = 1;
      void refresh();
    }
  }
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  void loadLookups();
  void refresh();
  return () => {
    active = false;
    requestController?.abort();
    exportController?.abort();
    lookupController?.abort();
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
  };
}

export async function mountDashboard(root) {
  return mountReporting(root, 'dashboard');
}

export async function mountHistory(root, { reports = false } = {}) {
  return mountReporting(root, reports ? 'reports' : 'history');
}
