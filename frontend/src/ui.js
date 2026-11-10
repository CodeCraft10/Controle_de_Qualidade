export const esc = (value) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character],
  );
const labels = {
  em_andamento: 'Em andamento',
  aprovada: 'Aprovada',
  aprovado: 'Aprovado',
  reprovada: 'Reprovada',
  reprovado: 'Reprovado',
  pendente: 'Pendente',
  aberta: 'Aberta',
  em_tratamento: 'Em tratamento',
  resolvida: 'Resolvida',
  conforme: 'Conforme',
  nao_conforme: 'Não conforme',
  nao_aplicavel: 'Não aplicável',
  menor: 'Menor',
  maior: 'Maior',
  critica: 'Crítica',
  admin: 'Administrador',
  supervisor: 'Supervisor',
  inspetor: 'Inspetor',
  true: 'Ativo',
  false: 'Inativo',
  ativo: 'Ativo',
  inativo: 'Inativo',
};
export const badge = (value) =>
  `<span class="badge badge-${esc(String(value).replace(/[^a-z_]/g, ''))}">${esc(labels[value] || value || 'Sem informação')}</span>`;
export const formatDate = (value) =>
  value
    ? new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
        timeZone: 'America/Sao_Paulo',
      }).format(new Date(value))
    : '—';
export const empty = (message = 'Nenhum registro encontrado.') =>
  `<div class="empty-state"><span class="empty-icon" aria-hidden="true">◇</span><p>${esc(message)}</p></div>`;
export const loading = () =>
  '<div class="loading-state" role="status"><span class="spinner" aria-hidden="true"></span> Carregando informações…</div>';
export function notify(message, type = 'success') {
  const container = document.querySelector('#notifications');
  // Keep recent feedback readable during a fast sequence of operations.
  while (container.childElementCount >= 2) container.firstElementChild.remove();
  const item = document.createElement('div');
  item.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  item.textContent = message;
  container.append(item);
  setTimeout(() => item.remove(), 6000);
}
export function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
