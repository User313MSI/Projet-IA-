export type {
  Document,
  Chunk,
  SearchResult,
  KnowledgeStats,
  KnowledgeIndexEvent,
  IndexingProgress,
} from "./types";

export {
  DEFAULT_EMBEDDING_MODEL,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP,
  DEFAULT_TOP_K,
} from "./types";

export { EmbeddingClient } from "./embeddings";
export { embeddingCache, EmbeddingCache } from "./embedding-cache";
export {
  chunkText,
  estimateTokens,
  parseMarkdown,
  detectType,
} from "./chunking";
export {
  cosineSimilarity,
  search,
  computeStats,
  formatContext,
} from "./vector";
export { KnowledgeStore, knowledgeStore } from "./store";
export type { KnowledgeStoreOptions } from "./store";
