import { DEFAULT_EMBEDDING_MODEL } from "./types";
import { embeddingCache, EmbeddingCache } from "./embedding-cache";

export interface EmbeddingResponse {
  embedding: number[];
}

export class EmbeddingClient {
  private baseUrl: string;
  private model: string;

  constructor(baseUrl: string = "http://127.0.0.1:11434", model: string = DEFAULT_EMBEDDING_MODEL) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.model = model;
  }

  setBaseUrl(url: string): void {
    this.baseUrl = url.replace(/\/$/, "");
  }

  setModel(model: string): void {
    this.model = model;
  }

  async embed(text: string): Promise<number[]> {
    const cacheKey = EmbeddingCache.hashKey(text);
    const cached = embeddingCache.get(cacheKey);
    if (cached) return cached;

    const res = await fetch(`${this.baseUrl}/api/embeddings`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: this.model, prompt: text }),
      signal: AbortSignal.timeout(60000),
    });
    if (!res.ok) {
      throw new Error(`Embedding API HTTP ${res.status}: ${await res.text().catch(() => "")}`);
    }
    const data = (await res.json()) as EmbeddingResponse;
    if (!data.embedding || !Array.isArray(data.embedding)) {
      throw new Error("Réponse embedding invalide");
    }
    embeddingCache.set(cacheKey, data.embedding);
    return data.embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map((t) => this.embed(t)));
  }

  async isReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(5000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
