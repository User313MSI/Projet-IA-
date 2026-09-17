import { NextRequest, NextResponse } from "next/server";
import { memory, OllamaClient } from "@ia-app/agent-core";
import type { Settings } from "@ia-app/shared";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
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
  const body = (await req.json().catch(() => null)) as Partial<Settings> | null;
  if (!body) return NextResponse.json({ error: "JSON invalide" }, { status: 400 });
  const current = await memory.loadSettings();
  const next: Settings = { ...current, ...body };
  await memory.saveSettings(next);
  return NextResponse.json({ ok: true, settings: next });
}
