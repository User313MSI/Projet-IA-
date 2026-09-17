import type { NextRequest } from "next/server";
import { Agent, memory } from "@ia-app/agent-core";
import type { ChatMessage, AgentStreamEvent } from "@ia-app/shared";
import { uid } from "@ia-app/shared";
import { guard, readJsonBody } from "../../../lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_MESSAGE = 32000;

export async function POST(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: parsed.status,
      headers: { "Content-Type": "application/json" },
    });
  }
  const body = parsed.body as { conversationId?: string; message?: string };

  if (!body.message?.trim()) {
    return new Response(JSON.stringify({ error: "Message vide" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (body.message.length > MAX_MESSAGE) {
    return new Response(JSON.stringify({ error: "Message trop long" }), {
      status: 413,
      headers: { "Content-Type": "application/json" },
    });
  }

  const settings = await memory.loadSettings();
  let conv = body.conversationId
    ? await memory.getConversation(body.conversationId)
    : null;
  if (!conv) {
    conv = await memory.createConversation(
      settings.model,
      (body.message ?? "").slice(0, 50)
    );
  }

  const userMsg: ChatMessage = {
    id: uid("msg"),
    role: "user",
    content: body.message as string,
    createdAt: Date.now(),
  };
  conv.messages.push(userMsg);
  await memory.saveConversation(conv);

  const agent = new Agent({ settings, cwd: process.cwd() });

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      const send = (e: AgentStreamEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(e)}\n\n`));
      };

      send({ type: "step", step: 0, message: conv!.id });

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
