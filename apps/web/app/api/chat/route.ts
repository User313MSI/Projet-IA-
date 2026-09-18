import type { NextRequest } from "next/server";
import { Agent, memory } from "@ia-app/agent-core";
import { originStore } from "@ia-app/personality-core";
import { buildPersonalityPrompt } from "@ia-app/personality-core/client";
import { knowledgeStore } from "@ia-app/knowledge-core";
import type { ChatMessage, AgentStreamEvent, Settings } from "@ia-app/shared";
import { uid } from "@ia-app/shared";
import { guard, readJsonBody } from "../../../lib/auth";
import { makeApprovalHandler, clearConversationApprovals } from "../../../lib/approvals";

/**
 * Construit le prompt système d'Origin : personnalité (interview) + contexte
 * de la base de connaissances (RAG). Côté serveur uniquement (utilise node:fs
 * via les stores). Si Origin n'est pas encore configurée, on garde le prompt
 * par défaut des settings.
 */
async function buildOriginSystemPrompt(
  basePrompt: string,
  userMessage: string
): Promise<string> {
  let prompt = basePrompt;
  try {
    const personality = await originStore.loadPersonality();
    const questions = await originStore.loadQuestions();
    if (personality) {
      prompt = buildPersonalityPrompt(personality, questions);
    }
  } catch {
    // Origin non configurée → on garde le prompt par défaut.
  }
  // RAG : recherche dans la base de connaissances et injection du contexte.
  try {
    const reachable = await knowledgeStore.isEmbeddingReachable();
    if (reachable) {
      const stats = await knowledgeStore.getStats();
      if (stats && stats.totalChunks > 0) {
        const { context } = await knowledgeStore.queryWithContext(userMessage, 5);
        if (context) {
          prompt += `\n\n## Contexte de ta base de connaissances\nVoici des extraits pertinents issus des documents que ton créateur t'a donnés. Utilise-les pour enrichir ta réponse, et cite la source quand c'est pertinent :\n\n${context}`;
        }
      }
    }
  } catch {
    // Base de connaissances indisponible → on continue sans contexte RAG.
  }
  return prompt;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Préchauffage du modèle : garde le modèle chargé en mémoire RAM d'Ollama
// pour éviter le temps de chargement (~5-15s) au premier token.
let modelWarmed = new Set<string>();
async function warmModel(model: string, ollamaUrl: string): Promise<void> {
  if (modelWarmed.has(model)) return;
  try {
    const res = await fetch(`${ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        prompt: "",
        keep_alive: "30m",
        stream: false,
      }),
      signal: AbortSignal.timeout(60000),
    });
    if (res.ok) {
      modelWarmed.add(model);
    }
  } catch {
    // Ollama indisponible → on continue sans préchauffage.
  }
}

export async function POST(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: parsed.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  const body = parsed.body as {
    conversationId?: string;
    message: string;
  };

  if (!body.message?.trim()) {
    return new Response(JSON.stringify({ error: "Message vide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const settings = await memory.loadSettings();
  // Préchauffage du modèle en parallèle (non bloquant)
  void warmModel(settings.model, settings.ollamaUrl);
  let conv = body.conversationId
    ? await memory.getConversation(body.conversationId)
    : null;
  if (!conv) {
    conv = await memory.createConversation(
      settings.model,
      body.message.slice(0, 50)
    );
  }
  const conversationId = conv.id;

  const userMsg: ChatMessage = {
    id: uid("msg"),
    role: "user",
    content: body.message,
    createdAt: Date.now(),
  };
  conv.messages.push(userMsg);
  await memory.saveConversation(conv);

  // Enrichir le prompt système avec la personnalité d'Origin et le contexte
  // RAG (base de connaissances). C'est ce qui rend Origin "vivante" : elle
  // répond selon sa personnalité (interview) et ses connaissances (livres/notes).
  const enrichedPrompt = await buildOriginSystemPrompt(
    settings.systemPrompt,
    body.message
  );
  const enrichedSettings: Settings = { ...settings, systemPrompt: enrichedPrompt };

  // Handler d'approbation : suspend le stream en créant une approbation en
  // attente (résolue par POST /api/approve, ou refus auto après 120s). L'Agent
  // émet auparavant l'événement `approval_required` que le client affiche.
  const approveHandler = makeApprovalHandler(conversationId);

  const agent = new Agent({
    settings: enrichedSettings,
    cwd: process.cwd(),
    powerUser: settings.powerUser,
    approve: approveHandler,
  });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (e: AgentStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };
      send({ type: "step", step: 0, message: conversationId });
      let assistantText = "";
      const assistantId = uid("msg");
      let stepCount = 0;
      try {
        for await (const event of agent.run(conv!.messages)) {
          stepCount++;
          if (event.type === "token" && event.token) {
            assistantText += event.token;
          }
          send(event);
          if (event.type === "done" && event.finalMessage) {
            const finalMsg: ChatMessage = {
              ...event.finalMessage,
              id: assistantId,
            };
            conv!.messages.push(finalMsg);
            await memory.saveConversation(conv!);
          }
          if (event.type === "error") {
            if (assistantText) {
              conv!.messages.push({
                id: assistantId,
                role: "assistant",
                content: assistantText,
                createdAt: Date.now(),
                model: settings.model,
              });
              await memory.saveConversation(conv!);
            }
          }
        }
      } catch (e) {
        send({
          type: "error",
          message: e instanceof Error ? e.message : String(e),
        });
      } finally {
        // Refus auto de toute approbation restée sans réponse.
        clearConversationApprovals(conversationId);
      }
      send({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
