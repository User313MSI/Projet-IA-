import { NextRequest, NextResponse } from "next/server";
import { getApiToken } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Renvoie le secret local partagé au client same-origin.
 * Cette route n'est accessible QUE depuis le même origine (le serveur web Next.js
 * qui sert aussi l'UI). Les requêtes cross-origin déclenchent un preflight CORS
 * bloqué, et un header custom (x-nexus-token) sur les autres routes empêche les
 * requêtes simples cross-origin. Le client récupère le token ici au chargement
 * et l'inclut dans tous les appels d'API.
 */
export async function GET(req: NextRequest) {
  // Vérifie que la requête vient bien du même origine (Same-Origin).
  const origin = req.headers.get("origin");
  const host = req.headers.get("host");
  if (origin) {
    try {
      const u = new URL(origin);
      if (u.host !== host) {
        return NextResponse.json({ error: "Cross-origin interdit" }, { status: 403 });
      }
    } catch {
      return NextResponse.json({ error: "Origin invalide" }, { status: 400 });
    }
  }
  const token = await getApiToken();
  return NextResponse.json({ token });
}
