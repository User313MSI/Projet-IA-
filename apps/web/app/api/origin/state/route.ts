import { NextRequest } from "next/server";
import { guard } from "../../../../lib/auth";
import { originStore } from "@ia-app/personality-core";
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

    const [personality, questions, evolution] = await Promise.all([
      originStore.loadPersonality(),
      originStore.loadQuestions(),
      originStore.loadEvolution(),
    ]);

    const documents = knowledgeStore.listDocuments();
    const stats = knowledgeStore.getStats();
    const embeddingReachable = await knowledgeStore.isEmbeddingReachable();

    return Response.json({
      personality,
      questions,
      evolution,
      documents,
      stats,
      embeddingReachable,
    });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
