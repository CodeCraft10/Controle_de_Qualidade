import { getToken, clearSession } from './session.js';

const base = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
export class ApiError extends Error {
  constructor(message, status = 0, requestId = '') {
    super(message);
    this.status = status;
    this.requestId = requestId;
  }
}

function fail(status, payload, authenticated, requestToken) {
  if (status === 401 && authenticated && getToken() === requestToken)
    clearSession('Sua sessão expirou ou foi revogada. Entre novamente.');
  return new ApiError(
    payload?.erro ||
      {
        403: 'Você não tem permissão para esta operação.',
        404: 'Registro não encontrado.',
        413: 'O arquivo ultrapassa o limite permitido.',
        429: 'Muitas tentativas. Aguarde e tente novamente.',
      }[status] ||
      'Não foi possível concluir a operação. Tente novamente.',
    status,
    payload?.requestId,
  );
}

async function send(path, options = {}, asBlob = false) {
  const { body, signal, ...rest } = options;
  const requestToken = getToken();
  const headers = new Headers(rest.headers);
  if (requestToken) headers.set('Authorization', `Bearer ${requestToken}`);
  const isForm = body instanceof FormData;
  if (body !== undefined && !isForm) headers.set('Content-Type', 'application/json');
  const timeout = AbortSignal.timeout(30000);
  let response;
  try {
    response = await fetch(`${base}${path}`, {
      ...rest,
      headers,
      body: body === undefined ? undefined : isForm ? body : JSON.stringify(body),
      signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(
      error.name === 'TimeoutError'
        ? 'O servidor demorou para responder. Tente novamente.'
        : 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.',
    );
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw fail(response.status, payload, Boolean(requestToken), requestToken);
  }
  if (response.status === 204) return null;
  if (asBlob) return response.blob();
  try {
    return await response.json();
  } catch {
    throw new ApiError('O servidor retornou uma resposta inválida.', response.status);
  }
}

export const api = {
  request: (path, options) => send(path, options),
  blob: (path, options) => send(path, options, true),
  async all(path, options) {
    const [pathname, query = ''] = path.split('?');
    const params = new URLSearchParams(query);
    params.set('limit', '100');
    const rows = [];
    let page = 1;
    do {
      params.set('page', String(page));
      const result = await send(`${pathname}?${params}`, options);
      rows.push(...result.data);
      if (!result.pages || page >= result.pages) return rows;
      page++;
    } while (true);
  },
  upload(path, formData, onProgress = () => {}) {
    const requestToken = getToken();
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${base}${path}`);
      xhr.timeout = 60000;
      if (requestToken) xhr.setRequestHeader('Authorization', `Bearer ${requestToken}`);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
      };
      xhr.onerror = () =>
        reject(new ApiError('Falha de conexão durante o envio. Tente novamente.'));
      xhr.ontimeout = () => reject(new ApiError('O envio demorou demais. Tente novamente.'));
      xhr.onload = () => {
        let payload;
        try {
          payload = JSON.parse(xhr.responseText);
        } catch {
          return reject(new ApiError('O servidor retornou uma resposta inválida.', xhr.status));
        }
        if (xhr.status >= 200 && xhr.status < 300) resolve(payload);
        else reject(fail(xhr.status, payload, Boolean(requestToken), requestToken));
      };
      xhr.send(formData);
    });
  },
};
