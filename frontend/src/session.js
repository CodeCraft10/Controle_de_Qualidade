let token = null;
let user = null;
let expirationTimer;

export const getToken = () => token;
export const getUser = () => user;
export const canManage = () => ['admin', 'supervisor'].includes(user?.perfil);
export const isAdmin = () => user?.perfil === 'admin';
export const canEditInspection = (inspection) =>
  Boolean(user && (canManage() || String(inspection.inspetor_id) === String(user.id)));

export function setSession(session) {
  clearTimeout(expirationTimer);
  token = session.token;
  user = session.usuario;
  try {
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    expirationTimer = setTimeout(
      () => clearSession('Sua sessão expirou. Entre novamente.'),
      Math.max(0, payload.exp * 1000 - Date.now()),
    );
  } catch {
    // The backend validates the token; expiry is also handled on HTTP 401.
  }
}

export function clearSession(reason = '') {
  clearTimeout(expirationTimer);
  token = null;
  user = null;
  window.dispatchEvent(new CustomEvent('session-ended', { detail: reason }));
}
