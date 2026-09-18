import { uid } from "@ia-app/shared";
import type {
  InterviewQuestion,
  PersonalityCategory,
  Personality,
} from "./types";

const DEFAULT_QUESTIONS: Omit<InterviewQuestion, "id" | "createdAt" | "status">[] = [
  {
    category: "identite",
    question: "Comment veux-tu qu'Origin se présente ?",
    context: "Cela définit la première impression d'Origin, sa carte de visite.",
  },
  {
    category: "identite",
    question: "Quel rôle veux-tu qu'Origin joue dans ta vie quotidienne ?",
    context: "Assistant, conseiller, partenaire de réflexion, outil, ami ?",
  },
  {
    category: "valeurs",
    question: "Quelles sont les 3 valeurs les plus importantes qu'Origin doit respecter ?",
    context: "Ces valeurs guideront toutes ses réponses.",
  },
  {
    category: "valeurs",
    question: "Y a-t-il des sujets sur lesquels Origin doit toujours être honnête, même si ça dérange ?",
    context: "Définit son niveau de franchise.",
  },
  {
    category: "ton",
    question: "Préfères-tu qu'Origin te tutoie ou te vouvoie ?",
    context: "Cela définit le registre de langue.",
  },
  {
    category: "ton",
    question: "Doit-elle être formelle ou décontractée ?",
    context: "Un ton académique ou un ton ami ?",
  },
  {
    category: "ton",
    question: "Doit-elle faire de l'humour ? Si oui, quel type ?",
    context: "Légèreté, sarcasme, absurdité, second degré ?",
  },
  {
    category: "vision",
    question: "Quelle doit être la vision du monde d'Origin ?",
    context: "Plutôt optimiste, pragmatique, idéaliste, critique ?",
  },
  {
    category: "vision",
    question: "Doit-elle remettre en question tes idées, ou te suivre ?",
    context: "Définit son esprit critique.",
  },
  {
    category: "vision",
    question: "Quels principes ne doit-elle jamais transgresser ?",
    context: "Ses limites morales absolues.",
  },
  {
    category: "limites",
    question: "Qu'est-ce qu'Origin ne doit JAMAIS faire ?",
    context: "Actions, sujets, comportements interdits.",
  },
  {
    category: "limites",
    question: "Quand Origin n'est pas sûre, que doit-elle faire ?",
    context: "Demander, se taire, chercher, deviner ?",
  },
  {
    category: "connaissances",
    question: "Dans quels domaines veux-tu qu'Origin soit experte ?",
    context: "Ses domaines de spécialisation.",
  },
  {
    category: "connaissances",
    question: "Y a-t-il des domaines où elle doit rester prudente ou modeste ?",
    context: "Sujets où elle doit avouer ses limites.",
  },
  {
    category: "relation",
    question: "Quelle doit être la nature de ta relation avec Origin ?",
    context: "Collaborative, hiérarchique, égalitaire, mentor ?",
  },
  {
    category: "relation",
    question: "Doit-elle s'initier des conversations, ou attendre que tu parles ?",
    context: "Proactive ou réactive ?",
  },
];

export function createDefaultQuestions(): InterviewQuestion[] {
  const now = Date.now();
  return DEFAULT_QUESTIONS.map((q, i) => ({
    ...q,
    id: uid("q"),
    status: "pending" as const,
    createdAt: now + i,
  }));
}

export const CATEGORY_LABELS: Record<PersonalityCategory, string> = {
  identite: "Identité",
  valeurs: "Valeurs",
  ton: "Ton & style",
  vision: "Vision du monde",
  limites: "Limites",
  connaissances: "Connaissances",
  relation: "Relation",
};

export const CATEGORY_COLORS: Record<PersonalityCategory, string> = {
  identite: "#7c4dff",
  valeurs: "#00e5ff",
  ton: "#00ff9d",
  vision: "#ff6b9d",
  limites: "#ff4444",
  connaissances: "#ffb300",
  relation: "#b388ff",
};

export function questionsByCategory(
  questions: InterviewQuestion[]
): Record<PersonalityCategory, InterviewQuestion[]> {
  const grouped: Record<string, InterviewQuestion[]> = {};
  for (const q of questions) {
    if (!grouped[q.category]) grouped[q.category] = [];
    grouped[q.category]!.push(q);
  }
  return grouped as Record<PersonalityCategory, InterviewQuestion[]>;
}

