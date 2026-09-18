import { NextRequest, NextResponse } from "next/server";
import { memory, OllamaClient } from "@ia-app/agent-core";
import { isLocalOllamaUrl } from "@ia-app/agent-core";
import type { Settings } from "@ia-app/shared";
import { guard, readJsonBody } from "../../../lib/auth";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;
  const settings = await memory.loadSettings();
  const ollama = new OllamaClient(settings.ollamaUrl);
  let reachable = false;
  let models: { name: string; size?: number; parameterSize?: string }[] = [];
  try {
    reachable = await ollama.isReachable();
    if (reachable) models = await ollama.listModels();
  } catch {
    reachable = false;
  }
  return NextResponse.json({ settings, reachable, models });
}

export async function POST(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;
  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.body as Partial<Settings> | null;
  if (!body) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  const current = await memory.loadSettings();
  const next: Settings = { ...current, ...body };
  // Validation de l'URL Ollama (loopback uniquement) avant sauvegarde (anti-SSRF).
  const urlCheck = isLocalOllamaUrl(next.ollamaUrl);
  if (!urlCheck.ok) {
    return NextResponse.json({ error: `ollamaUrl invalide: ${urlCheck.error}` }, { status: 400 });
  }
  // powerUser est un booléen explicite (défaut false si non fourni).
  next.powerUser = body.powerUser === true;
  // fastMode est un booléen explicite (défaut true si non fourni).
  next.fastMode = body.fastMode !== false;
  await memory.saveSettings(next);
  return NextResponse.json({ ok: true, settings: next });
}
