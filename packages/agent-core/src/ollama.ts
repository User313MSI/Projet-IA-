import type { ModelInfo } from "@ia-app/shared";
import { isLocalOllamaUrl } from "./security/safe-url";

export interface OllamaChatPart {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaChatPart[];
  stream: boolean;
  temperature?: number;
  top_p?: number;
  num_predict?: number;
  num_ctx?: number;
  num_thread?: number;
  tools?: unknown[];
}

export interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string; tool_calls?: OllamaToolCall[] };
  done: boolean;
  total_duration?: number;
}

export interface OllamaToolCall {
  function: { name: string; arguments: Record<string, unknown> };
}

export class OllamaClient {
  private baseUrl: string;
  constructor(baseUrl: string) {
    const v = isLocalOllamaUrl(baseUrl);
    if (!v.ok) {
      throw new Error(`OllamaClient: ${v.error}`);
    }
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  setBaseUrl(url: string): void {
    const v = isLocalOllamaUrl(url);
    if (!v.ok) {
      throw new Error(`OllamaClient: ${v.error}`);
    }
    this.baseUrl = url.replace(/\/+$/, "");
  }

  async listModels(): Promise<ModelInfo[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`);
    if (!res.ok) throw new Error(`Ollama listModels HTTP ${res.status}`);
    const data = (await res.json()) as {
      models: Array<{
        name: string;
        size?: number;
        details?: {
          parameter_size?: string;
          quantization_level?: string;
        };
      }>;
    };
    return (data.models ?? []).map((m) => ({
      name: m.name,
      size: m.size,
      parameterSize: m.details?.parameter_size,
      quantization: m.details?.quantization_level,
    }));
  }

  async *chat(
    req: OllamaChatRequest
  ): AsyncGenerator<string, OllamaChatResponse, void> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, stream: true }),
    });
    if (!res.ok || !res.body) {
      throw new Error(`Ollama chat HTTP ${res.status}`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let final: OllamaChatResponse | null = null;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const parsed = JSON.parse(trimmed) as OllamaChatResponse;
        if (parsed.message?.content) {
          yield parsed.message.content;
        }
        if (parsed.done) final = parsed;
      }
    }
    return (
      final ?? {
        model: req.model,
        message: { role: "assistant", content: "" },
        done: true,
      }
    );
  }

  async chatOnce(
    req: Omit<OllamaChatRequest, "stream"> & { stream?: false }
  ): Promise<OllamaChatResponse> {
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...req, stream: false }),
    });
    if (!res.ok) throw new Error(`Ollama chat HTTP ${res.status}`);
    return (await res.json()) as OllamaChatResponse;
  }

  async isReachable(): Promise<boolean> {
    try {
      const res = await fetch(`${this.baseUrl}/api/tags`, {
        signal: AbortSignal.timeout(3000),
      });
      return res.ok;
    } catch {
      return false;
    }
  }
}
