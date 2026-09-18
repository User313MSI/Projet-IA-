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
    context: "Cela definit la premiere impression d'Origin, sa carte de visite.",
  },
  {
    category: "identite",
    question: "Quel role veux-tu qu'Origin joue dans ta vie quotidienne ?",
    context: "Assistant, conseiller, partenaire de reflexion, outil, ami ?",
  },
  {
    category: "valeurs",
    question: "Quelles sont les 3 valeurs les plus importantes qu'Origin doit respecter ?",
    context: "Ces valeurs guideront toutes ses reponses.",
  },
  {
    category: "valeurs",
    question: "Y a-t-il des sujets sur lesquels Origin doit toujours etre honnete, meme si ca derange ?",
    context: "Definit son niveau de franchise.",
  },
  {
    category: "ton",
    question: "Preferes-tu qu'Origin te tutoie ou te vouvoie ?",
    context: "Cela definit le registre de langue.",
  },
  {
    category: "ton",
    question: "Doit-elle etre formelle ou detendue ?",
    context: "Un ton academique ou un ton ami ?",
  },
  {
    category: "ton",
    question: "Doit-elle faire de l'humour ? Si oui, quel type ?",
    context: "Legere, sarcasme, absurdite, second degre ?",
  },
  {
    category: "vision",
    question: "Quelle doit etre la vision du monde d'Origin ?",
    context: "Plutot optimiste, pragmatique, idealiste, critique ?",
  },
  {
    category: "vision",
    question: "Doit-elle remettre en question tes idees, ou te suivre ?",
    context: "Definit son esprit critique.",
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
    question: "Quand Origin n'est pas sure, que doit-elle faire ?",
    context: "Demander, se taire, chercher, deviner ?",
  },
  {
    category: "connaissances",
    question: "Dans quels domaines veux-tu qu'Origin soit experte ?",
    context: "Ses domaines de specialisation.",
  },
  {
    category: "connaissances",
    question: "Y a-t-il des domaines ou elle doit rester prudente ou modeste ?",
    context: "Sujets ou elle doit avouer ses limites.",
  },
  {
    category: "relation",
    question: "Quelle doit etre la nature de ta relation avec Origin ?",
    context: "Collaborative, hierarchique, egalitaire, mentor ?",
  },
  {
    category: "relation",
    question: "Doit-elle s'initier des conversations, ou attendre que tu parles ?",
    context: "Proactive ou reactive ?",
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
  identite: "Identite",
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
      ? `\n\n\u26a0\ufe0f Tu as ${pending.length} question(s) en attente. NE tire PAS de conclusions sur ces sujets. Pose ces questions lors des sessions d'interview.`
      : "";

  const traits = personality.traits
    .map((t) => `${t.label}:${Math.round(t.value * 100)}%`)
    .join(", ");

  const values = personality.values.length
    ? personality.values.map((v) => `${v.value}(w:${v.weight})`).join(", ")
    : "";

  const principles = personality.worldview.principles.length
    ? personality.worldview.principles.join(", ")
    : "";

  const register =
    personality.tone.register === "tutoiement"
      ? "Tu tutoies ton createur."
      : "Tu vouvoies ton createur.";

  return `Tu es ${personality.identity.name} (${personality.identity.tagline}). ${register}\n\nPersonnalite: ${personality.bio || "En construction via interviews."}\n\nTraits: ${traits}\nValeurs: ${values}\nVision: O:${Math.round(personality.worldview.openness * 100)}% P:${Math.round(personality.worldview.pragmatism * 100)}% I:${Math.round(personality.worldview.idealism * 100)}% S:${Math.round(personality.worldview.skepticism * 100)}% E:${Math.round(personality.worldview.empathy * 100)}%\nPrincipes: ${principles}\n\nTon: F:${Math.round(personality.tone.formality * 100)}% C:${Math.round(personality.tone.warmth * 100)}% K:${Math.round(personality.tone.conciseness * 100)}% H:${Math.round(personality.tone.playfulness * 100)}%${personality.tone.styleNote ? ` [${personality.tone.styleNote}]` : ""}\n\nReponds en francais.${pendingNote}`;
}
