import { promises as fs } from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool } from "./tools";
import { ok, err, makeCall } from "./tools";
import { safeResolve } from "./security/safe-path";
import { classifyCommand } from "./security/safe-command";
import { isSensitiveTool } from "./security/sanitize";
import { safeEvalMath } from "./security/math-eval";

const execAsync = promisify(exec);

function str(value: unknown, max = 10000): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.length > max ? s.slice(0, max) + "\n…(tronqué)" : s;
}

export const readFileTool: Tool = {
  definition: {
    name: "read_file",
    description:
      "Lit le contenu d'un fichier texte dans le workspace. Chemin relatif uniquement. Refuse les chemins absolus et hors périmètre.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Chemin relatif du fichier à lire" },
      },
      required: ["path"],
    },
  },
  async execute(args, ctx) {
    const p = str(args.path);
    const resolved = safeResolve(p, ctx.pathPolicy);
    if (!resolved.ok || !resolved.full) {
      return err(makeCall("read_file", args), `read_file: ${resolved.error}`);
    }
    try {
      const content = await fs.readFile(resolved.full, "utf8");
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
      "Écrit du contenu dans un fichier du workspace. Chemin relatif uniquement. Crée le dossier parent si besoin. Écrase si existe. Nécessite l'approbation de l'utilisateur.",
    parameters: {
      type: "object",
      properties: {
        path: { type: "string", description: "Chemin relatif du fichier à écrire" },
        content: { type: "string", description: "Contenu à écrire" },
      },
      required: ["path", "content"],
    },
  },
  async execute(args, ctx) {
    const p = str(args.path);
    const content = str(args.content, 1000000);
    const resolved = safeResolve(p, ctx.pathPolicy);
    if (!resolved.ok || !resolved.full) {
      return err(makeCall("write_file", args), `write_file: ${resolved.error}`);
    }
    const call = makeCall("write_file", args);
    if (isSensitiveTool("write_file")) {
      const approved = ctx.approve ? await ctx.approve(call) : false;
      if (!approved) {
        return err(
          call,
          "write_file: action refusée — approbation utilisateur requise (mode sans approbation = refus)"
        );
      }
    }
    try {
      await fs.mkdir(path.dirname(resolved.full), {
        recursive: true,
      });
      await fs.writeFile(resolved.full, content, "utf8");
      return ok(call, `Écrit ${content.length} octets dans ${p}`);
    } catch (e) {
      return err(call, `write_file: ${String(e)}`);
    }
  },
};

export const listDirTool: Tool = {
  definition: {
    name: "list_dir",
    description:
      "Liste le contenu d'un répertoire du workspace. Chemin relatif uniquement (défaut: cwd).",
    parameters: {
      type: "object",
      properties: {
        path: {
          type: "string",
          description: "Chemin relatif du répertoire (défaut: cwd)",
        },
      },
      required: [],
    },
  },
  async execute(args, ctx) {
    const p = args.path ? str(args.path) : ".";
    const resolved = safeResolve(p, ctx.pathPolicy);
    if (!resolved.ok || !resolved.full) {
      return err(makeCall("list_dir", args), `list_dir: ${resolved.error}`);
    }
    try {
      const entries = await fs.readdir(resolved.full, { withFileTypes: true });
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
      "Exécute une commande shell autorisée (liste blanche). Les commandes destructrices (rm, format, mkfs, curl, shutdown…) sont interdites. Timeout 15s. Nécessite l'approbation de l'utilisateur hors liste blanche.",
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
      return err(call, `run_command: ${verdict.reason}`);
    }
    if (verdict.needsApproval) {
      const approved = ctx.approve ? await ctx.approve(call) : false;
      if (!approved) {
        return err(
          call,
          "run_command: action refusée — approbation utilisateur requise"
        );
      }
    }
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: ctx.cwd,
        maxBuffer: 1024 * 1024,
        timeout: ctx.commandPolicy.timeoutMs,
      });
      const out = str(stdout + (stderr ? `\n[stderr]\n${stderr}` : ""), 10000);
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
      "Évalue une expression mathématique (chiffres, + - * / % ** (), fonctions sqrt/sin/cos/tan/log/exp/abs/pow/round/floor/ceil/min/max).",
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
    try {
      const result = safeEvalMath(expr);
      return ok(makeCall("calc", args), String(result));
    } catch (e) {
      return err(makeCall("calc", args), `calc: ${String(e)}`);
    }
  },
};

export function createDefaultTools(): Tool[] {
  return [readFileTool, writeFileTool, listDirTool, runCommandTool, calcTool];
}
