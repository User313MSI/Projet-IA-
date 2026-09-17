import { NextRequest, NextResponse } from "next/server";
import { guard, readJsonBody } from "../../../lib/auth";
import { resolveApproval } from "../../../lib/approvals";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Réceptionne la décision de l'utilisateur pour une approbation en attente.
 * Le client POST { conversationId, approvalId, accepted } ; cette route
 * résout la promesse correspondante, ce qui débloque le stream SSE de
 * /api/chat (l'outil s'exécute si accepté, est refusé sinon).
 */
export async function POST(req: NextRequest) {
  const g = await guard(req);
  if (g) return g;

  const body = await readJsonBody(req);
  if (!body.ok) {
    return NextResponse.json({ error: body.error }, { status: body.status });
  }

  const data = body.body as {
    conversationId?: string;
    approvalId?: string;
    accepted?: boolean;
  };

  if (!data.approvalId || typeof data.accepted !== "boolean") {
    return NextResponse.json(
      { error: "approvalId et accepted (booléen) requis" },
      { status: 400 }
    );
  }

  const resolved = resolveApproval(data.approvalId, data.accepted);
  if (!resolved) {
    return NextResponse.json(
      { error: "Approbation inconnue, expirée ou déjà résolue" },
      { status: 404 }
    );
  }

  return NextResponse.json({ ok: true });
}
