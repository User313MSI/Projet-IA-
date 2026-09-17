import type { ToolDefinition, ToolCall, ToolResult } from "@ia-app/shared";
import { uid } from "@ia-app/shared";
import {
  makePathPolicy,
  makeCommandPolicy,
  type PathPolicy,
  type CommandPolicy,
} from "./security";

export interface ToolContext {
  cwd: string;
  log: (msg: string) => void;
  /** Politique de confinement des chemins (lecture/écriture/listage). */
  pathPolicy: PathPolicy;
  /** Politique d'exécution des commandes shell. */
  commandPolicy: CommandPolicy;
  /**
   * Demande l'approbation de l'utilisateur pour une action sensible.
   * Retourne true si l'utilisateur accepte. Par défaut (aucun handler),
   * refuse toute action sensible — défense en profondeur.
   */
  approve?: (call: ToolCall) => Promise<boolean>;
}

export function makeContext(cwd: string): ToolContext {
  return {
    cwd,
    log: () => {},
    pathPolicy: makePathPolicy(cwd),
    commandPolicy: makeCommandPolicy(false),
    approve: () => Promise.resolve(false),
  };
}

export interface Tool {
  definition: ToolDefinition;
  execute: (
    args: Record<string, unknown>,
    ctx: ToolContext
  ) => Promise<ToolResult>;
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
