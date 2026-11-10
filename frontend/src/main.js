import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/latin-700.css';
import './styles.css';
import { api } from './api.js';
import { getUser, canManage, setSession } from './session.js';
import { esc, loading } from './ui.js';
import { mountCatalog } from './pages/catalog.js';
import { mountInspections } from './pages/inspections.js';
import { mountNonconformities } from './pages/nonconformities.js';
import { mountDashboard, mountHistory } from './pages/reporting.js';

const app = document.querySelector('#app');
let demoSessionPromise;
async function tryDemoSession() {
  demoSessionPromise ??= api.request('/auth/demo', { method: 'POST' }).then(setSession);
  await demoSessionPromise;
}
const shield =
  '<svg viewBox="0 0 40 44" fill="none" aria-hidden="true"><path d="M20 3 35 9v12c0 10-15 20-15 20S5 31 5 21V9Z" stroke="currentColor" stroke-width="2.5"/><path d="m12 21 6 6 11-13" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const paths = {
  dashboard: ['Visão geral', 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z'],
  inspecoes: ['Inspeções', 'M9 5H5v16h14V5h-4 M9 3h6v4H9z M8 12l2 2 5-5 M8 18h8'],
  'nao-conformidades': ['Não conformidades', 'm12 3 10 18H2L12 3Z M12 9v5 M12 17v1'],
  produtos: ['Produtos', 'm12 2 9 5v10l-9 5-9-5V7l9-5Z M3 7l9 5 9-5 M12 12v10 M7 4l10 6'],
  lotes: ['Lotes', 'M3 6h18v15H3z M3 10h18 M9 14h6 M5 3h14'],
  inspetores: [
    'Inspetores',
    'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M17 4a4 4 0 0 1 0 7 M22 21v-2a4 4 0 0 0-3-4',
  ],
  criterios: ['Critérios', 'M8 5h13 M8 12h13 M8 19h13 M3 4v2 M3 11v2 M3 18v2'],
  checklists: ['Checklists', 'M9 5h12 M9 12h12 M9 19h12 M2 4l2 2 3-3 M2 11l2 2 3-3 M2 18l2 2 3-3'],
  historico: ['Histórico', 'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l4 2'],
  relatorios: ['Relatórios', 'M14 2H5v20h14V7l-5-5Z M14 2v5h5 M8 17v-4 M12 17v-7 M16 17v-2'],
};
const icon = (path) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${path}"/></svg>`;
let cleanup;
let generation = 0;
let mountedHash = '';

function navItem(key, current) {
  return `<a class="nav-link ${key === current ? 'active' : ''}" ${key === current ? 'aria-current="page"' : ''} href="#/${key}">${icon(paths[key][1])}<span>${paths[key][0]}</span></a>`;
}
function shell(current) {
  const user = getUser();
  app.innerHTML = `<a class="skip-link" href="#main-content">Pular para o conteúdo</a><div class="app-shell">
    <aside class="sidebar" id="navigation"><a href="#/dashboard" class="brand">${shield}<span><strong>GP4<span class="brand-dot">.</span></strong><small>CONTROLE DE QUALIDADE</small></span></a>
      <div class="workspace-label"><span class="workspace-mark">Q</span><div>Gestão da qualidade<small>Ambiente de trabalho</small></div></div>
      <nav aria-label="Navegação principal"><p class="nav-label">OPERAÇÃO</p>${['dashboard', 'inspecoes', 'nao-conformidades'].map((key) => navItem(key, current)).join('')}
      <p class="nav-label">CADASTROS</p>${['produtos', 'lotes', ...(canManage() ? ['inspetores'] : []), 'criterios', 'checklists'].map((key) => navItem(key, current)).join('')}
      <p class="nav-label">ANÁLISE</p>${['historico', 'relatorios'].map((key) => navItem(key, current)).join('')}</nav>
      <div class="sidebar-footer">${shield}<span>Qualidade em cada etapa.<small>Rastreabilidade de ponta a ponta</small></span></div>
    </aside>
    <button class="nav-backdrop" aria-label="Fechar navegação" tabindex="-1"></button>
    <div class="main-shell"><header class="topbar"><div class="topbar-start"><button class="icon-button mobile-menu" aria-controls="navigation" aria-expanded="false" aria-label="Abrir navegação">${icon('M4 6h16 M4 12h16 M4 18h16')}</button><span class="breadcrumb">Workspace <span>/</span> <strong>${esc(paths[current]?.[0] || 'Navegação')}</strong></span></div>
      <div class="user-menu"><span class="avatar" aria-hidden="true">${esc(user.nome.slice(0, 2).toUpperCase())}</span><span class="user-info"><strong>${esc(user.nome)}</strong><small>${esc({ admin: 'Administrador', supervisor: 'Supervisor', inspetor: 'Inspetor' }[user.perfil])}</small></span><span class="badge">Versão de teste</span></div>
    </header><div class="notice" role="status" style="margin:16px 24px 0">Versão de teste aberta: use somente dados fictícios.</div><main id="main-content" tabindex="-1"></main><footer class="main-footer"><span>GP4 · Sistema Inteligente de Controle de Qualidade</span><span>Registro. Evidência. Confiança.</span></footer></div></div>`;
  const menu = document.querySelector('.mobile-menu');
  const closeMenu = () => {
    document.querySelector('.app-shell')?.classList.remove('nav-open');
    menu.setAttribute('aria-expanded', 'false');
  };
  menu.addEventListener('click', () => {
    const open = document.querySelector('.app-shell').classList.toggle('nav-open');
    menu.setAttribute('aria-expanded', String(open));
  });
  document.querySelector('.nav-backdrop').addEventListener('click', closeMenu);
  app.onkeydown = (event) => {
    if (event.key === 'Escape') {
      closeMenu();
      menu.focus();
    }
  };
  document.querySelector('.skip-link').addEventListener('click', (event) => {
    event.preventDefault();
    document.querySelector('main').focus();
  });
  return document.querySelector('#main-content');
}

