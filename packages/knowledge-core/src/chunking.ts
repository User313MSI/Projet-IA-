import { uid } from "@ia-app/shared";
import type { Chunk } from "./types";
import {
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
} from "./types";

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function chunkText(
  text: string,
  documentId: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): Chunk[] {
  const cleanText = text.replace(/\r\n/g, "\n").replace(/\s{3,}/g, "\n\n").trim();
  if (cleanText.length === 0) return [];

  const chunks: Chunk[] = [];
  let start = 0;
  let index = 0;
  const step = chunkSize - overlap;

  while (start < cleanText.length) {
    let end = start + chunkSize;
    if (end < cleanText.length) {
      let lastSpace = cleanText.lastIndexOf(".", end);
      if (lastSpace <= start) lastSpace = cleanText.lastIndexOf(" ", end);
      if (lastSpace > start + overlap) end = lastSpace + 1;
    } else {
      end = cleanText.length;
    }
    const chunkTextSlice = cleanText.slice(start, end).trim();
    if (chunkTextSlice.length > 0) {
      chunks.push({
        id: uid("chunk"),
        documentId,
        index,
        text: chunkTextSlice,
        embedding: [],
        startChar: start,
        endChar: end,
        tokenCount: estimateTokens(chunkTextSlice),
      });
      index++;
    }
    if (end >= cleanText.length) break;
    start = start + step;
    if (start >= end) start = end;
  }

  return chunks;
}

export function parseMarkdown(text: string): string {
  return text
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`{1,3}[\s\S]*?`{1,3}/g, "")
    .replace(/\[(.+?)\]\(.+?\)/g, "$1")
    .replace(/^>\s+/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .trim();
}

export function detectType(filename: string): "pdf" | "txt" | "epub" | "markdown" | "note" {
  const lower = filename.toLowerCase();
  if (lower.endsWith(".pdf")) return "pdf";
  if (lower.endsWith(".epub")) return "epub";
  if (lower.endsWith(".md")) return "markdown";
  if (lower.endsWith(".txt")) return "txt";
  if (lower.endsWith(".note") || lower.endsWith(".json")) return "note";
  return "txt";
}
