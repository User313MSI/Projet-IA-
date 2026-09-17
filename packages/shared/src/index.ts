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

export interface Settings {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  systemPrompt: string;
  ollamaUrl: string;
}

export const DEFAULT_SETTINGS: Settings = {
  model: "qwen2.5:14b",
  temperature: 0.7,
  topP: 0.9,
  maxTokens: 4096,
  systemPrompt:
    "Tu es un assistant IA local autonome. Tu réfléchis étape par étape, tu utilises les outils disponibles quand c'est utile, tu réponds en français de manière claire et directe.",
  ollamaUrl: "http://127.0.0.1:11434",
};

export interface AgentStreamEvent {
  type:
    | "token"
    | "tool_call"
    | "tool_result"
    | "step"
    | "done"
    | "error";
  token?: string;
  toolCall?: ToolCall;
  toolResult?: ToolResult;
  step?: number;
  message?: string;
  finalMessage?: ChatMessage;
}

export { uid, nowMs, truncate } from "./utils";