async function route() {
  const previousPage = document.querySelector('#main-content');
  if (getUser() && previousPage?.canLeave && !previousPage.canLeave()) {
    history.replaceState(null, '', mountedHash || '#/dashboard');
    return;
  }
  mountedHash = location.hash;
  const currentGeneration = ++generation;
  cleanup?.();
  cleanup = null;
  app.onkeydown = null;
  const [name = 'dashboard', id, ...extra] = location.hash
    .replace(/^#\/?/, '')
    .split('/')
    .filter(Boolean);
  if (!getUser()) {
    app.innerHTML = loading();
    try {
      await tryDemoSession();
    } catch (error) {
      if (currentGeneration !== generation) return;
      demoSessionPromise = undefined;
      app.innerHTML = `<main class="card"><h1>Não foi possível abrir o painel</h1><p role="alert">${esc(error.message)}</p><button class="button" id="retry-start">Tentar novamente</button></main>`;
      document.querySelector('#retry-start').addEventListener('click', route);
      return;
    }
    if (currentGeneration !== generation) return;
  }
  if (name === 'login') {
    location.replace('#/dashboard');
    return;
  }
  const root = shell(name);
  document.title = `${paths[name]?.[0] || 'Navegação'} | GP4 Controle de Qualidade`;
  root.innerHTML = loading();
  root.focus({ preventScroll: true });
  window.scrollTo(0, 0);
  try {
    let result;
    if (extra.length || (id && !/^[1-9][0-9]*$/.test(id)))
      throw Object.assign(new Error('Página não encontrada.'), { status: 404 });
    if (name === 'acesso-negado' || (name === 'inspetores' && !canManage()))
      throw Object.assign(new Error('Seu perfil não tem acesso a esta página.'), { status: 403 });
    if (name === 'dashboard' && !id) result = await mountDashboard(root);
    else if (['produtos', 'lotes', 'inspetores', 'criterios', 'checklists'].includes(name))
      result = await mountCatalog(root, { resource: name, id });
    else if (name === 'inspecoes') result = await mountInspections(root, { id });
    else if (name === 'nao-conformidades') result = await mountNonconformities(root, { id });
    else if (['historico', 'relatorios'].includes(name) && !id)
      result = await mountHistory(root, { reports: name === 'relatorios' });
    else throw Object.assign(new Error('Página não encontrada.'), { status: 404 });
    if (currentGeneration !== generation) {
      if (typeof result === 'function') result();
      return;
    }
    cleanup = typeof result === 'function' ? result : null;
  } catch (error) {
    if (currentGeneration !== generation || !root.isConnected) return;
    root.innerHTML = `<section class="route-error card"><span class="eyebrow">${error.status === 403 ? 'ACESSO RESTRITO' : error.status === 404 ? 'PÁGINA NÃO ENCONTRADA' : 'NÃO FOI POSSÍVEL CARREGAR'}</span><h1>${error.status === 403 ? 'Acesso negado' : error.status === 404 ? 'Não encontramos esta página' : 'Vamos tentar novamente?'}</h1><p class="error" role="alert">${esc(error.message)}</p><div class="actions"><a class="button secondary" href="#/dashboard">Voltar à visão geral</a>${![403, 404].includes(error.status) ? '<button class="button" id="retry-page">Tentar novamente</button>' : ''}</div></section>`;
    document.querySelector('#retry-page')?.addEventListener('click', route);
  }
}
window.addEventListener('hashchange', route);
window.addEventListener('session-ended', () => {
  demoSessionPromise = undefined;
  route();
});
route();
