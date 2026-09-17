import { promises as fs } from "node:fs";
import path from "node:path";
import type { Conversation, Settings } from "@ia-app/shared";
import { DEFAULT_SETTINGS, uid } from "@ia-app/shared";

const DATA_DIR = path.join(
  process.env.HOME ?? process.env.USERPROFILE ?? ".",
  ".ia-app"
);
const CONV_FILE = path.join(DATA_DIR, "conversations.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  // Restreint les permissions du répertoire de données au propriétaire (0o700).
  try {
    await fs.chmod(DATA_DIR, 0o700);
  } catch {
    // best-effort, ignore sur systèmes non POSIX
  }
}

async function writeRestricted(file: string, data: string): Promise<void> {
  await fs.writeFile(file, data, "utf8");
  try {
    await fs.chmod(file, 0o600);
  } catch {
    // best-effort
  }
}

export class Memory {
  async listConversations(): Promise<Conversation[]> {
    await ensureDir();
    try {
      const raw = await fs.readFile(CONV_FILE, "utf8");
      const data = JSON.parse(raw) as Conversation[];
      return data.sort((a, b) => b.updatedAt - a.updatedAt);
    } catch {
      return [];
    }
  }

  async getConversation(id: string): Promise<Conversation | null> {
    const all = await this.listConversations();
    return all.find((c) => c.id === id) ?? null;
  }

  async saveConversation(conv: Conversation): Promise<void> {
    await ensureDir();
    const all = await this.listConversations();
    const idx = all.findIndex((c) => c.id === conv.id);
    conv.updatedAt = Date.now();
    if (idx >= 0) all[idx] = conv;
    else all.push(conv);
    await writeRestricted(CONV_FILE, JSON.stringify(all, null, 2));
  }

  async renameConversation(id: string, title: string): Promise<void> {
    const conv = await this.getConversation(id);
    if (conv) {
      conv.title = title;
      await this.saveConversation(conv);
    }
  }

  async deleteConversation(id: string): Promise<void> {
    const all = await this.listConversations();
    const filtered = all.filter((c) => c.id !== id);
    await writeRestricted(CONV_FILE, JSON.stringify(filtered, null, 2));
  }

  async createConversation(model: string, title = "Nouvelle conversation"): Promise<Conversation> {
    const conv: Conversation = {
      id: uid("conv"),
      title,
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      model,
    };
    await this.saveConversation(conv);
    return conv;
  }

  async loadSettings(): Promise<Settings> {
    await ensureDir();
    try {
      const raw = await fs.readFile(SETTINGS_FILE, "utf8");
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }

  async saveSettings(settings: Settings): Promise<void> {
    await ensureDir();
    await writeRestricted(SETTINGS_FILE, JSON.stringify(settings, null, 2));
  }
}

export const memory = new Memory();