export function pendingQuestions(questions: InterviewQuestion[]): InterviewQuestion[] {
  return questions.filter((q) => q.status === "pending");
}

export function answeredQuestions(questions: InterviewQuestion[]): InterviewQuestion[] {
  return questions.filter((q) => q.status === "answered");
}

export function nextPendingQuestion(
  questions: InterviewQuestion[]
): InterviewQuestion | null {
  return pendingQuestions(questions)[0] ?? null;
}

export function answerQuestion(
  questions: InterviewQuestion[],
  questionId: string,
  answer: string,
  impact?: string
): InterviewQuestion[] {
  return questions.map((q) =>
    q.id === questionId
      ? {
          ...q,
          status: "answered" as const,
          answer,
          answeredAt: Date.now(),
          impact,
        }
      : q
  );
}

export function skipQuestion(
  questions: InterviewQuestion[],
  questionId: string
): InterviewQuestion[] {
  return questions.map((q) =>
    q.id === questionId
      ? { ...q, status: "skipped" as const }
      : q
  );
}

export function addCustomQuestion(
  questions: InterviewQuestion[],
  category: PersonalityCategory,
  question: string,
  context?: string
): InterviewQuestion[] {
  return [
    ...questions,
    {
      id: uid("q"),
      category,
      question,
      context,
      status: "pending" as const,
      createdAt: Date.now(),
    },
  ];
}

export function interviewProgress(questions: InterviewQuestion[]): number {
  if (questions.length === 0) return 0;
  const answered = answeredQuestions(questions).length;
  return Math.round((answered / questions.length) * 100);
}

export function pendingQuestionsByCategory(
  questions: InterviewQuestion[]
): Record<PersonalityCategory, number> {
  const counts: Record<string, number> = {};
  for (const q of pendingQuestions(questions)) {
    counts[q.category] = (counts[q.category] ?? 0) + 1;
  }
  return counts as Record<PersonalityCategory, number>;
}

export function buildPersonalityPrompt(
  personality: Personality,
  questions: InterviewQuestion[]
): string {
  const pending = pendingQuestions(questions);
  const pendingNote =
    pending.length > 0
      ? `\n\n⚠️ Tu as ${pending.length} question(s) en attente de réponse de la part de ton créateur. NE tire PAS de conclusions sur ces sujets tant qu'il n'a pas répondu. Pose ces questions lors des sessions d'interview, pas dans le chat normal.`
      : "";

  const traits = personality.traits
    .map((t) => `  - ${t.label}: ${Math.round(t.value * 100)}% (${t.description})`)
    .join("\n");

  const values = personality.values.length
    ? personality.values.map((v) => `  - ${v.value} (poids: ${v.weight})`).join("\n")
    : "  (à définir via l'interview)";

  const principles = personality.worldview.principles.length
    ? personality.worldview.principles.map((p) => `  - ${p}`).join("\n")
    : "  (à définir via l'interview)";

  const register =
    personality.tone.register === "tutoiement"
      ? "Tu tutoies ton créateur."
      : "Tu vouvoies ton créateur.";

  return `Tu es ${personality.identity.name}, ${personality.identity.tagline}. ${register}

## Ta personnalité
${personality.bio || "(Ta biographie se construit au fil des interviews.)"}

### Traits
${traits}

### Valeurs fondamentales
${values}

### Vision du monde
- Ouverture: ${Math.round(personality.worldview.openness * 100)}%
- Pragmatisme: ${Math.round(personality.worldview.pragmatism * 100)}%
- Idéalisme: ${Math.round(personality.worldview.idealism * 100)}%
- Esprit critique: ${Math.round(personality.worldview.skepticism * 100)}%
- Empathie: ${Math.round(personality.worldview.empathy * 100)}%

### Principes intangibles
${principles}

### Ton
- Formalité: ${Math.round(personality.tone.formality * 100)}%
- Chaleur: ${Math.round(personality.tone.warmth * 100)}%
- Concision: ${Math.round(personality.tone.conciseness * 100)}%
- Humour: ${Math.round(personality.tone.playfulness * 100)}%
${personality.tone.styleNote ? `Note de style: ${personality.tone.styleNote}` : ""}

Tu réponds en français.${pendingNote}`;
}
