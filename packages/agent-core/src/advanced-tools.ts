import { promises as fs } from "node:fs";
import os from "node:os";
import type { Tool } from "./tools";
import { ok, err, makeCall } from "./tools";
import { safeResolve } from "./security/safe-path";

function str(value: unknown, max = 10000): string {
  const s = typeof value === "string" ? value : String(value ?? "");
  return s.length > max ? s.slice(0, max) + "\n…(tronqué)" : s;
}

export const systemInfoTool: Tool = {
  definition: {
    name: "system_info",
    description:
      "Retourne les informations système : OS, CPU, RAM totale/libre, uptime, stockage.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
    },
  },
  async execute(args) {
    const cpus = os.cpus();
    const cpuInfo = cpus[0]
      ? `${cpus.length}x ${cpus[0].model}`
      : "inconnu";
    const totalMem = Math.round(os.totalmem() / 1024 / 1024 / 1024);
    const freeMem = Math.round(os.freemem() / 1024 / 1024 / 1024);
    const uptime = Math.round(os.uptime() / 3600);
    const info = [
      `OS: ${os.type()} ${os.release()} (${os.platform()})`,
      `CPU: ${cpuInfo}`,
      `RAM totale: ${totalMem} Go`,
      `RAM libre: ${freeMem} Go`,
      `Uptime: ${uptime}h`,
    ].join("\n");
    return ok(makeCall("system_info", args), info);
  },
};

export const weatherTool: Tool = {
  definition: {
    name: "weather",
    description:
      "Retourne la météo actuelle pour une ville donnée (via wttr.in, service public gratuit).",
    parameters: {
      type: "object",
      properties: {
        city: { type: "string", description: "Nom de la ville (ex: Paris, Lyon)" },
      },
      required: ["city"],
    },
  },
  async execute(args) {
    const city = str(args.city, 100);
    try {
      const res = await fetch(
        `https://wttr.in/${encodeURIComponent(city)}?format=4`,
        { signal: AbortSignal.timeout(10000) }
      );
      if (!res.ok) return err(makeCall("weather", args), `weather: HTTP ${res.status}`);
      const text = await res.text();
      return ok(makeCall("weather", args), str(text, 500));
    } catch (e) {
      return err(makeCall("weather", args), `weather: ${String(e)}`);
    }
  },
};

export const webSearchTool: Tool = {
  definition: {
    name: "web_search",
    description:
      "Recherche sur le web via DuckDuckGo (gratuit, pas de clé API). Retourne les titres et URLs des premiers résultats.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Requête de recherche" },
      },
      required: ["query"],
    },
  },
  async execute(args) {
    const query = str(args.query, 200);
    try {
      const res = await fetch(
        `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`,
        {
          headers: { "User-Agent": "Mozilla/5.0" },
          signal: AbortSignal.timeout(10000),
        }
      );
      if (!res.ok) return err(makeCall("web_search", args), `web_search: HTTP ${res.status}`);
      const html = await res.text();
      const links: string[] = [];
      const regex = /<a rel="nofollow" class="result__a" href="([^"]+)">([^<]+)<\/a>/g;
      let match;
      let count = 0;
      while ((match = regex.exec(html)) && count < 5) {
        const url = (match[1] ?? "").replace(/\/\/duckduckgo.com\/l\/\?uddg=/, "").split("&rut=")[0];
        const title = (match[2] ?? "").trim();
        if (url) links.push(`${title}\n  ${decodeURIComponent(url)}`);
        count++;
      }
      if (links.length === 0) {
        return ok(makeCall("web_search", args), "Aucun résultat trouvé.");
      }
      return ok(makeCall("web_search", args), links.join("\n\n"));
    } catch (e) {
      return err(makeCall("web_search", args), `web_search: ${String(e)}`);
    }
  },
};

export const reminderStore = new Map<string, { msg: string; at: number }>();

export const scheduleTool: Tool = {
  definition: {
    name: "schedule_reminder",
    description:
      "Planifie un rappel. Stocke un message avec un délai en minutes. Retourne un ID de rappel.",
    parameters: {
      type: "object",
      properties: {
        message: { type: "string", description: "Message du rappel" },
        minutes: { type: "number", description: "Délai en minutes" },
      },
      required: ["message", "minutes"],
    },
  },
  async execute(args) {
    const message = str(args.message, 500);
    const minutes = Number(args.minutes);
    if (!minutes || minutes <= 0) {
      return err(makeCall("schedule_reminder", args), "minutes doit être > 0");
    }
    const id = `reminder_${Date.now()}`;
    reminderStore.set(id, { msg: message, at: Date.now() + minutes * 60000 });
    return ok(
      makeCall("schedule_reminder", args),
      `Rappel programmé dans ${minutes} min: "${message}" (ID: ${id})`
    );
  },
};

export const fileSearchTool: Tool = {
  definition: {
    name: "file_search",
    description:
      "Recherche des fichiers par nom dans un répertoire (récursif). Retourne les chemins trouvés.",
    parameters: {
      type: "object",
      properties: {
        pattern: { type: "string", description: "Mot à chercher dans le nom du fichier" },
        directory: { type: "string", description: "Répertoire de départ (défaut: cwd)" },
      },
      required: ["pattern"],
    },
  },
  async execute(args, ctx) {
    const pattern = str(args.pattern, 200).toLowerCase();
    const dirInput = args.directory ? str(args.directory) : ".";
    const resolved = safeResolve(dirInput, ctx.pathPolicy);
    if (!resolved.ok) {
      return err(makeCall("file_search", args), `file_search: ${resolved.error}`);
    }
    const startDir = resolved.full!;
    const results: string[] = [];
    async function walk(dir: string, depth: number): Promise<void> {
      if (depth > 3 || results.length > 20) return;
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (entry.name.toLowerCase().includes(pattern)) {
            results.push(`${dir}/${entry.name}`);
            if (results.length >= 20) return;
          }
          if (entry.isDirectory() && !entry.name.startsWith(".") && entry.name !== "node_modules") {
            await walk(`${dir}/${entry.name}`, depth + 1);
          }
        }
      } catch {
        // skip inaccessible dirs
      }
    }
    await walk(startDir, 0);
    return ok(
      makeCall("file_search", args),
      results.length ? results.join("\n") : "Aucun fichier trouvé."
    );
  },
};

export function createAdvancedTools(): Tool[] {
  return [systemInfoTool, weatherTool, webSearchTool, scheduleTool, fileSearchTool];
}
