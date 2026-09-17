import { NextRequest, NextResponse } from "next/server";
import { memory } from "@ia-app/agent-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const convs = await memory.listConversations();
  return NextResponse.json(convs);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const settings = await memory.loadSettings();
  const conv = await memory.createConversation(settings.model, body.title ?? "Nouvelle conversation");
  return NextResponse.json(conv);
}
