import type {
  ChatMessage,
  AgentStreamEvent,
  Settings,
  ToolCall,
  ToolResult,
} from "@ia-app/shared";
import { uid } from "@ia-app/shared";
import { OllamaClient } from "./ollama";
import {
  ToolRegistry,
  makeContext,
  type ToolContext,
} from "./tools";
import { createDefaultTools } from "./default-tools";
import { createAdvancedTools } from "./advanced-tools";
import { sanitizeExternalContent } from "./security/sanitize";
import { classifyCommand, makeCommandPolicy } from "./security/safe-command";

export interface AgentOptions {
  settings: Settings;
  tools?: ToolRegistry;
  cwd?: string;
  maxSteps?: number;
  onEvent?: (event: AgentStreamEvent) => void;
  /** Mode power user (commandes hors allowlist avec approbation). */
  powerUser?: boolean;
  /**
   * Handler d'approbation pour les actions sensibles. Quand un outil demande
   * une approbation, l'agent émet un événement `approval_required` (pour que
   * l'UI affiche une carte), puis attend la résolution via ce handler.
   * Si absent → toute action sensible est refusée.
   */
  approve?: (call: ToolCall) => Promise<boolean>;
}

function buildOllamaMessages(
  history: ChatMessage[],
  systemPrompt: string
) {
  const messages: {
    role: "system" | "user" | "assistant" | "tool";
    content: string;
  }[] = [{ role: "system", content: systemPrompt }];
  for (const m of history) {
    if (m.role === "system") continue;
    if (m.role === "tool") {
      const result =
        m.parts?.find((p) => p.type === "tool_result")?.toolResult;
      let content: string;
      if (result) {
        // Les résultats des outils externes (web, météo) sont assainis avant
        // réinjection dans le contexte du LLM (atténuation prompt injection).
        const raw = JSON.stringify({
          ok: result.ok,
          output: result.output,
          error: result.error,
        });
        const external = isExternalTool(result.name);
        content = external
          ? sanitizeExternalContent(raw).content
          : raw;
      } else {
        content = m.content;
      }
      messages.push({ role: "tool", content });
    } else {
      messages.push({ role: m.role, content: m.content });
    }
  }
  return messages;
}

function isExternalTool(name: string): boolean {
  return name === "web_search" || name === "weather";
}

export class Agent {
  private ollama: OllamaClient;
  private tools: ToolRegistry;
  private ctx: ToolContext;
  private maxSteps: number;

  constructor(private opts: AgentOptions) {
    this.ollama = new OllamaClient(opts.settings.ollamaUrl);
    this.tools = opts.tools ?? new ToolRegistry();
    if (!opts.tools) {
      for (const t of createDefaultTools()) this.tools.register(t);
      for (const t of createAdvancedTools()) this.tools.register(t);
    }
    const powerUser = opts.powerUser ?? opts.settings.powerUser ?? false;
    this.ctx = makeContext(opts.cwd ?? process.cwd(), {
      commandPolicy: makeCommandPolicy(powerUser),
      approve: opts.approve
        ? (call: ToolCall) => opts.approve!(call)
        : undefined,
    });
    this.maxSteps = opts.maxSteps ?? 8;
  }

  setSettings(settings: Settings): void {
    this.ollama.setBaseUrl(settings.ollamaUrl);
    this.opts.settings = settings;
  }

  async *run(history: ChatMessage[]): AsyncGenerator<AgentStreamEvent> {
    const { settings, onEvent } = this.opts;
    const emit = (e: AgentStreamEvent) => {
      onEvent?.(e);
      return e;
    };

    const toolDefs = this.tools.definitions();
    let step = 0;
    const workingHistory = [...history];

    while (step < this.maxSteps) {
      step++;
      emit({ type: "step", step });
      const messages = buildOllamaMessages(workingHistory, settings.systemPrompt);
      let assistantText = "";
      let assistantResponse;

      try {
        const gen = this.ollama.chat({
          model: settings.model,
          messages,
          stream: true,
          temperature: settings.temperature,
          top_p: settings.topP,
          num_predict: settings.maxTokens,
          num_ctx: 4096,
          num_thread: 8,
          tools: toolDefs.length
            ? toolDefs.map((t) => ({
                type: "function",
                function: {
                  name: t.name,
                  description: t.description,
                  parameters: t.parameters,
                },
              }))
            : undefined,
        });
        for await (const tok of gen) {
          assistantText += tok;
          emit({ type: "token", token: tok });
        }
        assistantResponse = await gen.next();
        if (assistantResponse.done) {
          assistantResponse = assistantResponse.value;
        }
      } catch (e) {
        yield emit({
          type: "error",
          message: e instanceof Error ? e.message : String(e),
        });
        return;
      }

      const finalResp = assistantResponse as {
        message?: {
          tool_calls?: {
            function: { name: string; arguments: Record<string, unknown> };
          }[];
        };
      };
      const toolCalls = finalResp?.message?.tool_calls ?? [];

      if (!toolCalls.length) {
        const finalMessage: ChatMessage = {
          id: uid("msg"),
          role: "assistant",
          content: assistantText,
          createdAt: Date.now(),
          model: settings.model,
        };
        yield emit({ type: "done", finalMessage });
        return;
      }

      const assistantMsg: ChatMessage = {
        id: uid("msg"),
        role: "assistant",
        content: assistantText,
        parts: toolCalls.map((tc) => ({
          type: "tool_call" as const,
          toolCall: {
            id: uid("call"),
            name: tc.function.name,
            arguments: tc.function.arguments,
          },
        })),
        createdAt: Date.now(),
        model: settings.model,
      };
      workingHistory.push(assistantMsg);
      yield emit({ type: "token", token: "" });

      for (const tc of toolCalls) {
        const call: ToolCall = {
          id: uid("call"),
          name: tc.function.name,
          arguments: tc.function.arguments,
        };
        yield emit({ type: "tool_call", toolCall: call });

        // Notifier l'UI avant l'évaluation de l'approbation : si l'outil va
        // demander une approbation, on émet approval_required (le handler
        // `approve` est responsable d'émettre l'événement et d'attendre la
        // réponse client via /api/approve).
        const willRequestApproval = await this.toolNeedsApproval(call);
        if (willRequestApproval) {
          yield emit({
            type: "approval_required",
            approvalId: call.id,
            toolCall: call,
            reason: approvalReason(call),
          });
        }

        const result: ToolResult = await this.tools.execute(call, this.ctx);
        yield emit({ type: "tool_result", toolResult: result });
        workingHistory.push({
          id: uid("msg"),
          role: "tool",
          content: "",
          parts: [{ type: "tool_result", toolResult: result }],
          createdAt: Date.now(),
        });
      }
    }

    yield emit({
      type: "error",
      message: `Limite de ${this.maxSteps} étapes atteinte sans réponse finale.`,
    });
  }

  /**
   * Détermine si un appel d'outil va déclencher une demande d'approbation,
   * afin d'émettre l'événement `approval_required` avant l'exécution.
   */
  async toolNeedsApproval(call: ToolCall): Promise<boolean> {
    if (!this.opts.approve) return false;
    if (call.name === "write_file") return true;
    if (call.name === "run_command") {
      const cmd = String(call.arguments.command ?? "");
      const verdict = classifyCommand(cmd, this.ctx.commandPolicy);
      return verdict.allowed && (verdict as { needsApproval?: boolean }).needsApproval === true;
    }
    return false;
  }
}

function approvalReason(call: ToolCall): string {
  if (call.name === "write_file") return "écriture de fichier";
  if (call.name === "run_command") return "commande hors allowlist (mode power user)";
  return "action sensible";
}
