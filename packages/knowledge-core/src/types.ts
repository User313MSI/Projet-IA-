export interface Document {
  id: string;
  title: string;
  source: string;
  type: "pdf" | "txt" | "epub" | "markdown" | "note" | "web";
  addedAt: number;
  chunkCount: number;
  totalChars: number;
  tags?: string[];
}

export interface Chunk {
  id: string;
  documentId: string;
  index: number;
  text: string;
  embedding: number[];
  startChar: number;
  endChar: number;
  tokenCount: number;
}

export interface SearchResult {
  chunk: Chunk;
  document: Document;
  score: number;
}

export interface KnowledgeStats {
  totalDocuments: number;
  totalChunks: number;
  totalChars: number;
  embeddingDim: number;
  lastUpdated: number;
  documentsByType: Record<string, number>;
}

export interface KnowledgeIndexEvent {
  type: "document_added" | "chunk_indexed" | "document_complete" | "error";
  documentId?: string;
  documentTitle?: string;
  chunkIndex?: number;
  totalChunks?: number;
  message?: string;
}

export type IndexingProgress = {
  documentId: string;
  title: string;
  currentChunk: number;
  totalChunks: number;
  progress: number;
};

export const DEFAULT_EMBEDDING_MODEL = "nomic-embed-text";
export const DEFAULT_CHUNK_SIZE = 512;
export const DEFAULT_CHUNK_OVERLAP = 64;
export const DEFAULT_TOP_K = 5;
