import { NextRequest, NextResponse } from "next/server";
import { memory } from "@ia-app/agent-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const conv = await memory.getConversation(id);
  if (!conv) return NextResponse.json({ error: "Introuvable" }, { status: 404 });
  return NextResponse.json(conv);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  await memory.deleteConversation(id);
  return NextResponse.json({ ok: true });
}
