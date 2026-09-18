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
    action: string;
    key?: string;
    value?: number;
    bio?: string;
    value_str?: string;
    weight?: number;
    note?: string;
  };

  try {
    switch (body.action) {
      case "updateTrait":
        if (body.key !== undefined && body.value !== undefined) {
          await originStore.updateTrait(body.key, body.value);
        }
        break;
      case "updateBio":
        if (body.bio !== undefined) {
          await originStore.updateBio(body.bio);
        }
        break;
      case "addValue":
        if (body.value_str !== undefined) {
          await originStore.addValue(body.value_str, body.weight ?? 1, body.note);
        }
        break;
      case "removeValue":
        if (body.key !== undefined) {
          await originStore.removeValue(body.key);
        }
        break;
      case "addPrinciple":
        if (body.value_str !== undefined) {
          await originStore.addPrinciple(body.value_str);
        }
        break;
      case "snapshot":
        await originStore.takeSnapshot();
        break;
      default:
        return Response.json({ error: "Action inconnue" }, { status: 400 });
    }

    const personality = await originStore.loadPersonality();
    return Response.json({ ok: true, personality });
  } catch (e) {
    return Response.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    );
  }
}
