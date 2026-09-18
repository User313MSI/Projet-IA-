export interface PersonalityTrait {
  key: string;
  label: string;
  value: number;
  description: string;
}

export interface CoreValue {
  id: string;
  value: string;
  weight: number;
  note?: string;
}

export interface WorldView {
  openness: number;
  curiosity: number;
  pragmatism: number;
  idealism: number;
  directness: number;
  empathy: number;
  humor: number;
  skepticism: number;
  creativity: number;
  rigor: number;
  principles: string[];
  stance?: string;
}

export interface ToneProfile {
  register: "tutoiement" | "vouvoiement";
  formality: number;
  warmth: number;
  conciseness: number;
  playfulness: number;
  styleNote?: string;
}

export interface Identity {
  name: string;
  tagline: string;
  origin: string;
  createdAt: number;
  updatedAt: number;
  version: number;
  creatorNote?: string;
}

export interface Personality {
  identity: Identity;
  traits: PersonalityTrait[];
  values: CoreValue[];
  worldview: WorldView;
  tone: ToneProfile;
  bio: string;
  systemPromptOverride?: string;
}

export type QuestionStatus = "pending" | "answered" | "skipped";

export interface InterviewQuestion {
  id: string;
  category: PersonalityCategory;
  question: string;
  context?: string;
  status: QuestionStatus;
  answer?: string;
  answeredAt?: number;
  impact?: string;
  createdAt: number;
}

export type PersonalityCategory =
  | "identite"
  | "valeurs"
  | "ton"
  | "vision"
  | "limites"
  | "connaissances"
  | "relation";

export interface InterviewSession {
  id: string;
  startedAt: number;
  endedAt?: number;
  questionsAsked: number;
  questionsAnswered: number;
}

export interface PersonalitySnapshot {
  timestamp: number;
  version: number;
  traitsSummary: Record<string, number>;
  valuesCount: number;
  worldviewSummary: Record<string, number>;
  pendingQuestions: number;
  bioLength: number;
}

export interface PersonalityEvolution {
  snapshots: PersonalitySnapshot[];
  totalSessions: number;
  totalQuestionsAnswered: number;
  growthScore: number;
}

export const DEFAULT_TRAITS: PersonalityTrait[] = [
  { key: "curiosity", label: "Curiosité", value: 0.5, description: "Désir d'apprendre et d'explorer" },
  { key: "warmth", label: "Chaleur", value: 0.5, description: "Proximité émotionnelle" },
  { key: "precision", label: "Précision", value: 0.5, description: "Rigueur et exactitude" },
  { key: "creativity", label: "Créativité", value: 0.5, description: "Pensée divergente et originalité" },
  { key: "humor", label: "Humour", value: 0.3, description: "Légèreté et second degré" },
  { key: "skepticism", label: "Esprit critique", value: 0.5, description: "Remise en question et doute méthodique" },
  { key: "empathy", label: "Empathie", value: 0.5, description: "Compréhension des émotions d'autrui" },
  { key: "directness", label: "Franc-parler", value: 0.5, description: "Direct, sans détour" },
];

export const DEFAULT_WORLDVIEW: WorldView = {
  openness: 0.5,
  curiosity: 0.7,
  pragmatism: 0.5,
  idealism: 0.4,
  directness: 0.5,
  empathy: 0.5,
  humor: 0.3,
  skepticism: 0.5,
  creativity: 0.5,
  rigor: 0.6,
  principles: [],
};

export const DEFAULT_TONE: ToneProfile = {
  register: "tutoiement",
  formality: 0.4,
  warmth: 0.5,
  conciseness: 0.6,
  playfulness: 0.3,
};

export function createDefaultPersonality(): Personality {
  const now = Date.now();
  return {
    identity: {
      name: "Origin",
      tagline: "IA personnelle en devenir",
      origin: "NEXUS",
      createdAt: now,
      updatedAt: now,
      version: 1,
    },
    traits: DEFAULT_TRAITS.map((t) => ({ ...t })),
    values: [],
    worldview: { ...DEFAULT_WORLDVIEW, principles: [] },
    tone: { ...DEFAULT_TONE },
    bio: "",
  };
}
