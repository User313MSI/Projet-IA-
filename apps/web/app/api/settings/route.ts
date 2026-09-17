import { NextRequest, NextResponse } from "next/server";
import { memory, OllamaClient, security } from "@ia-app/agent-core";
import type { Settings } from "@ia-app/shared";
import { guard, readJsonBody } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;
  const settings = await memory.loadSettings();
  let reachable = false;
  let models: { name: string; size?: number; parameterSize?: string }[] = [];
  try {
    const ollama = new OllamaClient(settings.ollamaUrl);
    reachable = await ollama.isReachable();
    if (reachable) models = await ollama.listModels();
  } catch {
    reachable = false;
  }
  return NextResponse.json({ settings, reachable, models });
}

export async function POST(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;
  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.body as Partial<Settings> | null;
  if (!body) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  const current = await memory.loadSettings();
  const next: Settings = { ...current, ...body };
  // Validation de l'URL Ollama (SSRF) : refuse tout hôte non local.
  const urlCheck = security.isLocalOllamaUrl(next.ollamaUrl);
  if (!urlCheck.ok) {
    return NextResponse.json(
      { error: `URL Ollama invalide: ${urlCheck.error}` },
      { status: 400 }
    );
  }
  // Bornage des champs texte.
  next.systemPrompt = next.systemPrompt.slice(0, 8000);
  await memory.saveSettings(next);
  return NextResponse.json({ ok: true, settings: next });
}
