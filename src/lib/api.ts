/** 클라이언트 fetch 헬퍼 — JSON 요청 보일러플레이트 제거 */
function init(method: string, body?: unknown): RequestInit {
  return body === undefined
    ? { method }
    : { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

export const apiPost   = (url: string, body?: unknown) => fetch(url, init('POST', body));
export const apiPatch  = (url: string, body: unknown)  => fetch(url, init('PATCH', body));
export const apiDelete = (url: string, body?: unknown) => fetch(url, init('DELETE', body));
