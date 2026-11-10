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
  if (Number.isFinite(session.expires_in) && session.expires_in > 0) {
    expirationTimer = setTimeout(
      () => clearSession('Sua sessão expirou. Entre novamente.'),
      session.expires_in * 1000,
    );
  }
}

export function clearSession(reason = '') {
  clearTimeout(expirationTimer);
  token = null;
  user = null;
  window.dispatchEvent(new CustomEvent('session-ended', { detail: reason }));
}
