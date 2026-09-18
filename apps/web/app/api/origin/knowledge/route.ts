import { NextRequest } from "next/server";
import { guard, readJsonBody } from "../../../../lib/auth";
import { knowledgeStore } from "@ia-app/knowledge-core";
import { memory } from "@ia-app/agent-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;

  try {
    const settings = await memory.loadSettings();
    knowledgeStore.setOllamaUrl(settings.ollamaUrl);
    await knowledgeStore.load();
    const documents = knowledgeStore.listDocuments();
    const stats = knowledgeStore.getStats();
    return Response.json({ documents, stats });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  const body = parsed.body as {
    title: string;
    text: string;
    type?: string;
    tags?: string[];
  };

  if (!body.title?.trim() || !body.text?.trim()) {
    return Response.json({ error: "Titre et texte requis" }, { status: 400 });
  }

  try {
    const settings = await memory.loadSettings();
    knowledgeStore.setOllamaUrl(settings.ollamaUrl);
    await knowledgeStore.load();

    const doc = await knowledgeStore.addTextDocument(
      body.title,
      body.title,
      body.text,
      (body.type as "pdf" | "txt" | "epub" | "markdown" | "note" | "web") ?? "note",
      body.tags
    );

    return Response.json({
      ok: true,
      document: doc,
      message: `Document "${doc.title}" indexé : ${doc.chunkCount} passages.`,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;

  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return Response.json({ error: "ID requis" }, { status: 400 });
  }

  try {
    await knowledgeStore.load();
    await knowledgeStore.deleteDocument(id);
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
