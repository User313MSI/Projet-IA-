import path from "node:path";

export interface PathPolicy {
  /** Répertoire racine autorisé (absolu). */
  root: string;
  /** Sous-chemins relatifs interdits par liste noire (sensibles système/crédentiels). */
  denyNames: string[];
}

export const DEFAULT_DENY_NAMES = [
  ".ssh",
  ".aws",
  ".gnupg",
  ".config",
  ".env",
  ".env.local",
  ".npmrc",
  ".git",
  "id_rsa",
  "id_ed25519",
  "credentials",
  ".kube",
];

export function isInside(target: string, root: string): boolean {
  const t = path.resolve(target) + path.sep;
  const r = path.resolve(root) + path.sep;
  return t === r || t.startsWith(r);
}

export function isDenyName(target: string, denyNames: string[]): boolean {
  const base = path.basename(path.resolve(target)).toLowerCase();
  const parent = path.basename(path.dirname(path.resolve(target))).toLowerCase();
  for (const d of denyNames) {
    const dl = d.toLowerCase();
    if (base === dl) return true;
    if (parent === dl) return true;
  }
  return false;
}

export interface ResolveResult {
  ok: boolean;
  full?: string;
  error?: string;
}

export function safeResolve(
  input: string,
  policy: PathPolicy
): ResolveResult {
  if (!input || typeof input !== "string") {
    return { ok: false, error: "chemin vide ou invalide" };
  }
  if (path.isAbsolute(input)) {
    return {
      ok: false,
      error: `chemin absolu interdit: ${input} (utilisez un chemin relatif au workspace)`,
    };
  }
  const full = path.resolve(policy.root, input);
  if (!isInside(full, policy.root)) {
    return {
      ok: false,
      error: `chemin hors périmètre: ${input} (interdit, reste dans ${policy.root})`,
    };
  }
  if (isDenyName(full, policy.denyNames)) {
    return {
      ok: false,
      error: `chemin sensible interdit: ${input}`,
    };
  }
  return { ok: true, full };
}

export function makePathPolicy(root: string): PathPolicy {
  return { root: path.resolve(root), denyNames: DEFAULT_DENY_NAMES };
}
