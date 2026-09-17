import { uid } from "@ia-app/shared";
import type { ToolCall } from "@ia-app/shared";

/**
 * Registre des approbations en attente. Permet de suspendre l'exécution d'un
 * outil sensible jusqu'à la décision de l'utilisateur : le handler `approve`
 * passé à l'Agent renvoie une promesse stockée ici, résolue par
 * `resolveApproval` (appelée par POST /api/approve), ou refusée
 * automatiquement après un timeout.
 *
 * Chaque entrée est scopée par conversationId pour éviter qu'une approbation
 * d'une conversation n'en résolve une autre.
 *
 * Ce module est de la logique pure (pas de dépendance Next.js) afin d'être
 * testé par Vitest.
 */

export const DEFAULT_APPROVAL_TIMEOUT_MS = 120_000;

export interface PendingApproval {
  approvalId: string;
  conversationId: string;
  toolName: string;
  arguments: Record<string, unknown>;
  reason: string;
  resolve: (accepted: boolean) => void;
  timer: ReturnType<typeof setTimeout>;
  createdAt: number;
}

const pending = new Map<string, PendingApproval>();
const byConversation = new Map<string, Set<string>>();

/**
 * Crée une approbation en attente et renvoie une promesse qui se résout quand
 * l'utilisateur répond (via `resolveApproval`), ou qui se résout en `false`
 * (refus) après `timeoutMs` sans réponse.
 */
export function createPendingApproval(
  conversationId: string,
  approvalId: string,
  toolName: string,
  args: Record<string, unknown>,
  reason: string,
  timeoutMs: number = DEFAULT_APPROVAL_TIMEOUT_MS
): Promise<boolean> {
  let resolver!: (accepted: boolean) => void;
  const promise = new Promise<boolean>((resolve) => {
    resolver = resolve;
  });

  const timer = setTimeout(() => {
    resolveApproval(approvalId, false);
  }, timeoutMs);

  const entry: PendingApproval = {
    approvalId,
    conversationId,
    toolName,
    arguments: args,
    reason,
    resolve: resolver,
    timer,
    createdAt: Date.now(),
  };
  pending.set(approvalId, entry);

  let set = byConversation.get(conversationId);
  if (!set) {
    set = new Set();
    byConversation.set(conversationId, set);
  }
  set.add(approvalId);

  return promise;
}

/** Génère un identifiant d'approbation unique (basé sur uid partagé). */
export function newApprovalId(): string {
  return uid("approval");
}

export function getPendingApproval(
  approvalId: string
): PendingApproval | undefined {
  return pending.get(approvalId);
}

/**
 * Résout une approbation en attente. Retourne true si elle existait et a été
 * résolue, false sinon (inconnue, déjà résolue ou expirée).
 */
export function resolveApproval(
  approvalId: string,
  accepted: boolean
): boolean {
  const entry = pending.get(approvalId);
  if (!entry) return false;
  pending.delete(approvalId);
  const set = byConversation.get(entry.conversationId);
  set?.delete(approvalId);
  clearTimeout(entry.timer);
  entry.resolve(accepted);
  return true;
}

/** Nettoie toutes les approbations en attente d'une conversation (refus auto). */
export function clearConversationApprovals(conversationId: string): void {
  const set = byConversation.get(conversationId);
  if (!set) return;
  for (const id of set) {
    resolveApproval(id, false);
  }
  byConversation.delete(conversationId);
}

export function pendingCount(): number {
  return pending.size;
}

/** Réinitialise le registre (utile pour les tests). */
export function resetApprovals(): void {
  for (const entry of pending.values()) {
    clearTimeout(entry.timer);
  }
  pending.clear();
  byConversation.clear();
}

/**
 * Construit un handler `approve` qui crée une approbation en attente pour la
 * conversation donnée. Le motif (`reason`) est déduit du nom de l'outil.
 */
export function makeApprovalHandler(
  conversationId: string,
  timeoutMs: number = DEFAULT_APPROVAL_TIMEOUT_MS
): (call: ToolCall) => Promise<boolean> {
  return (call: ToolCall) => {
    const reason =
      call.name === "write_file"
        ? "écriture de fichier"
        : call.name === "run_command"
          ? "commande hors allowlist (mode power user)"
          : "action sensible";
    return createPendingApproval(
      conversationId,
      call.id,
      call.name,
      call.arguments,
      reason,
      timeoutMs
    );
  };
}
