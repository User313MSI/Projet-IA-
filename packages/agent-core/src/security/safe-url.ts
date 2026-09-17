/**
 * Valide qu'une URL pointe vers un endpoint local autorisé (loopback uniquement),
 * pour empêcher le SSRF : un attaquant qui contrôle les settings ne peut pas
 * rediriger les requêtes du moteur IA vers un serveur externe ou un hôte interne sensible.
 */

export const ALLOWED_LOCAL_HOSTS = new Set([
  "127.0.0.1",
  "localhost",
  "::1",
  "[::1]",
]);

export interface UrlValidation {
  ok: boolean;
  error?: string;
}

export function isLocalOllamaUrl(raw: string): UrlValidation {
  if (!raw || typeof raw !== "string") {
    return { ok: false, error: "URL vide" };
  }
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, error: `URL invalide: ${raw}` };
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") {
    return {
      ok: false,
      error: `protocole non autorisé: ${u.protocol} (http/https local uniquement)`,
    };
  }
  if (u.username || u.password) {
    return { ok: false, error: "userinfo dans l'URL interdit" };
  }
  const host = u.hostname.toLowerCase();
  if (!ALLOWED_LOCAL_HOSTS.has(host)) {
    return {
      ok: false,
      error: `hôte non local interdit: ${host} (127.0.0.1/localhost/::1 uniquement)`,
    };
  }
  if (u.port === "") {
    return {
      ok: false,
      error: "port manquant (précisez le port, ex: 11434)",
    };
  }
  return { ok: true };
}

export function sanitizeOllamaUrl(raw: string): string {
  return raw.replace(/\/+$/, "");
}
