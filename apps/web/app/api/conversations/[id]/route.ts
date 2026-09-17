import { NextRequest, NextResponse } from "next/server";
import { memory } from "@ia-app/agent-core";
import { guard } from "../../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard(req);
  if (auth) return auth;
  const { id } = await params;
  const conv = await memory.getConversation(id);
  if (!conv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await guard(req);
  if (auth) return auth;
  const { id } = await params;
  await memory.deleteConversation(id);
  return NextResponse.json({ ok: true });
}
