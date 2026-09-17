import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes } from "node:crypto";

const DATA_DIR = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".ia-app"
);
const TOKEN_FILE = path.join(DATA_DIR, ".api_token");

let cachedToken: string | null = null;

/**
 * Charge (ou génère au premier lancement) un secret local partagé entre le
 * client web et l'API. Stocké dans ~/.ia-app/.api_token en permissions 0600.
 * Ce n'est PAS une protection complète contre un attaquant local qui lit les
 * fichiers, mais cela empêche un hôte arbitraire du réseau local d'appeler
 * l'API sans connaître le token.
 */
export async function getApiToken(): Promise<string> {
  if (cachedToken) return cachedToken;
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    cachedToken = await fs.readFile(TOKEN_FILE, "utf8");
    return cachedToken;
  } catch {
    const token = randomBytes(32).toString("hex");
    await fs.writeFile(TOKEN_FILE, token, "utf8");
    try {
      await fs.chmod(TOKEN_FILE, 0o600);
    } catch {
      // best-effort
    }
    cachedToken = token;
    return token;
  }
}

export async function getApiTokenForClient(): Promise<string> {
  return getApiToken();
}

const MAX_PAYLOAD = 256 * 1024; // 256 ko
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60;

const hits = new Map<string, { count: number; reset: number }>();

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.reset) {
    hits.set(ip, { count: 1, reset: now + RATE_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_MAX;
}

/**
 * Garde d'authentification commune à toutes les routes API.
 * Vérifie le token local et applique un rate limit par IP.
 */
export async function guard(req: NextRequest): Promise<NextResponse | null> {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";

  if (!rateLimit(ip)) {
    return NextResponse.json(
      { error: "Trop de requêtes (rate limit)" },
      { status: 429 }
    );
  }

  // En dev, on peut définir NEXUS_API_NO_AUTH=1 pour désactiver l'auth (localhost).
  if (process.env.NEXUS_API_NO_AUTH === "1") return null;

  const expected = await getApiToken();
  const provided = req.headers.get("x-nexus-token");
  if (!provided || provided !== expected) {
    return NextResponse.json({ error: "Non autorisé" }, { status: 401 });
  }
  return null;
}

/** Limite la taille du corps de la requête (en octets). */
export async function readJsonBody(
  req: NextRequest,
  max = MAX_PAYLOAD
): Promise<{ ok: true; body: unknown } | { ok: false; status: number; error: string }> {
  const len = Number(req.headers.get("content-length") ?? 0);
  if (len && len > max) {
    return { ok: false, status: 413, error: "Payload trop volumineux" };
  }
  const text = await req.text();
  if (text.length > max) {
    return { ok: false, status: 413, error: "Payload trop volumineux" };
  }
  try {
    return { ok: true, body: JSON.parse(text) };
  } catch {
    return { ok: false, status: 400, error: "JSON invalide" };
  }
}
