import type { ToolDefinition, ToolCall, ToolResult } from "@ia-app/shared";
import { uid } from "@ia-app/shared";
import { makePathPolicy, type PathPolicy } from "./security/safe-path";
import {
  makeCommandPolicy,
  type CommandPolicy,
} from "./security/safe-command";

export interface ToolContext {
  cwd: string;
  log: (msg: string) => void;
  /** Politique de confinement des chemins (workspace + liste noire). */
  pathPolicy: PathPolicy;
  /** Politique d'allowlist des commandes shell (+ mode power user). */
  commandPolicy: CommandPolicy;
  /**
   * Handler d'approbation pour les actions sensibles. Doit retourner `true`
   * si l'utilisateur accepte, `false` sinon. Si absent, toute action sensible
   * est refusée (défense en profondeur).
   */
  approve?: (call: ToolCall) => Promise<boolean>;
}

export interface Tool {
  definition: ToolDefinition;
  execute: (
    args: Record<string, unknown>,
    ctx: ToolContext
  ) => Promise<ToolResult>;
}

/**
 * Construit un contexte d'exécution des outils avec les politiques de sécurité
 * d'Aegis. Par défaut, le handler `approve` refuse tout : un handler explicite
 * doit être fourni pour autoriser les actions sensibles.
 */
export function makeContext(
  cwd: string,
  opts?: Partial<
    Pick<ToolContext, "approve" | "pathPolicy" | "commandPolicy" | "log">
  >
): ToolContext {
  const powerUser = opts?.commandPolicy?.powerUser ?? false;
  return {
    cwd,
    log: opts?.log ?? (() => {}),
    pathPolicy: opts?.pathPolicy ?? makePathPolicy(cwd),
    commandPolicy: opts?.commandPolicy ?? makeCommandPolicy(powerUser),
    approve: opts?.approve,
  };
}

export class ToolRegistry {
  private tools = new Map<string, Tool>();

  register(tool: Tool): void {
    this.tools.set(tool.definition.name, tool);
  }

  list(): Tool[] {
    return Array.from(this.tools.values());
  }

  definitions(): ToolDefinition[] {
    return this.list().map((t) => t.definition);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  async execute(call: ToolCall, ctx: ToolContext): Promise<ToolResult> {
    const tool = this.tools.get(call.name);
    if (!tool) {
      return {
        callId: call.id,
        name: call.name,
        ok: false,
        output: "",
        error: `Outil inconnu: ${call.name}`,
      };
    }
    try {
      return await tool.execute(call.arguments, ctx);
    } catch (e) {
      return {
        callId: call.id,
        name: call.name,
        ok: false,
        output: "",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }
}

function ok(call: ToolCall, output: string): ToolResult {
  return { callId: call.id, name: call.name, ok: true, output };
}

function err(call: ToolCall, message: string): ToolResult {
  return {
    callId: call.id,
    name: call.name,
    ok: false,
    output: "",
    error: message,
  };
}

export function makeCall(
  name: string,
  args: Record<string, unknown>
): ToolCall {
  return { id: uid("call"), name, arguments: args };
}

export { ok, err };
