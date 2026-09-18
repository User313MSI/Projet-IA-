export type Role = "user" | "assistant" | "system" | "tool";

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ToolResult {
  callId: string;
  name: string;
  ok: boolean;
  output: string;
  error?: string;
}

export interface MessagePart {
  type: "text" | "tool_call" | "tool_result";
  text?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  parts?: MessagePart[];
  createdAt: number;
  model?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
  model: string;
}

export interface ModelInfo {
  name: string;
  size?: number;
  parameterSize?: string;
  quantization?: string;
}

export type Theme = "nexus" | "ocean" | "sunset" | "forest";

export interface Settings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
  ollamaUrl: string;
  theme: Theme;
  fontSize: number;
  /**
   * Mode power user : autorise l'exécution de commandes hors liste blanche
   * (toujours avec approbation utilisateur explicite). Les commandes
   * destructrices (rm -rf, curl, sudo…) restent interdites dans tous les cas.
   * Désactivé par défaut.
   */
  powerUser: boolean;

  /**
   * Mode rapide : définitions d'outils compactes + historique réduit pour
   * accélérer l'évaluation du prompt sur CPU (la définition complète des
   * outils coûte plusieurs secondes de prompt eval à chaque message).
   * Activé par défaut.
   */
  fastMode: boolean;
}

export const DEFAULT_SETTINGS: Settings = {
  model: "qwen2.5:7b",
  temperature: 0.6,
  topP: 0.85,
  maxTokens: 2048,
  systemPrompt:
    "Tu es NEXUS, un assistant IA local. Réponds en français. SOIS BREF : 3 phrases maximum par défaut, va droit au but, pas d'introduction ni de conclusion inutile. Développe uniquement si on te le demande explicitement. Utilise les outils disponibles quand ils t'aident à répondre.",
  ollamaUrl: "http://127.0.0.1:11434",
  theme: "nexus",
  fontSize: 15,
  powerUser: false,
  fastMode: true,
};

export interface AgentStreamEvent {
  type:
    | "token"
    | "tool_call"
    | "tool_result"
    | "step"
    | "done"
    | "error"
    | "approval_required";
  token?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  step?: number;
  message?: string;
  finalMessage?: ChatMessage;
  /** Identifiant de la demande d'approbation (pour corréler la réponse client). */
  approvalId?: string;
  /** Pourquoi l'approbation est demandée (ex: « commande hors allowlist »). */
  reason?: string;
}

export { uid, nowMs, truncate } from "./utils";
