import { NextRequest } from "next/server";
import { guard, readJsonBody } from "../../../../lib/auth";
import { originStore } from "@ia-app/personality-core";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await guard(req);
  if (auth) return auth;

  const parsed = await readJsonBody(req);
  if (!parsed.ok) {
    return Response.json({ error: parsed.error }, { status: parsed.status });
  }

  const body = parsed.body as {
    action: "answer" | "skip" | "add";
    questionId?: string;
    answer?: string;
    impact?: string;
    category?: string;
    question?: string;
    context?: string;
  };

  try {
    switch (body.action) {
      case "answer":
        if (body.questionId && body.answer) {
          await originStore.answerQuestion(body.questionId, body.answer, body.impact);
        }
        break;
      case "skip":
        if (body.questionId) {
          await originStore.skipQuestion(body.questionId);
        }
        break;
      case "add":
        if (body.category && body.question) {
          await originStore.addQuestion(
            body.category as Parameters<typeof originStore.addQuestion>[0],
            body.question,
            body.context
          );
        }
        break;
      default:
        return Response.json({ error: "Action inconnue" }, { status: 400 });
    }

    const questions = await originStore.loadQuestions();
    return Response.json({ ok: true, questions });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
