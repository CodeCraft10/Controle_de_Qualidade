import { api } from '../api.js';
import { esc, badge, formatDate, notify, empty, loading } from '../ui.js';
import { canManage, isAdmin } from '../session.js';

const resources = {
  produtos: {
    title: 'Produtos',
    singular: 'produto',
    subtitle: 'Organize os produtos e mantenha a identificação de cada item.',
    endpoint: 'produtos',
  },
  lotes: {
    title: 'Lotes',
    singular: 'lote',
    subtitle: 'Acompanhe a origem e a situação dos lotes de produção.',
    endpoint: 'lotes',
  },
  inspetores: {
    title: 'Inspetores',
    singular: 'inspetor',
    subtitle: 'Consulte as pessoas responsáveis pelas inspeções.',
    endpoint: 'usuarios',
  },
  criterios: {
    title: 'Critérios',
    singular: 'critério',
    subtitle: 'Defina o que precisa ser verificado em cada inspeção.',
    endpoint: 'criterios',
  },
  checklists: {
    title: 'Checklists',
    singular: 'checklist',
    subtitle: 'Reúna os critérios que orientam a verificação de qualidade.',
    endpoint: 'checklists',
  },
};

function activeBadge(active) {
  return badge(active ? 'ativo' : 'inativo');
}

function errorMessage(error) {
  return `<div class="notice error" role="alert">${esc(error.message || 'Não foi possível concluir a operação.')} ${error.requestId ? `<small>Referência: ${esc(error.requestId)}</small>` : ''}</div>`;
}

function inputField(label, name, value = '', options = {}) {
  const {
    type = 'text',
    required = false,
    maxLength = 150,
    min,
    max,
    help = '',
    autocomplete = 'off',
  } = options;
  return `<div class="field"><label for="catalog-${esc(name)}">${esc(label)}${required ? ' *' : ''}</label><input id="catalog-${esc(name)}" name="${esc(name)}" type="${esc(type)}" value="${esc(value ?? '')}" ${required ? 'required' : ''} maxlength="${maxLength}" ${min !== undefined ? `min="${min}"` : ''} ${max !== undefined ? `max="${max}"` : ''} ${type === 'number' ? 'step="1"' : ''} autocomplete="${esc(autocomplete)}" ${help ? `aria-describedby="catalog-${esc(name)}-help"` : ''}>${help ? `<small id="catalog-${esc(name)}-help" class="muted">${esc(help)}</small>` : ''}</div>`;
}

function selectOptions(records, selected, label) {
  return records
    .map(
      (record) =>
        `<option value="${esc(record.id)}" ${String(record.id) === String(selected) ? 'selected' : ''}>${esc(label(record))}${record.ativo === false ? ' (inativo)' : ''}</option>`,
    )
    .join('');
}

