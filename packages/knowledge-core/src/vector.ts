import type {
  Chunk,
  SearchResult,
  Document,
  KnowledgeStats,
} from "./types";

function dotProduct(a: number[], b: number[]): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    sum += a[i]! * b[i]!;
  }
  return sum;
}

function magnitude(a: number[]): number {
  let sum = 0;
  for (const v of a) sum += v * v;
  return Math.sqrt(sum);
}

export function cosineSimilarity(a: number[], b: number[]): number {
  const ma = magnitude(a);
  const mb = magnitude(b);
  if (ma === 0 || mb === 0) return 0;
  return dotProduct(a, b) / (ma * mb);
}

export function search(
  queryEmbedding: number[],
  chunks: Chunk[],
  documents: Map<string, Document>,
  topK: number = 5
): SearchResult[] {
  const scored: SearchResult[] = [];
  for (const chunk of chunks) {
    if (chunk.embedding.length === 0) continue;
    const score = cosineSimilarity(queryEmbedding, chunk.embedding);
    const doc = documents.get(chunk.documentId);
    if (doc) {
      scored.push({ chunk, document: doc, score });
    }
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

export function computeStats(
  documents: Map<string, Document>,
  chunks: Chunk[],
  embeddingDim: number
): KnowledgeStats {
  const byType: Record<string, number> = {};
  let totalChars = 0;
  for (const doc of documents.values()) {
    byType[doc.type] = (byType[doc.type] ?? 0) + 1;
    totalChars += doc.totalChars;
  }
  return {
    totalDocuments: documents.size,
    totalChunks: chunks.length,
    totalChars,
    embeddingDim,
    lastUpdated: Date.now(),
    documentsByType: byType,
  };
}

export function formatContext(results: SearchResult[]): string {
  if (results.length === 0) return "";
  const parts: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const r = results[i]!;
    parts.push(
      `[Source ${i + 1}: ${r.document.title} (score: ${r.score.toFixed(3)})]\n${r.chunk.text}`
    );
  }
  return parts.join("\n\n---\n\n");
}
