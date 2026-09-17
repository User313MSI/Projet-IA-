/**
 * Helper côté client : récupère le secret local partagé et l'injecte dans
 * tous les appels d'API via le header `x-nexus-token`.
 */

let tokenPromise: Promise<string> | null = null;

export async function getNexusToken(): Promise<string> {
  if (!tokenPromise) {
    tokenPromise = fetch("/api/auth")
      .then((r) => (r.ok ? r.json() : { token: "" }))
      .then((d: { token?: string }) => d.token ?? "")
      .catch(() => "");
  }
  return tokenPromise;
}

export async function apiFetch(
  url: string,
  init: RequestInit = {}
): Promise<Response> {
  const token = await getNexusToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("x-nexus-token", token);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...init, headers });
}
