import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { uid } from "@ia-app/shared";
import type {
  Personality,
  InterviewQuestion,
  PersonalitySnapshot,
  PersonalityEvolution,
  PersonalityCategory,
  CoreValue,
} from "./types";
import { createDefaultPersonality } from "./types";
import { createDefaultQuestions } from "./interview";
import {
  answerQuestion as answerQ,
  skipQuestion as skipQ,
  addCustomQuestion as addQ,
} from "./interview";

const STORE_DIR = path.join(os.homedir(), ".ia-app", "origin");

function personalityPath(): string {
  return path.join(STORE_DIR, "personality.json");
}

function questionsPath(): string {
  return path.join(STORE_DIR, "questions.json");
}

function evolutionPath(): string {
  return path.join(STORE_DIR, "evolution.json");
}

async function ensureDir(): Promise<void> {
  await fs.mkdir(STORE_DIR, { recursive: true });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, data: unknown): Promise<void> {
  await ensureDir();
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), "utf8");
  try {
    await fs.chmod(filePath, 0o600);
  } catch {
    // best effort
  }
}

export class OriginStore {
  private personality: Personality | null = null;
  private questions: InterviewQuestion[] | null = null;
  private evolution: PersonalityEvolution | null = null;

  async loadPersonality(): Promise<Personality> {
    if (this.personality) return this.personality;
    const stored = await readJson<Personality | null>(personalityPath(), null);
    this.personality = stored ?? createDefaultPersonality();
    return this.personality;
  }

  async savePersonality(p: Personality): Promise<void> {
    const updated: Personality = {
      ...p,
      identity: { ...p.identity, updatedAt: Date.now() },
    };
    this.personality = updated;
    await writeJson(personalityPath(), updated);
  }

  async loadQuestions(): Promise<InterviewQuestion[]> {
    if (this.questions) return this.questions;
    const stored = await readJson<InterviewQuestion[] | null>(questionsPath(), null);
    this.questions = stored ?? createDefaultQuestions();
    return this.questions;
  }

  async saveQuestions(q: InterviewQuestion[]): Promise<void> {
    this.questions = q;
    await writeJson(questionsPath(), q);
  }

  async answerQuestion(questionId: string, answer: string, impact?: string): Promise<void> {
    const questions = await this.loadQuestions();
    const updated = answerQ(questions, questionId, answer, impact);
    await this.saveQuestions(updated);
  }

  async skipQuestion(questionId: string): Promise<void> {
    const questions = await this.loadQuestions();
    const updated = skipQ(questions, questionId);
    await this.saveQuestions(updated);
  }

  async addQuestion(category: PersonalityCategory, question: string, context?: string): Promise<void> {
    const questions = await this.loadQuestions();
    const updated = addQ(questions, category, question, context);
    await this.saveQuestions(updated);
  }

  async addValue(value: string, weight: number, note?: string): Promise<void> {
    const p = await this.loadPersonality();
    const coreValue: CoreValue = {
      id: uid("val"),
      value,
      weight,
      note,
    };
    const updated: Personality = {
      ...p,
      values: [...p.values, coreValue],
    };
    await this.savePersonality(updated);
  }

  async removeValue(id: string): Promise<void> {
    const p = await this.loadPersonality();
    const updated: Personality = {
      ...p,
      values: p.values.filter((v) => v.id !== id),
    };
    await this.savePersonality(updated);
  }

  async updateTrait(key: string, value: number): Promise<void> {
    const p = await this.loadPersonality();
    const updated: Personality = {
      ...p,
      traits: p.traits.map((t) => (t.key === key ? { ...t, value } : t)),
    };
    await this.savePersonality(updated);
  }

  async updateWorldview(partial: Partial<Personality["worldview"]>): Promise<void> {
    const p = await this.loadPersonality();
    const updated: Personality = {
      ...p,
      worldview: { ...p.worldview, ...partial },
    };
    await this.savePersonality(updated);
  }

  async updateTone(partial: Partial<Personality["tone"]>): Promise<void> {
    const p = await this.loadPersonality();
    const updated: Personality = {
      ...p,
      tone: { ...p.tone, ...partial },
    };
    await this.savePersonality(updated);
  }

  async updateBio(bio: string): Promise<void> {
    const p = await this.loadPersonality();
    const updated: Personality = { ...p, bio };
    await this.savePersonality(updated);
  }

  async addPrinciple(principle: string): Promise<void> {
    const p = await this.loadPersonality();
    const updated: Personality = {
      ...p,
      worldview: {
        ...p.worldview,
        principles: [...p.worldview.principles, principle],
      },
    };
    await this.savePersonality(updated);
  }

  async takeSnapshot(): Promise<PersonalitySnapshot> {
    const p = await this.loadPersonality();
    const q = await this.loadQuestions();
    const pending = q.filter((x) => x.status === "pending").length;
    const traitsSummary: Record<string, number> = {};
    for (const t of p.traits) traitsSummary[t.key] = t.value;
    const worldviewSummary: Record<string, number> = {
      openness: p.worldview.openness,
      curiosity: p.worldview.curiosity,
      pragmatism: p.worldview.pragmatism,
      idealism: p.worldview.idealism,
      skepticism: p.worldview.skepticism,
      empathy: p.worldview.empathy,
    };
    const snapshot: PersonalitySnapshot = {
      timestamp: Date.now(),
      version: p.identity.version,
      traitsSummary,
      valuesCount: p.values.length,
      worldviewSummary,
      pendingQuestions: pending,
      bioLength: p.bio.length,
    };
    await this.appendSnapshot(snapshot);
    return snapshot;
  }

  private async appendSnapshot(snapshot: PersonalitySnapshot): Promise<void> {
    const evo = await this.loadEvolution();
    evo.snapshots.push(snapshot);
    if (evo.snapshots.length > 100) {
      evo.snapshots = evo.snapshots.slice(-100);
    }
    evo.totalQuestionsAnswered += snapshot.pendingQuestions < this.lastPendingCount
      ? this.lastPendingCount - snapshot.pendingQuestions
      : 0;
    this.lastPendingCount = snapshot.pendingQuestions;
    this.evolution = evo;
    await writeJson(evolutionPath(), evo);
  }

  private lastPendingCount = 0;

  async loadEvolution(): Promise<PersonalityEvolution> {
    if (this.evolution) return this.evolution;
    const stored = await readJson<PersonalityEvolution | null>(evolutionPath(), null);
    this.evolution = stored ?? {
      snapshots: [],
      totalSessions: 0,
      totalQuestionsAnswered: 0,
      growthScore: 0,
    };
    return this.evolution;
  }

  async incrementSession(): Promise<void> {
    const evo = await this.loadEvolution();
    evo.totalSessions++;
    this.evolution = evo;
    await writeJson(evolutionPath(), evo);
  }

  async getFullState(): Promise<{
    personality: Personality;
    questions: InterviewQuestion[];
    evolution: PersonalityEvolution;
  }> {
    const [personality, questions, evolution] = await Promise.all([
      this.loadPersonality(),
      this.loadQuestions(),
      this.loadEvolution(),
    ]);
    return { personality, questions, evolution };
  }
}

export const originStore = new OriginStore();
