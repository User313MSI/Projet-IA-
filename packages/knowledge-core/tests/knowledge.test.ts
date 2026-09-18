import { describe, it, expect } from "vitest";
import {
  chunkText,
  estimateTokens,
  detectType,
  parseMarkdown,
  cosineSimilarity,
  formatContext,
} from "../src/index.js";
import type { Chunk, Document, SearchResult } from "../src/types";

describe("chunkText", () => {
  it("découpe un texte long en plusieurs chunks", () => {
    const longText = "Ceci est une phrase. ".repeat(100);
    const chunks = chunkText(longText, "doc1", 200, 50);
    expect(chunks.length).toBeGreaterThan(1);
    for (const c of chunks) {
      expect(c.documentId).toBe("doc1");
      expect(c.text.length).toBeGreaterThan(0);
      expect(c.embedding).toEqual([]);
    }
  });

  it("retourne un seul chunk pour un texte court", () => {
    const shortText = "Ceci est court.";
    const chunks = chunkText(shortText, "doc1");
    expect(chunks.length).toBe(1);
    expect(chunks[0]!.text).toContain("Ceci est court");
  });

  it("retourne un tableau vide pour un texte vide", () => {
    const chunks = chunkText("", "doc1");
    expect(chunks).toEqual([]);
  });

  it("les chunks ont des index incrémentaux", () => {
    const longText = "Phrase numéro un. ".repeat(50);
    const chunks = chunkText(longText, "doc1", 100, 20);
    for (let i = 0; i < chunks.length; i++) {
      expect(chunks[i]!.index).toBe(i);
    }
  });
});

describe("estimateTokens", () => {
  it("estime ~1 token pour 4 caractères", () => {
    expect(estimateTokens("abcd")).toBe(1);
    expect(estimateTokens("abcdefgh")).toBe(2);
  });
});

describe("detectType", () => {
  it("détecte les types de fichiers", () => {
    expect(detectType("livre.pdf")).toBe("pdf");
    expect(detectType("notes.epub")).toBe("epub");
    expect(detectType("README.md")).toBe("markdown");
    expect(detectType("fichier.txt")).toBe("txt");
    expect(detectType("data.json")).toBe("note");
    expect(detectType("fichier.inconnu")).toBe("txt");
  });
});

describe("parseMarkdown", () => {
  it("supprime le markdown et garde le texte", () => {
    const md = "# Titre\n\n**Gras** et *italique*.\n\n- Liste\n- Items";
    const text = parseMarkdown(md);
    expect(text).not.toContain("#");
    expect(text).not.toContain("**");
    expect(text).toContain("Titre");
    expect(text).toContain("Gras");
  });
});

describe("cosineSimilarity", () => {
  it("retourne 1 pour des vecteurs identiques", () => {
    const a = [1, 2, 3];
    const b = [1, 2, 3];
    expect(cosineSimilarity(a, b)).toBeCloseTo(1, 5);
  });

  it("retourne 0 pour des vecteurs orthogonaux", () => {
    const a = [1, 0];
    const b = [0, 1];
    expect(cosineSimilarity(a, b)).toBeCloseTo(0, 5);
  });

  it("retourne 0 pour un vecteur nul", () => {
    expect(cosineSimilarity([0, 0], [1, 2])).toBe(0);
  });
});

describe("formatContext", () => {
  it("formate les résultats de recherche", () => {
    const doc: Document = {
      id: "d1",
      title: "Mon Livre",
      source: "livre.txt",
      type: "txt",
      addedAt: Date.now(),
      chunkCount: 1,
      totalChars: 100,
    };
    const chunk: Chunk = {
      id: "c1",
      documentId: "d1",
      index: 0,
      text: "Ceci est un passage important.",
      embedding: [0.5, 0.5],
      startChar: 0,
      endChar: 30,
      tokenCount: 8,
    };
    const results: SearchResult[] = [
      { chunk, document: doc, score: 0.85 },
    ];
    const ctx = formatContext(results);
    expect(ctx).toContain("Mon Livre");
    expect(ctx).toContain("Ceci est un passage important");
    expect(ctx).toContain("0.850");
  });

  it("retourne une chaîne vide sans résultats", () => {
    expect(formatContext([])).toBe("");
  });
});
