import { createHash } from "node:crypto";

/**
 * LRU Cache for embeddings to avoid recomputation
 * Capacity: 500 entries (~3MB RAM for 500 embeddings of 768 dimensions)
 */
export class EmbeddingCache {
  private cache: Map<string, number[]> = new Map();
  private capacity: number;

  constructor(capacity: number = 500) {
    this.capacity = capacity;
  }

  get(key: string): number[] | undefined {
    const entry = this.cache.get(key);
    if (entry === undefined) return undefined;
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry;
  }

  set(key: string, embedding: number[]): void {
    if (this.cache.size >= this.capacity) {
      // Remove oldest (first inserted)
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, embedding);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }

  /**
   * Generate a deterministic hash key from text for cache lookup
   * Uses SHA-256 truncated to first 16 bytes for speed
   */
  static hashKey(text: string): string {
    return createHash("sha256")
      .update(text)
      .digest("hex")
      .slice(0, 32);
  }
}

// Singleton instance for the embedding cache
export const embeddingCache = new EmbeddingCache(500);
