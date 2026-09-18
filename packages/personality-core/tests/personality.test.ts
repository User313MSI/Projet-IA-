import { describe, it, expect } from "vitest";
import {
  createDefaultPersonality,
  createDefaultQuestions,
  pendingQuestions,
  answeredQuestions,
  nextPendingQuestion,
  answerQuestion,
  skipQuestion,
  addCustomQuestion,
  interviewProgress,
  pendingQuestionsByCategory,
  buildPersonalityPrompt,
} from "../src/index.js";

describe("Personnalité par défaut", () => {
  it("crée une personnalité nommée Origin", () => {
    const p = createDefaultPersonality();
    expect(p.identity.name).toBe("Origin");
    expect(p.identity.origin).toBe("NEXUS");
    expect(p.traits.length).toBe(8);
    expect(p.values).toEqual([]);
    expect(p.bio).toBe("");
  });

  it("tous les traits sont entre 0 et 1", () => {
    const p = createDefaultPersonality();
    for (const t of p.traits) {
      expect(t.value).toBeGreaterThanOrEqual(0);
      expect(t.value).toBeLessThanOrEqual(1);
    }
  });
});

describe("Questions d'interview", () => {
  it("crée 16 questions par défaut, toutes pending", () => {
    const q = createDefaultQuestions();
    expect(q.length).toBe(16);
    expect(pendingQuestions(q).length).toBe(16);
    expect(answeredQuestions(q).length).toBe(0);
  });

  it("nextPendingQuestion retourne la première en attente", () => {
    const q = createDefaultQuestions();
    const next = nextPendingQuestion(q);
    expect(next).not.toBeNull();
    expect(next!.status).toBe("pending");
  });

  it("answerQuestion marque une question comme answered", () => {
    const q = createDefaultQuestions();
    const id = q[0]!.id;
    const updated = answerQuestion(q, id, "Oui, je veux qu'elle soit honnête");
    expect(updated[0]!.status).toBe("answered");
    expect(updated[0]!.answer).toBe("Oui, je veux qu'elle soit honnête");
    expect(answeredQuestions(updated).length).toBe(1);
    expect(pendingQuestions(updated).length).toBe(15);
  });

  it("skipQuestion marque une question comme skipped", () => {
    const q = createDefaultQuestions();
    const id = q[0]!.id;
    const updated = skipQuestion(q, id);
    expect(updated[0]!.status).toBe("skipped");
    expect(pendingQuestions(updated).length).toBe(15);
  });

  it("addCustomQuestion ajoute une question pending", () => {
    const q = createDefaultQuestions();
    const updated = addCustomQuestion(q, "vision", "Quel est ton but ultime ?");
    expect(updated.length).toBe(17);
    expect(updated[16]!.category).toBe("vision");
    expect(updated[16]!.status).toBe("pending");
  });

  it("interviewProgress calcule le pourcentage", () => {
    const q = createDefaultQuestions();
    expect(interviewProgress(q)).toBe(0);
    const id = q[0]!.id;
    const answered = answerQuestion(q, id, "réponse");
    expect(interviewProgress(answered)).toBe(6); // 1/16 ≈ 6%
  });

  it("pendingQuestionsByCategory regroupe par catégorie", () => {
    const q = createDefaultQuestions();
    const counts = pendingQuestionsByCategory(q);
    expect(counts.identite).toBe(2);
    expect(counts.valeurs).toBe(2);
    expect(counts.ton).toBe(3);
    expect(counts.vision).toBe(3);
    expect(counts.limites).toBe(2);
    expect(counts.connaissances).toBe(2);
    expect(counts.relation).toBe(2);
  });
});

describe("buildPersonalityPrompt", () => {
  it("génère un prompt avec le nom Origin", () => {
    const p = createDefaultPersonality();
    const q = createDefaultQuestions();
    const prompt = buildPersonalityPrompt(p, q);
    expect(prompt).toContain("Origin");
    expect(prompt).toContain("français");
  });

  it("mentionne les questions en attente", () => {
    const p = createDefaultPersonality();
    const q = createDefaultQuestions();
    const prompt = buildPersonalityPrompt(p, q);
    expect(prompt).toContain("16 question(s) en attente");
    expect(prompt).toContain("NE tire PAS de conclusions");
  });

  it("n'affiche pas l'avertissement s'il n'y a plus de questions", () => {
    const p = createDefaultPersonality();
    const q = createDefaultQuestions().map((item) => ({
      ...item,
      status: "answered" as const,
      answer: "test",
      answeredAt: Date.now(),
    }));
    const prompt = buildPersonalityPrompt(p, q);
    expect(prompt).not.toContain("en attente");
  });

  it("respecte le registre tutoiement", () => {
    const p = createDefaultPersonality();
    const q = createDefaultQuestions();
    const prompt = buildPersonalityPrompt(p, q);
    expect(prompt).toContain("Tu tutoies");
  });

  it("respecte le registre vouvoiement", () => {
    const p = createDefaultPersonality();
    p.tone.register = "vouvoiement";
    const q = createDefaultQuestions();
    const prompt = buildPersonalityPrompt(p, q);
    expect(prompt).toContain("Tu vouvoies");
  });
});
