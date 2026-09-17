import { NextRequest, NextResponse } from "next/server";
import { memory } from "@ia-app/agent-core";
import { guard, readJsonBody } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;
  const convs = await memory.listConversations();
  return NextResponse.json(convs);
}

export async function POST(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;
  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = (parsed.body as { title?: string }) ?? {};
  const settings = await memory.loadSettings();
  const title = (body.title ?? "Nouvelle conversation").slice(0, 200);
  const conv = await memory.createConversation(settings.model, title);
  return NextResponse.json(conv);
}

export async function PUT(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;
  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: parsed.status });
  }
  const body = parsed.body as { id?: string; title?: string };
  if (!body.id || !body.title) {
    return NextResponse.json({ error: "id et title requis" }, { status: 400 });
  }
  await memory.renameConversation(body.id, body.title.slice(0, 200));
  return NextResponse.json({ ok: true });
}