export async function mountCatalog(root, { resource, id } = {}) {
  const config = resources[resource];
  if (!config) throw new Error('Cadastro não encontrado.');
  root.innerHTML = '<div class="catalog-page stack"></div>';
  const view = root.firstElementChild;
  let disposed = false;
  let records = [];
  let products = [];
  let criteria = [];
  let items = [];
  let current = null;
  let search = '';
  let activeFilter = '';
  let page = 1;
  let editing = false;
  let busy = false;
  const pageSize = 12;
  const canWrite = resource === 'inspetores' ? isAdmin() : canManage();
  const alive = () => !disposed && view.isConnected;
  const endpoint = `/${config.endpoint}`;

  function header(detail = false) {
    return `<header class="page-header"><div><p class="eyebrow">CADASTROS</p><h1>${detail ? esc(current.nome || current.codigo) : esc(config.title)}</h1><p class="muted">${detail ? `Detalhes de ${esc(config.singular)} · #${esc(current.id)}` : esc(config.subtitle)}</p></div><div class="actions">${detail ? `<a class="button secondary" href="#/${resource}">Voltar para ${esc(config.title.toLowerCase())}</a>` : canWrite ? `<button type="button" class="button" data-action="create">+ Novo ${esc(config.singular)}</button>` : ''}</div></header>`;
  }

  function productLabel(productId) {
    const product = products.find((record) => String(record.id) === String(productId));
    return product ? `${product.codigo} · ${product.nome}` : `Produto #${productId}`;
  }

  function listRows() {
    const query = search.trim().toLocaleLowerCase('pt-BR');
    const filtered = records.filter((record) => {
      const haystack = [
        record.id,
        record.nome,
        record.codigo,
        record.descricao,
        record.email,
        resource === 'lotes' ? productLabel(record.produto_id) : '',
      ]
        .join(' ')
        .toLocaleLowerCase('pt-BR');
      return (
        (!query || haystack.includes(query)) &&
        (!activeFilter || String(record.ativo) === activeFilter)
      );
    });
    const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
    page = Math.min(page, pages);
    const rows = filtered.slice((page - 1) * pageSize, page * pageSize);
    const column =
      resource === 'lotes'
        ? 'Produto / quantidade'
        : resource === 'inspetores'
          ? 'E-mail'
          : 'Descrição';
    return `<div class="card-header"><h2>Registros</h2><span class="muted">${filtered.length} ${filtered.length === 1 ? 'registro' : 'registros'}</span></div>${rows.length ? `<div class="table-wrap"><table><thead><tr><th scope="col">${resource === 'lotes' ? 'Lote' : 'Nome'}</th><th scope="col">${column}</th><th scope="col">Situação</th><th scope="col"><span class="sr-only">Ações</span></th></tr></thead><tbody>${rows.map((record) => `<tr><td><strong>${esc(record.nome || record.codigo)}</strong>${record.codigo && record.nome ? `<small class="muted">${esc(record.codigo)}</small>` : ''}</td><td>${resource === 'lotes' ? `${esc(productLabel(record.produto_id))}<small class="muted">${esc(record.quantidade)} unidades</small>` : esc(resource === 'inspetores' ? record.email : record.descricao || '—')}</td><td>${activeBadge(record.ativo)}${resource === 'lotes' ? ` ${badge(record.status)}` : ''}</td><td><a class="button secondary small" href="#/${resource}/${esc(record.id)}" aria-label="Ver detalhes de ${esc(record.nome || record.codigo)}">Detalhes</a></td></tr>`).join('')}</tbody></table></div>` : empty(query || activeFilter ? 'Nenhum registro corresponde aos filtros.' : `Nenhum ${config.singular} cadastrado.`)}<div class="pagination"><span class="muted">Página ${page} de ${pages}</span><div class="actions"><button type="button" class="button secondary small" data-action="previous" ${page === 1 ? 'disabled' : ''}>Anterior</button><button type="button" class="button secondary small" data-action="next" ${page === pages ? 'disabled' : ''}>Próxima</button></div></div>`;
  }

  function renderRows() {
    const table = view.querySelector('[data-list]');
    if (table) table.innerHTML = listRows();
  }

  function formMarkup(record = {}) {
    const isNew = !record.id;
    let fields = '';
    if (resource === 'produtos' || resource === 'lotes')
      fields += inputField('Código', 'codigo', record.codigo, { required: true, maxLength: 80 });
    if (resource !== 'lotes') fields += inputField('Nome', 'nome', record.nome, { required: true });
    if (resource === 'lotes') {
      const eligible = products.filter(
        (product) => product.ativo || String(product.id) === String(record.produto_id),
      );
      fields += `<div class="field"><label for="catalog-produto_id">Produto *</label><select id="catalog-produto_id" name="produto_id" required><option value="">Selecione o produto</option>${selectOptions(eligible, record.produto_id, (product) => `${product.codigo} · ${product.nome}`)}</select>${!eligible.length ? '<small class="muted">Cadastre um produto ativo antes de criar o lote.</small>' : ''}</div>`;
      fields += inputField('Quantidade', 'quantidade', record.quantidade, {
        type: 'number',
        required: true,
        min: 1,
        max: 999999999,
      });
      fields += inputField('Data de fabricação', 'data_fabricacao', record.data_fabricacao, {
        type: 'date',
        required: true,
      });
    } else if (resource === 'inspetores') {
      fields += inputField('E-mail', 'email', record.email, {
        type: 'email',
        required: true,
        maxLength: 200,
        autocomplete: 'off',
      });
      fields += inputField(isNew ? 'Senha inicial' : 'Nova senha (opcional)', 'senha', '', {
        type: 'password',
        required: isNew,
        maxLength: 72,
        autocomplete: 'new-password',
        help: 'Mínimo de 12 bytes e máximo de 72 bytes. A senha não será armazenada no navegador.',
      });
    } else {
      fields += `<div class="field full"><label for="catalog-descricao">Descrição</label><textarea id="catalog-descricao" name="descricao" rows="3" maxlength="2000">${esc(record.descricao || '')}</textarea></div>`;
    }
    return `<section class="card" aria-labelledby="catalog-form-title"><div class="card-header"><h2 id="catalog-form-title">${isNew ? `Novo ${esc(config.singular)}` : 'Editar cadastro'}</h2></div><form data-catalog-form><p class="muted">Campos marcados com * são obrigatórios.${!isNew && resource !== 'inspetores' ? ' Cadastros já utilizados em inspeções preservam seu histórico e não podem ser alterados.' : ''}</p><div class="form-grid">${fields}</div><div data-form-error aria-live="polite"></div><div class="actions"><button type="submit" class="button">${isNew ? 'Criar cadastro' : 'Salvar alterações'}</button><button type="button" class="button secondary" data-action="cancel">Cancelar</button></div></form></section>`;
  }

  function detailMarkup() {
    const pairs = [];
    if (current.codigo) pairs.push(['Código', current.codigo]);
    if (current.nome) pairs.push(['Nome', current.nome]);
    if (resource === 'lotes')
      pairs.push(
        ['Produto', productLabel(current.produto_id)],
        ['Quantidade', `${current.quantidade} unidades`],
      );
    if (current.email) pairs.push(['E-mail', current.email], ['Perfil', current.perfil]);
    if ('descricao' in current) pairs.push(['Descrição', current.descricao || 'Não informada']);
    if (current.criado_em) pairs.push(['Criado em', formatDate(current.criado_em)]);
    return `<section class="card"><div class="card-header"><h2>Informações do cadastro</h2><div class="actions">${activeBadge(current.ativo)}${current.status ? badge(current.status) : ''}</div></div><dl class="detail-grid">${pairs.map(([label, value]) => `<div><dt class="muted">${esc(label)}</dt><dd>${esc(value)}</dd></div>`).join('')}</dl>${canWrite ? `<div class="actions"><button type="button" class="button secondary" data-action="edit">Editar cadastro</button><button type="button" class="button secondary" data-action="toggle-active">${current.ativo ? 'Desativar' : 'Reativar'} ${esc(config.singular)}</button></div><div data-action-error aria-live="polite"></div>` : '<p class="muted">Seu perfil permite consultar este cadastro.</p>'}</section>`;
  }

  function checklistMarkup() {
    const available = criteria.filter(
      (criterion) =>
        criterion.ativo && !items.some((item) => String(item.criterio_id) === String(criterion.id)),
    );
    return `<section class="card"><div class="card-header"><div><h2>Itens do checklist</h2><p class="muted">Os critérios serão copiados para preservar o histórico da inspeção.</p></div><span class="badge">${items.length} ${items.length === 1 ? 'item' : 'itens'}</span></div>${items.length ? `<div class="table-wrap"><table><thead><tr><th scope="col">Critério</th><th scope="col">Preenchimento</th>${canWrite && current.ativo ? '<th scope="col">Ação</th>' : ''}</tr></thead><tbody>${items.map((item) => `<tr><td>${esc(item.criterio)}</td><td>${item.obrigatorio ? 'Obrigatório' : 'Opcional'}</td>${canWrite && current.ativo ? `<td><button type="button" class="button secondary small" data-action="remove-item" data-item="${esc(item.id)}" aria-label="Remover critério ${esc(item.criterio)}">Remover</button></td>` : ''}</tr>`).join('')}</tbody></table></div>` : empty('Este checklist ainda não tem critérios. Adicione ao menos um item antes de iniciar uma inspeção.')}${canWrite && current.ativo ? `<form data-item-form><h3>Adicionar critério</h3><div class="form-grid"><div class="field"><label for="catalog-criterio_id">Critério *</label><select id="catalog-criterio_id" name="criterio_id" required><option value="">Selecione um critério</option>${selectOptions(available, '', (criterion) => criterion.nome)}</select>${available.length ? '' : '<small class="muted">Nenhum critério ativo disponível. Cadastre um novo critério ou reative um existente.</small>'}</div><div class="field"><label for="catalog-obrigatorio">Preenchimento</label><select id="catalog-obrigatorio" name="obrigatorio"><option value="true">Obrigatório</option><option value="false">Opcional</option></select></div></div><div class="actions"><button type="submit" class="button secondary" ${available.length ? '' : 'disabled'}>Adicionar item</button><a href="#/criterios" class="button secondary">Ver critérios</a></div></form>` : ''}<div data-item-error aria-live="polite"></div></section>`;
  }

  function render() {
    if (!alive()) return;
    if (id) {
      view.innerHTML = `${header(true)}${detailMarkup()}${editing ? formMarkup(current) : ''}${resource === 'checklists' ? checklistMarkup() : ''}`;
    } else {
      view.innerHTML = `${header()}${editing ? formMarkup() : ''}<section class="card"><div class="toolbar"><div class="field"><label for="catalog-search">Buscar ${esc(config.title.toLowerCase())}</label><input type="search" id="catalog-search" value="${esc(search)}" placeholder="Nome, código ou descrição" maxlength="200"></div><div class="field"><label for="catalog-active">Situação do cadastro</label><select id="catalog-active"><option value="">Todos</option><option value="true" ${activeFilter === 'true' ? 'selected' : ''}>Ativos</option><option value="false" ${activeFilter === 'false' ? 'selected' : ''}>Inativos</option></select></div><button type="button" class="button secondary" data-action="reload">Atualizar</button></div><div data-list>${listRows()}</div></section>`;
    }
  }

  async function load() {
    view.innerHTML = loading();
    try {
      if (resource === 'inspetores' && !canManage()) {
        view.innerHTML = `<section class="card"><h1>Acesso negado</h1><p>Somente administradores e supervisores podem consultar os inspetores.</p><a class="button secondary" href="#/dashboard">Voltar ao dashboard</a></section>`;
        return;
      }
      const tasks = [
        id
          ? api.request(
              `${resource === 'inspetores' ? '/inspetores' : endpoint}/${encodeURIComponent(id)}`,
            )
          : api.all(resource === 'inspetores' ? '/inspetores' : endpoint),
      ];
      tasks.push(resource === 'lotes' ? api.all('/produtos') : Promise.resolve([]));
      tasks.push(
        resource === 'checklists' && id
          ? api.request(`/checklists/${encodeURIComponent(id)}/itens`)
          : Promise.resolve({ data: [] }),
      );
      tasks.push(
        resource === 'checklists' && id && canWrite
          ? api.all('/criterios?ativo=true')
          : Promise.resolve([]),
      );
      const [data, loadedProducts, loadedItems, loadedCriteria] = await Promise.all(tasks);
      if (!alive()) return;
      if (id) current = data;
      else records = data;
      products = loadedProducts;
      items = loadedItems.data;
      criteria = loadedCriteria;
      render();
    } catch (error) {
      if (!alive()) return;
      view.innerHTML = `<header class="page-header"><h1>${esc(config.title)}</h1></header><section class="card">${errorMessage(error)}<div class="actions"><button type="button" class="button" data-action="reload">Tentar novamente</button><a class="button secondary" href="#/${resource}">Voltar à lista</a></div></section>`;
    }
  }

  function setBusy(form, value) {
    busy = value;
    for (const element of form.querySelectorAll('button,input,select,textarea'))
      element.disabled = value;
    form.setAttribute('aria-busy', String(value));
  }

  function setError(selector, error) {
    const target = view.querySelector(selector);
    if (target) {
      target.innerHTML = errorMessage(error);
      target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  async function submitCatalog(form) {
    if (busy || !canWrite) return;
    const values = new FormData(form);
    const payload = {};
    for (const [name, value] of values.entries())
      payload[name] = name === 'senha' ? value : value.trim();
    for (const input of form.querySelectorAll('input[required]')) {
      input.setCustomValidity(input.value.trim() ? '' : 'Preencha este campo.');
    }
    const password = form.elements.namedItem('senha');
    if (password) {
      password.setCustomValidity(
        password.value &&
          (new TextEncoder().encode(password.value).length < 12 ||
            new TextEncoder().encode(password.value).length > 72)
          ? 'A senha precisa ter ao menos 12 bytes e no máximo 72 bytes.'
          : '',
      );
    }
    if (!form.reportValidity()) return;
    if (resource === 'lotes') payload.quantidade = Number(payload.quantidade);
    if (resource === 'inspetores') {
      if (!id) payload.perfil = 'inspetor';
      if (!payload.senha) delete payload.senha;
    }
    if (id) {
      for (const key of Object.keys(payload)) {
        if (key !== 'senha' && String(payload[key] ?? '') === String(current[key] ?? ''))
          delete payload[key];
      }
      if (!Object.keys(payload).length) {
        editing = false;
        render();
        notify('Nenhuma alteração para salvar.');
        return;
      }
    }
    if (id) {
      for (const [name, value] of Object.entries(payload)) {
        if (name !== 'senha' && String(value ?? '') === String(current[name] ?? ''))
          delete payload[name];
      }
      if (!Object.keys(payload).length) {
        notify('Nenhuma alteração para salvar.');
        editing = false;
        render();
        return;
      }
    }
    const submit = form.querySelector('[type="submit"]');
    const previousText = submit.textContent;
    setBusy(form, true);
    submit.textContent = 'Salvando…';
    view.querySelector('[data-form-error]').innerHTML = '';
    try {
      const saved = await api.request(id ? `${endpoint}/${encodeURIComponent(id)}` : endpoint, {
        method: id ? 'PATCH' : 'POST',
        body: payload,
      });
      if (!alive()) return;
      notify(id ? 'Cadastro atualizado.' : 'Cadastro criado.');
      editing = false;
      if (id) {
        current = saved;
        render();
      } else {
        location.hash = `#/${resource}/${saved.id}`;
      }
    } catch (error) {
      if (alive()) setError('[data-form-error]', error);
    } finally {
      busy = false;
      if (form.isConnected) {
        setBusy(form, false);
        submit.textContent = previousText;
      }
    }
  }

  async function submitItem(form) {
    if (busy || !canWrite || !form.reportValidity()) return;
    const data = new FormData(form);
    setBusy(form, true);
    const submit = form.querySelector('[type="submit"]');
    submit.textContent = 'Adicionando…';
    try {
      await api.request(`/checklists/${encodeURIComponent(id)}/itens`, {
        method: 'POST',
        body: {
          criterio_id: data.get('criterio_id'),
          obrigatorio: data.get('obrigatorio') === 'true',
        },
      });
      if (!alive()) return;
      const response = await api.request(`/checklists/${encodeURIComponent(id)}/itens`);
      if (!alive()) return;
      items = response.data;
      notify('Critério adicionado ao checklist.');
      render();
    } catch (error) {
      if (alive()) setError('[data-item-error]', error);
    } finally {
      busy = false;
      if (form.isConnected) {
        setBusy(form, false);
        submit.textContent = 'Adicionar item';
      }
    }
  }

  async function onClick(event) {
    const button = event.target.closest('[data-action]');
    if (!button || busy) return;
    const action = button.dataset.action;
    if (action === 'reload') return load();
    if (action === 'previous' || action === 'next') {
      page += action === 'next' ? 1 : -1;
      renderRows();
      return;
    }
    if (!canWrite) return;
    if (['create', 'edit', 'cancel'].includes(action)) {
      editing = action !== 'cancel';
      render();
      if (editing) view.querySelector('[data-catalog-form] input')?.focus();
      return;
    }
    if (action !== 'toggle-active' && action !== 'remove-item') return;
    busy = true;
    button.disabled = true;
    const previousText = button.textContent;
    button.textContent = 'Salvando…';
    try {
      if (action === 'toggle-active') {
        current = await api.request(`${endpoint}/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          body: { ativo: !current.ativo },
        });
        if (!alive()) return;
        notify(
          current.ativo
            ? 'Cadastro reativado.'
            : 'Cadastro desativado. O histórico foi preservado.',
        );
      } else {
        await api.request(
          `/checklists/${encodeURIComponent(id)}/itens/${encodeURIComponent(button.dataset.item)}`,
          { method: 'DELETE' },
        );
        if (!alive()) return;
        items = items.filter((item) => String(item.id) !== button.dataset.item);
        notify('Critério removido do checklist.');
      }
      render();
    } catch (error) {
      if (alive())
        setError(action === 'toggle-active' ? '[data-action-error]' : '[data-item-error]', error);
    } finally {
      busy = false;
      if (button.isConnected) {
        button.disabled = false;
        button.textContent = previousText;
      }
    }
  }

  view.addEventListener('click', onClick);
  view.addEventListener('submit', (event) => {
    if (event.target.matches('[data-catalog-form]')) {
      event.preventDefault();
      void submitCatalog(event.target);
    } else if (event.target.matches('[data-item-form]')) {
      event.preventDefault();
      void submitItem(event.target);
    }
  });
  view.addEventListener('input', (event) => {
    if (event.target.matches('input')) event.target.setCustomValidity('');
    if (event.target.id === 'catalog-search') {
      search = event.target.value;
      page = 1;
      renderRows();
    }
  });
  view.addEventListener('change', (event) => {
    if (event.target.id === 'catalog-active') {
      activeFilter = event.target.value;
      page = 1;
      renderRows();
    }
  });
  await load();
  return () => {
    disposed = true;
  };
}
