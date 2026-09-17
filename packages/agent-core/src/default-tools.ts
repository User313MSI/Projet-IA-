import { promises as fs } from "node:fs";
import path from "node:path";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import type { Tool } from "./tools";
import { ok, err, makeCall } from "./tools";

const execAsync = promisify(exec);

function str(value: unknown, max = 10000): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.length > max ? s.slice(0, max) + "\n…(tronqué)" : s;
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
    const full = path.resolve(ctx.cwd, p);
    try {
      const content = await fs.readFile(full, "utf8");
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
      "Écrit du contenu dans un fichier. Crée le dossier parent si besoin. Écrase si existe.",
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
    const full = path.resolve(ctx.cwd, p);
    try {
      await fs.mkdir(path.dirname(full), { recursive: true });
      await fs.writeFile(full, content, "utf8");
      return ok(makeCall("write_file", args), `Écrit ${content.length} octets dans ${p}`);
    } catch (e) {
      return err(makeCall("write_file", args), `write_file: ${String(e)}`);
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
        path: {
          type: "string",
          description: "Chemin du répertoire (défaut: cwd)",
        },
      },
      required: [],
    },
  },
  async execute(args, ctx) {
    const p = args.path ? str(args.path) : ctx.cwd;
    const full = path.resolve(ctx.cwd, p);
    try {
      const entries = await fs.readdir(full, { withFileTypes: true });
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
      "Exécute une commande shell et retourne stdout/stderr (tronqué à 10000 caractères). Timeout 30s.",
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
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: ctx.cwd,
        maxBuffer: 1024 * 1024,
        timeout: 30000,
      });
      const out = str(stdout + (stderr ? `\n[stderr]\n${stderr}` : ""), 10000);
      return ok(makeCall("run_command", args), out || "(sans sortie)");
    } catch (e) {
      const msg =
        e instanceof Error
          ? `${e.message}\n${(e as { stdout?: string }).stdout ?? ""}\n${(e as { stderr?: string }).stderr ?? ""}`
          : String(e);
      return err(makeCall("run_command", args), `run_command: ${str(msg, 10000)}`);
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
        expression: { type: "string", description: "Ex: 2+2*3 ou Math.sqrt(16)" },
      },
      required: ["expression"],
    },
  },
  async execute(args) {
    const expr = str(args.expression, 200);
    if (!/^[\d\s+\-*/().,%Math.seqrtsincotaPIL]+$/.test(expr)) {
      return err(
        makeCall("calc", args),
        "calc: expression non autorisée (caractères interdits)"
      );
    }
    try {
      const result = Function(`"use strict"; return (${expr})`)();
      return ok(makeCall("calc", args), String(result));
    } catch (e) {
      return err(makeCall("calc", args), `calc: ${String(e)}`);
    }
  },
};

export function createDefaultTools(): Tool[] {
  return [readFileTool, writeFileTool, listDirTool, runCommandTool, calcTool];
}
