import { promises as fs } from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { ToolCall, ToolResult } from "@ia-app/shared";
import type { Tool, ToolContext } from "./tools";
import { ok, err, makeCall } from "./tools";
import { safeResolve } from "./security/safe-path";
import { classifyCommand } from "./security/safe-command";
import { safeEvalMath } from "./security/math-eval";

const execAsync = promisify(exec);

function str(value: unknown, max = 10000): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.length > max ? s.slice(0, max) + "\n…(tronqué)" : s;
}

/**
 * Demande l'approbation utilisateur pour une action sensible. Sans handler
 * `approve` (défense en profondeur) ou si l'utilisateur refuse, renvoie une
 * erreur d'action non approuvée.
 */
async function requestApproval(
  ctx: ToolContext,
  call: ToolCall,
  reason: string
): Promise<ToolResult | null> {
  if (!ctx.approve) {
    return err(call, `action non approuvée (${reason}) — approbation requise`);
  }
  const accepted = await ctx.approve(call);
  if (!accepted) {
    return err(call, `action non approuvée (refusée par l'utilisateur)`);
  }
  return null;
}

export const readFileTool: Tool = {
  definition: {
    name: "read_file",
    description:
      "Lit le contenu d'un fichier texte. Retourne le contenu ou une erreur.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Chemin du fichier à lire" },
      },
      required: ["path"],
    },
  },
  async execute(args, ctx) {
    const p = str(args.path);
    const resolved = safeResolve(p, ctx.pathPolicy);
    if (!resolved.ok) {
      return err(makeCall("read_file", args), `read_file: ${resolved.error}`);
    }
    try {
      const content = await fs.readFile(resolved.full!, "utf8");
      return ok(makeCall("read_file", args), str(content, 20000));
    } catch (e) {
      return err(makeCall("read_file", args), `read_file: ${String(e)}`);
    }
  },
};

export const writeFileTool: Tool = {
  definition: {
    name: "write_file",
    description:
      "Écrit du contenu dans un fichier. Crée le dossier parent si besoin. Écrase si existe. Action sensible : approbation requise.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Chemin du fichier à écrire" },
        content: { type: "string", description: "Contenu à écrire" },
      },
      required: ["path", "content"],
    },
  },
  async execute(args, ctx) {
    const p = str(args.path);
    const content = str(args.content, 1000000);
    const call = makeCall("write_file", args);
    const resolved = safeResolve(p, ctx.pathPolicy);
    if (!resolved.ok) {
      return err(call, `write_file: ${resolved.error}`);
    }
    const denied = await requestApproval(ctx, call, "écriture de fichier");
    if (denied) return denied;
    const full = resolved.full!;
    try {
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, content, "utf8");
      return ok(call, `Écrit ${content.length} octets dans ${p}`);
    } catch (e) {
      return err(call, `write_file: ${String(e)}`);
    }
  },
};

export const listDirTool: Tool = {
  definition: {
    name: "list_dir",
    description: "Liste le contenu d'un répertoire.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Chemin du répertoire (défaut: cwd)" },
      },
      required: [],
    },
  },
  async execute(args, ctx) {
    const input = args.path ? str(args.path) : ".";
    const resolved = safeResolve(input, ctx.pathPolicy);
    if (!resolved.ok) {
      return err(makeCall("list_dir", args), `list_dir: ${resolved.error}`);
    }
    try {
      const entries = await fs.readdir(resolved.full!, {
        withFileTypes: true,
      });
      const out = entries
        .map((e) => `${e.isDirectory() ? "DIR " : "FILE"} ${e.name}`)
        .join("\n");
      return ok(makeCall("list_dir", args), out || "(vide)");
    } catch (e) {
      return err(makeCall("list_dir", args), `list_dir: ${String(e)}`);
    }
  },
};

export const runCommandTool: Tool = {
  definition: {
    name: "run_command",
    description:
      "Exécute une commande shell et retourne stdout/stderr (tronqué à 10000 caractères). Seules les commandes de la liste blanche s'exécutent sans approbation ; hors liste blanche, le mode power user + approbation sont requis. Les commandes destructrices (rm -rf, curl, sudo…) sont toujours refusées.",
    parameters: {
      type: "object",
      properties: {
        command: { type: "string", description: "Commande à exécuter" },
      },
      required: ["command"],
    },
  },
  async execute(args, ctx) {
    const command = str(args.command, 5000);
    const call = makeCall("run_command", args);
    const verdict = classifyCommand(command, ctx.commandPolicy);
    if (!verdict.allowed) {
      return err(call, `run_command: commande interdite — ${verdict.reason}`);
    }
    if (verdict.needsApproval) {
      const denied = await requestApproval(
        ctx,
        call,
        "commande hors liste blanche (mode power user)"
      );
      if (denied) return denied;
    }
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: ctx.cwd,
        maxBuffer: 1024 * 1024,
        timeout: ctx.commandPolicy.timeoutMs,
      });
      const out = str(
        stdout + (stderr ? `\n[stderr]\n${stderr}` : ""),
        10000
      );
      return ok(call, out || "(sans sortie)");
    } catch (e) {
      const msg =
        e instanceof Error
          ? `${e.message}\n${(e as { stdout?: string }).stdout ?? ""}\n${(e as { stderr?: string }).stderr ?? ""}`
          : String(e);
      return err(call, `run_command: ${str(msg, 10000)}`);
    }
  },
};

export const calcTool: Tool = {
  definition: {
    name: "calc",
    description:
      "Évalue une expression mathématique simple (+ - * / ** () et fonctions Math).",
    parameters: {
      type: "object",
      properties: {
        expression: { type: "string", description: "Ex: 2+2*3 ou sqrt(16)" },
      },
      required: ["expression"],
    },
  },
  async execute(args) {
    const expr = str(args.expression, 200);
    const call = makeCall("calc", args);
    try {
      const result = safeEvalMath(expr);
      return ok(call, String(result));
    } catch (e) {
      return err(
        call,
        `calc: expression non autorisée (${e instanceof Error ? e.message : String(e)})`
      );
    }
  },
};

export function createDefaultTools(): Tool[] {
  return [readFileTool, writeFileTool, listDirTool, runCommandTool, calcTool];
}
