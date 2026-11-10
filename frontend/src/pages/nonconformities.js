import { api } from '../api.js';
import { esc, badge, formatDate, notify, empty, loading, download } from '../ui.js';
import { canManage, canEditInspection } from '../session.js';

const statuses = { aberta: 'Aberta', em_tratamento: 'Em tratamento', resolvida: 'Resolvida' };
const classifications = { menor: 'Menor', maior: 'Maior', critica: 'Crítica' };

export async function mountNonconformities(root, { id } = {}) {
  let disposed = false;
  const controller = new AbortController();
  const urls = new Set();
  let listSequence = 0;
  let page = 1;
  let query = new URLSearchParams();
  let current = null;
  let inspection = null;
  const request = (path, options = {}) =>
    api.request(path, { ...options, signal: controller.signal });

  function errorMessage(error) {
    return `<div class="notice error" role="alert">${esc(error.message || 'Não foi possível concluir a operação.')}</div>`;
  }

  function revokeImages() {
    for (const url of urls) URL.revokeObjectURL(url);
    urls.clear();
  }

  function mountList() {
    root.innerHTML = `<header class="page-header"><div><p class="eyebrow">CONTROLE DE QUALIDADE</p><h1>Não conformidades</h1><p class="muted">Acompanhe desvios, evidências e o histórico de tratamento.</p></div><a class="button secondary" href="#/inspecoes">Ir para inspeções</a></header>
      <section class="card"><form id="nc-filters" class="form-grid" aria-label="Filtros de não conformidades">
        <div class="field"><label for="nc-search">Produto ou lote</label><input id="nc-search" name="busca" maxlength="100" placeholder="Nome ou código"></div>
        <div class="field"><label for="nc-status">Situação</label><select id="nc-status" name="status"><option value="">Todas as situações</option>${Object.entries(
          statuses,
        )
          .map(([value, text]) => `<option value="${value}">${text}</option>`)
          .join('')}</select></div>
        <div class="field"><label for="nc-from">Início da inspeção: de</label><input id="nc-from" type="date" name="de"></div>
        <div class="field"><label for="nc-to">Início da inspeção: até</label><input id="nc-to" type="date" name="ate"></div>
        <div class="actions full"><button class="button" type="submit">Aplicar filtros</button><button class="button secondary" type="reset">Limpar</button></div>
      </form></section><div id="nc-results" class="stack" aria-live="polite"></div>`;
    const form = root.querySelector('#nc-filters');
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const values = Object.fromEntries(new FormData(form));
      const to = form.elements.ate;
      to.setCustomValidity(
        values.de && values.ate && values.de > values.ate
          ? 'A data final deve ser igual ou posterior à inicial.'
          : '',
      );
      if (!form.reportValidity()) return;
      query = new URLSearchParams(
        Object.entries(values)
          .filter(([, value]) => value.trim())
          .map(([key, value]) => [key, value.trim()]),
      );
      page = 1;
      loadList();
    });
    form.addEventListener('input', () => form.elements.ate.setCustomValidity(''));
    form.addEventListener('reset', () => {
      form.elements.ate.setCustomValidity('');
      query = new URLSearchParams();
      page = 1;
      loadList();
    });
    return loadList();
  }

  async function loadList() {
    const sequence = ++listSequence;
    const target = root.querySelector('#nc-results');
    target.innerHTML = loading();
    const params = new URLSearchParams(query);
    params.set('page', String(page));
    params.set('limit', '20');
    try {
      const result = await request(`/nao-conformidades?${params}`);
      if (disposed || sequence !== listSequence) return;
      target.innerHTML = `<section class="card"><div class="card-header"><h2>Desvios registrados</h2><span class="muted">${esc(result.total)} registro(s)</span></div>${result.data.length ? `<div class="table-wrap"><table><thead><tr><th scope="col">Desvio</th><th scope="col">Descrição</th><th scope="col">Severidade</th><th scope="col">Situação</th><th scope="col">Registrado em</th><th scope="col">Inspeção</th></tr></thead><tbody>${result.data.map((item) => `<tr><td><a href="#/nao-conformidades/${esc(item.id)}">NC #${esc(item.id)}</a></td><td>${esc(item.descricao)}</td><td>${esc(classifications[item.classificacao] || item.classificacao)}</td><td>${badge(item.status)}</td><td>${esc(formatDate(item.criado_em))}</td><td><a href="#/inspecoes/${esc(item.inspecao_id)}">#${esc(item.inspecao_id)}</a></td></tr>`).join('')}</tbody></table></div>` : empty('Nenhuma não conformidade encontrada. Os desvios são registrados ao preencher uma inspeção.')}<nav class="pagination" aria-label="Páginas de não conformidades"><button type="button" class="button secondary" data-page="previous" ${page <= 1 ? 'disabled' : ''}>Anterior</button><span>Página ${esc(page)} de ${esc(Math.max(1, result.pages))}</span><button type="button" class="button secondary" data-page="next" ${page >= result.pages ? 'disabled' : ''}>Próxima</button></nav></section>`;
      target.querySelectorAll('[data-page]').forEach((button) =>
        button.addEventListener('click', () => {
          page += button.dataset.page === 'next' ? 1 : -1;
          loadList();
        }),
      );
    } catch (error) {
      if (disposed || sequence !== listSequence) return;
      target.innerHTML = `${errorMessage(error)}<button type="button" class="button secondary" data-retry>Tentar novamente</button>`;
      target.querySelector('[data-retry]').addEventListener('click', loadList);
    }
  }

  async function mountDetail() {
    revokeImages();
    root.innerHTML = loading();
    try {
      current = await request(`/nao-conformidades/${encodeURIComponent(id)}`);
      inspection = await request(`/inspecoes/${encodeURIComponent(current.inspecao_id)}`);
      if (disposed) return;
      const allowed = canEditInspection(inspection);
      const next = { aberta: 'em_tratamento', em_tratamento: 'resolvida' }[current.status];
      root.innerHTML = `<header class="page-header"><div><p class="eyebrow">GESTÃO DE DESVIOS</p><h1>Não conformidade #${esc(current.id)}</h1><p class="muted">Registro vinculado à inspeção #${esc(current.inspecao_id)}.</p></div><div class="actions"><a class="button secondary" href="#/nao-conformidades">Todos os desvios</a><a class="button secondary" href="#/inspecoes/${esc(current.inspecao_id)}">Voltar à inspeção</a></div></header>
        <section class="card stack"><div class="card-header"><h2>Detalhes do desvio</h2>${badge(current.status)}</div><p style="white-space:pre-wrap">${esc(current.descricao)}</p><dl class="detail-grid"><div><dt>Severidade</dt><dd>${esc(classifications[current.classificacao] || current.classificacao)}</dd></div><div><dt>Registrado em</dt><dd>${esc(formatDate(current.criado_em))}</dd></div><div><dt>Inspeção</dt><dd>${badge(inspection.status)}</dd></div><div><dt>Item do checklist</dt><dd>#${esc(current.item_id)}</dd></div></dl>
        ${canManage() && next ? `<div class="actions"><button class="button" type="button" id="nc-transition">${next === 'em_tratamento' ? 'Iniciar tratamento' : 'Marcar como resolvida'}</button></div><p class="muted">O tratamento preserva o resultado histórico da inspeção.</p>` : ''}<div id="nc-action-error" aria-live="polite"></div></section>
        <section class="card stack"><div class="card-header"><h2>Evidências fotográficas</h2></div>${allowed ? `${inspection.status === 'em_andamento' ? `<form id="nc-upload" class="stack"><div class="field"><label for="nc-photo">Adicionar foto</label><input id="nc-photo" name="foto" type="file" accept="image/jpeg,image/png,image/webp" required aria-describedby="nc-photo-help"><small id="nc-photo-help" class="muted">JPEG, PNG ou WebP de até 5 MiB. Envie as fotos antes de finalizar a inspeção.</small></div><div class="actions"><button class="button" type="submit">Enviar foto</button></div><div id="nc-upload-feedback" aria-live="polite"></div></form>` : '<p class="notice">Inspeção finalizada. As evidências existentes foram preservadas e não podem receber novos anexos.</p>'}<div id="nc-evidence-list" aria-live="polite">${loading()}</div>` : '<p class="notice">As fotos desta inspeção estão disponíveis ao inspetor responsável e aos gestores.</p>'}</section>
        <section class="card"><div class="card-header"><h2>Histórico de tratamento</h2></div>${current.historico?.length ? `<ol class="stack">${current.historico.map((event) => `<li>${badge(event.status)} <span>${esc(formatDate(event.criado_em))}</span><p class="muted">Responsável: usuário #${esc(event.usuario_id)}</p></li>`).join('')}</ol>` : empty('Nenhuma transição registrada.')}</section>`;
      root.querySelector('#nc-transition')?.addEventListener('click', async (event) => {
        const button = event.currentTarget;
        button.disabled = true;
        const original = button.textContent;
        button.textContent = 'Salvando…';
        root.querySelector('#nc-action-error').innerHTML = '';
        try {
          await request(`/nao-conformidades/${encodeURIComponent(id)}`, {
            method: 'PATCH',
            body: { status: next },
          });
          if (disposed) return;
          notify('Situação da não conformidade atualizada.');
          await mountDetail();
        } catch (error) {
          if (!disposed) root.querySelector('#nc-action-error').innerHTML = errorMessage(error);
        } finally {
          button.disabled = false;
          button.textContent = original;
        }
      });
      root.querySelector('#nc-upload')?.addEventListener('submit', uploadPhoto);
      if (allowed) await loadEvidence();
    } catch (error) {
      if (disposed) return;
      root.innerHTML = `<header class="page-header"><h1>Não conformidade</h1><a class="button secondary" href="#/nao-conformidades">Voltar</a></header>${errorMessage(error)}<button type="button" class="button secondary" data-retry>Tentar novamente</button>`;
      root.querySelector('[data-retry]').addEventListener('click', mountDetail);
    }
  }

  async function uploadPhoto(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.foto;
    const feedback = form.querySelector('#nc-upload-feedback');
    const file = input.files[0];
    feedback.innerHTML = '';
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      feedback.innerHTML = errorMessage(new Error('Selecione uma imagem JPEG, PNG ou WebP.'));
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      feedback.innerHTML = errorMessage(
        new Error('A imagem ultrapassa o limite de 5 MiB. Escolha uma imagem menor.'),
      );
      return;
    }
    const button = form.querySelector('button');
    input.disabled = true;
    button.disabled = true;
    button.textContent = 'Enviando…';
    feedback.innerHTML =
      '<label for="nc-progress">Enviando foto</label><progress id="nc-progress" max="100" value="0"></progress><span id="nc-progress-text">0%</span>';
    const body = new FormData();
    body.append('foto', file);
    try {
      await api.upload(
        `/nao-conformidades/${encodeURIComponent(id)}/evidencias`,
        body,
        (percent) => {
          if (disposed) return;
          const progress = feedback.querySelector('progress');
          if (progress) progress.value = percent;
          const text = feedback.querySelector('#nc-progress-text');
          if (text) text.textContent = `${Math.round(percent)}%`;
        },
      );
      if (disposed) return;
      form.reset();
      feedback.innerHTML = '<p class="notice" role="status">Foto anexada à não conformidade.</p>';
      notify('Foto enviada com sucesso.');
      await loadEvidence();
    } catch (error) {
      if (!disposed) feedback.innerHTML = errorMessage(error);
    } finally {
      input.disabled = false;
      button.disabled = false;
      button.textContent = 'Enviar foto';
    }
  }

  async function loadEvidence() {
    const target = root.querySelector('#nc-evidence-list');
    if (!target) return;
    revokeImages();
    target.innerHTML = loading();
    try {
      const { data } = await request(`/nao-conformidades/${encodeURIComponent(id)}/evidencias`);
      if (disposed) return;
      target.innerHTML = data.length
        ? `<div class="form-grid">${data.map((evidence) => `<article class="card stack" data-evidence="${esc(evidence.id)}"><div data-preview>${loading()}</div><div><strong>${esc(evidence.nome_original)}</strong><p class="muted">${esc((Number(evidence.tamanho) / 1024).toFixed(1))} KiB · ${esc(formatDate(evidence.criado_em))}</p></div><button class="button secondary" type="button" data-download>Baixar foto</button><div data-image-error aria-live="polite"></div></article>`).join('')}</div>`
        : empty('Nenhuma foto anexada a esta não conformidade.');
      await Promise.all(
        data.map(async (evidence) => {
          const card = Array.from(target.querySelectorAll('[data-evidence]')).find(
            (element) => element.dataset.evidence === String(evidence.id),
          );
          if (!card) return;
          let cachedBlob = null;
          async function loadImage() {
            const preview = card.querySelector('[data-preview]');
            preview.innerHTML = loading();
            try {
              const blob = await api.blob(
                `/evidencias/${encodeURIComponent(evidence.id)}/arquivo`,
                { signal: controller.signal },
              );
              if (disposed || !card.isConnected) return;
              cachedBlob = blob;
              const url = URL.createObjectURL(blob);
              urls.add(url);
              const image = document.createElement('img');
              image.src = url;
              image.alt = `Evidência: ${evidence.nome_original}`;
              image.style.cssText =
                'width:100%;height:180px;object-fit:contain;border-radius:8px;background:#f1f5f9';
              preview.replaceChildren(image);
            } catch (error) {
              if (disposed || !card.isConnected) return;
              preview.innerHTML = `${errorMessage(error)}<button class="button secondary" type="button" data-preview-retry>Recarregar foto</button>`;
              preview.querySelector('[data-preview-retry]').addEventListener('click', loadImage);
            }
          }
          card.querySelector('[data-download]').addEventListener('click', async (event) => {
            const button = event.currentTarget;
            button.disabled = true;
            card.querySelector('[data-image-error]').innerHTML = '';
            try {
              const blob =
                cachedBlob ||
                (await api.blob(`/evidencias/${encodeURIComponent(evidence.id)}/arquivo`, {
                  signal: controller.signal,
                }));
              if (!disposed) download(blob, evidence.nome_original);
            } catch (error) {
              if (!disposed)
                card.querySelector('[data-image-error]').innerHTML = errorMessage(error);
            } finally {
              button.disabled = false;
            }
          });
          await loadImage();
        }),
      );
    } catch (error) {
      if (disposed) return;
      target.innerHTML = `${errorMessage(error)}<button type="button" class="button secondary" data-evidence-retry>Tentar novamente</button>`;
      target.querySelector('[data-evidence-retry]').addEventListener('click', loadEvidence);
    }
  }

  if (id) await mountDetail();
  else await mountList();

  return () => {
    disposed = true;
    controller.abort();
    revokeImages();
  };
}
