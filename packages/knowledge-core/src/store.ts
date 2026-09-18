import { promises as fs } from "node:fs";
import path from "node:path";
import os from "node:os";
import { uid } from "@ia-app/shared";
import type {
  Document,
  Chunk,
  SearchResult,
  KnowledgeStats,
  KnowledgeIndexEvent,
  IndexingProgress,
} from "./types";
import { chunkText, detectType, parseMarkdown } from "./chunking";
import { EmbeddingClient } from "./embeddings";
import { search as vectorSearch, computeStats, formatContext } from "./vector";

const STORE_DIR = path.join(os.homedir(), ".ia-app", "origin", "knowledge");
const DOCS_FILE = path.join(STORE_DIR, "documents.json");
const CHUNKS_FILE = path.join(STORE_DIR, "chunks.json");

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

export interface KnowledgeStoreOptions {
  ollamaUrl?: string;
  embeddingModel?: string;
  chunkSize?: number;
  chunkOverlap?: number;
}

export class KnowledgeStore {
  private documents: Map<string, Document> = new Map();
  private chunks: Chunk[] = [];
  private embeddingClient: EmbeddingClient;
  private chunkSize: number;
  private chunkOverlap: number;
  private loaded = false;

  constructor(opts: KnowledgeStoreOptions = {}) {
    this.embeddingClient = new EmbeddingClient(
      opts.ollamaUrl ?? "http://127.0.0.1:11434",
      opts.embeddingModel ?? "nomic-embed-text"
    );
    this.chunkSize = opts.chunkSize ?? 512;
    this.chunkOverlap = opts.chunkOverlap ?? 64;
  }

  setOllamaUrl(url: string): void {
    this.embeddingClient.setBaseUrl(url);
  }

  async load(): Promise<void> {
    if (this.loaded) return;
    const docs = await readJson<Document[]>(DOCS_FILE, []);
    const chunks = await readJson<Chunk[]>(CHUNKS_FILE, []);
    this.documents = new Map(docs.map((d) => [d.id, d]));
    this.chunks = chunks;
    this.loaded = true;
  }

  async save(): Promise<void> {
    const docs = Array.from(this.documents.values());
    await writeJson(DOCS_FILE, docs);
    await writeJson(CHUNKS_FILE, this.chunks);
  }

  listDocuments(): Document[] {
    return Array.from(this.documents.values()).sort(
      (a, b) => b.addedAt - a.addedAt
    );
  }

  getDocument(id: string): Document | undefined {
    return this.documents.get(id);
  }

  getChunksForDocument(documentId: string): Chunk[] {
    return this.chunks.filter((c) => c.documentId === documentId);
  }

  async addTextDocument(
    title: string,
    source: string,
    text: string,
    type: Document["type"] = "txt",
    tags?: string[],
    onProgress?: (p: IndexingProgress) => void
  ): Promise<Document> {
    await this.load();
    const docId = uid("doc");
    const cleanText = type === "markdown" ? parseMarkdown(text) : text;
    const newChunks = chunkText(cleanText, docId, this.chunkSize, this.chunkOverlap);

    const doc: Document = {
      id: docId,
      title,
      source,
      type,
      addedAt: Date.now(),
      chunkCount: newChunks.length,
      totalChars: cleanText.length,
      tags,
    };
    this.documents.set(docId, doc);

    for (let i = 0; i < newChunks.length; i++) {
      const chunk = newChunks[i]!;
      try {
        const embedding = await this.embeddingClient.embed(chunk.text);
        chunk.embedding = embedding;
      } catch (e) {
        chunk.embedding = [];
      }
      this.chunks.push(chunk);
      if (onProgress) {
        onProgress({
          documentId: docId,
          title,
          currentChunk: i + 1,
          totalChunks: newChunks.length,
          progress: Math.round(((i + 1) / newChunks.length) * 100),
        });
      }
    }

    await this.save();
    return doc;
  }

  async addFile(
    filePath: string,
    title?: string,
    onProgress?: (p: IndexingProgress) => void
  ): Promise<Document> {
    const content = await fs.readFile(filePath, "utf8");
    const basename = path.basename(filePath);
    const type = detectType(basename);
    const finalTitle = title ?? basename;
    return this.addTextDocument(finalTitle, filePath, content, type, undefined, onProgress);
  }

  async deleteDocument(id: string): Promise<void> {
    await this.load();
    this.documents.delete(id);
    this.chunks = this.chunks.filter((c) => c.documentId !== id);
    await this.save();
  }

  async query(
    query: string,
    topK: number = 5
  ): Promise<SearchResult[]> {
    await this.load();
    if (this.chunks.length === 0) return [];
    let queryEmbedding: number[];
    try {
      queryEmbedding = await this.embeddingClient.embed(query);
    } catch {
      return [];
    }
    return vectorSearch(queryEmbedding, this.chunks, this.documents, topK);
  }

  async queryWithContext(
    query: string,
    topK: number = 5
  ): Promise<{ results: SearchResult[]; context: string }> {
    const results = await this.query(query, topK);
    const context = formatContext(results);
    return { results, context };
  }

  getStats(): KnowledgeStats {
    const embeddingDim =
      this.chunks.find((c) => c.embedding.length > 0)?.embedding.length ?? 0;
    return computeStats(this.documents, this.chunks, embeddingDim);
  }

  async isEmbeddingReachable(): Promise<boolean> {
    return this.embeddingClient.isReachable();
  }
}

export const knowledgeStore = new KnowledgeStore();
