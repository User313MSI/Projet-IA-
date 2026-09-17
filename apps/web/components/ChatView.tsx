"use client";

import { useRef, useState, type RefObject } from "react";
import type { ChatMessage, ToolCall, ToolResult } from "@ia-app/shared";
import Markdown from "./Markdown";

export interface PendingApproval {
  approvalId: string;
  toolCall: ToolCall;
  reason: string;
}

interface Props {
  messages: ChatMessage[];
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  copiedId: string | null;
  streaming: boolean;
  activeTools: Record<string, { call: ToolCall; result?: ToolResult; running: boolean }>;
  scrollRef: RefObject<HTMLDivElement | null>;
  tokSpeed: number;
  quickPrompts: string[];
  promptHistory: string[];
  model: string;
  pendingApproval: PendingApproval | null;
  onRespondApproval: (approvalId: string, accepted: boolean) => void;
}

function MessageBubble({
  msg,
  onCopy,
  onDelete,
  copied,
}: {
  msg: ChatMessage;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  copied: boolean;
}) {
  const isUser = msg.role === "user";
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: isUser ? "flex-end" : "flex-start",
        marginBottom: "16px",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        style={{
          maxWidth: "80%",
          padding: "12px 16px",
          borderRadius: "14px",
          background: isUser
            ? "linear-gradient(135deg, rgba(124,77,255,0.2), rgba(0,229,255,0.1))"
            : "var(--bg-2)",
          border: isUser
            ? "1px solid rgba(124,77,255,0.3)"
            : "1px solid var(--border)",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "4px",
          }}
        >
          <div
            style={{
              fontSize: "10px",
              color: "var(--text-mute)",
              letterSpacing: "1px",
              textTransform: "uppercase",
            }}
          >
            {isUser ? "Vous" : "NEXUS"}
            {msg.model ? ` · ${msg.model}` : ""}
          </div>
          {hovered && (
            <div style={{ display: "flex", gap: "4px" }}>
              <button
                onClick={() => onCopy(msg.id)}
                style={{
                  fontSize: "11px",
                  color: copied ? "var(--ok)" : "var(--text-mute)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: copied ? "rgba(0,255,157,0.15)" : "var(--bg-3)",
                  transition: "all 0.2s",
                }}
                title="Copier"
              >
                {copied ? "✓ Copié" : "⧉"}
              </button>
              <button
                onClick={() => onDelete(msg.id)}
                style={{
                  fontSize: "11px",
                  color: "var(--text-mute)",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  background: "var(--bg-3)",
                }}
                title="Supprimer"
              >
                ✕
              </button>
            </div>
          )}
        </div>
        <div
          className={!isUser && msg.content === "" ? "cursor-blink" : ""}
        >
          {isUser ? (
            <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", lineHeight: 1.7 }}>
              {msg.content}
            </div>
          ) : (
            <Markdown content={msg.content || ""} />
          )}
        </div>
      </div>
    </div>
  );
}

function ToolCard({
  tool,
}: {
  tool: { call: ToolCall; result?: ToolResult; running: boolean };
}) {
  return (
    <div
      style={{
        margin: "8px 0",
        padding: "10px 12px",
        borderRadius: "10px",
        background: "rgba(0,229,255,0.05)",
        border: "1px solid var(--border)",
        fontFamily: "var(--mono)",
        fontSize: "12px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
        <span style={{ color: tool.running ? "var(--warn)" : tool.result?.ok ? "var(--ok)" : "var(--err)" }}>
          {tool.running ? "⟳" : tool.result?.ok ? "✓" : "✗"}
        </span>
        <span style={{ color: "var(--accent)", fontWeight: 600 }}>
          {tool.call.name}
        </span>
        <span style={{ color: "var(--text-mute)" }}>
          {tool.running ? "exécution…" : "terminé"}
        </span>
      </div>
      <div style={{ color: "var(--text-dim)", marginBottom: "4px" }}>
        args: {JSON.stringify(tool.call.arguments)}
      </div>
      {tool.result && (
        <div
          style={{
            color: tool.result.ok ? "var(--text)" : "var(--err)",
            background: "var(--bg-1)",
            padding: "8px",
            borderRadius: "6px",
            marginTop: "4px",
            maxHeight: "160px",
            overflow: "auto",
            whiteSpace: "pre-wrap",
          }}
        >
          {tool.result.ok ? tool.result.output : `ERREUR: ${tool.result.error}`}
        </div>
      )}
    </div>
  );
}

function ApprovalCard({
  approval,
  onRespond,
}: {
  approval: PendingApproval;
  onRespond: (approvalId: string, accepted: boolean) => void;
}) {
  const args = approval.toolCall.arguments;
  const preview =
    approval.toolCall.name === "run_command"
      ? String(args.command ?? "")
      : approval.toolCall.name === "write_file"
        ? String(args.path ?? "")
        : JSON.stringify(args);
  return (
    <div
      style={{
        margin: "12px 0",
        padding: "14px 16px",
        borderRadius: "12px",
        background: "rgba(255,180,0,0.06)",
        border: "1px solid rgba(255,180,0,0.4)",
        boxShadow: "0 0 18px rgba(255,180,0,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "8px",
        }}
      >
        <span style={{ color: "var(--warn)", fontSize: "14px" }}>⚠</span>
        <span style={{ color: "var(--warn)", fontWeight: 700, fontSize: "13px" }}>
          APPROBATION REQUISE
        </span>
      </div>
      <div style={{ fontSize: "13px", color: "var(--text)", marginBottom: "6px" }}>
        L'IA veut exécuter <b>{approval.toolCall.name}</b> — {approval.reason}
      </div>
      <div
        style={{
          fontFamily: "var(--mono)",
          fontSize: "12px",
          color: "var(--text-dim)",
          background: "var(--bg-1)",
          padding: "8px",
          borderRadius: "6px",
          marginBottom: "12px",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
          maxHeight: "120px",
          overflowY: "auto",
        }}
      >
        {preview}
      </div>
      <div style={{ display: "flex", gap: "10px" }}>
        <button
          onClick={() => onRespond(approval.approvalId, true)}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "10px",
            border: "1px solid rgba(0,255,157,0.4)",
            background: "rgba(0,255,157,0.12)",
            color: "var(--ok)",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          ✓ Accepter
        </button>
        <button
          onClick={() => onRespond(approval.approvalId, false)}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "10px",
            border: "1px solid rgba(255,80,80,0.4)",
            background: "rgba(255,80,80,0.12)",
            color: "var(--err)",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          ✕ Refuser
        </button>
      </div>
    </div>
  );
}

export default function ChatView({
  messages,
  input,
  setInput,
  onSend,
  onCopy,
  onDelete,
  copiedId,
  streaming,
  activeTools,
  scrollRef,
  tokSpeed,
  quickPrompts,
  promptHistory,
  model,
  pendingApproval,
  onRespondApproval,
}: Props) {
  const taRef = useRef<HTMLTextAreaElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
    if (e.key === "ArrowUp" && input === "") {
      e.preventDefault();
      setShowHistory(true);
    }
  };

  const toolList = Object.values(activeTools);
  const filteredHistory = promptHistory.filter(
    (p) => !input || p.toLowerCase().startsWith(input.toLowerCase())
  );

  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "var(--bg-0)",
        position: "relative",
      }}
    >
      <div
        style={{
          padding: "8px 24px",
          borderBottom: "1px solid var(--border)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ fontSize: "11px", color: "var(--text-mute)", fontFamily: "var(--mono)" }}>
          ◈ {model}
        </div>
        {streaming && tokSpeed > 0 && (
          <div
            style={{
              fontSize: "11px",
              color: "var(--accent)",
              fontFamily: "var(--mono)",
              display: "flex",
              alignItems: "center",
              gap: "6px",
            }}
          >
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--accent)", animation: "blink 1s infinite" }} />
            {tokSpeed} tok/s
          </div>
        )}
      </div>

      <div
        ref={scrollRef}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px",
          maxWidth: "920px",
          width: "100%",
          margin: "0 auto",
        }}
      >
        {messages.length === 0 && (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: "24px",
              color: "var(--text-mute)",
            }}
          >
            <div
              style={{
                fontSize: "48px",
                background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                fontWeight: 800,
              }}
            >
              ◈ NEXUS
            </div>
            <div style={{ fontSize: "14px" }}>Votre IA locale est prête. Posez une question pour commencer.</div>
            {quickPrompts.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", maxWidth: "600px" }}>
                {quickPrompts.map((p) => (
                  <button
                    key={p}
                    onClick={() => setInput(p)}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "20px",
                      background: "var(--bg-2)",
                      border: "1px solid var(--border)",
                      color: "var(--text-dim)",
                      fontSize: "12px",
                      transition: "all 0.15s",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((m) => (
          <div key={m.id} className="msg-enter">
            <MessageBubble
              msg={m}
              onCopy={onCopy}
              onDelete={onDelete}
              copied={copiedId === m.id}
            />
          </div>
        ))}

        {streaming && (
          <div className="loading-dots" style={{ textAlign: "center", padding: "12px", color: "var(--accent)", fontSize: "20px" }}>
            <span>●</span> <span>●</span> <span>●</span>
          </div>
        )}

        {pendingApproval && (
          <ApprovalCard
            approval={pendingApproval}
            onRespond={onRespondApproval}
          />
        )}

        {toolList.length > 0 && (
          <div style={{ margin: "16px 0" }}>
            <div
              style={{
                fontSize: "10px",
                color: "var(--text-mute)",
                marginBottom: "8px",
                letterSpacing: "2px",
              }}
            >
              OUTILS EN COURS
            </div>
            {toolList.map((t) => (
              <ToolCard key={t.call.id} tool={t} />
            ))}
          </div>
        )}
      </div>

      {streaming && (
        <div style={{ maxWidth: "920px", width: "100%", margin: "0 auto", padding: "0 32px" }}>
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: "100%" }} />
          </div>
        </div>
      )}

      <div
        style={{
          padding: "16px 32px 20px",
          maxWidth: "920px",
          width: "100%",
          margin: "0 auto",
          position: "relative",
        }}
      >
        {showHistory && filteredHistory.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "100%",
              left: "32px",
              right: "32px",
              background: "var(--bg-2)",
              border: "1px solid var(--border-strong)",
              borderRadius: "12px",
              padding: "8px",
              marginBottom: "4px",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: "10px", color: "var(--text-mute)", padding: "4px 8px", marginBottom: "4px" }}>
              HISTORIQUE (↑ pour naviguer)
            </div>
            {filteredHistory.map((p, i) => (
              <div
                key={i}
                onClick={() => {
                  setInput(p);
                  setShowHistory(false);
                }}
                style={{
                  padding: "8px 10px",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "13px",
                  color: "var(--text-dim)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-3)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                }}
              >
                {p}
              </div>
            ))}
          </div>
        )}

        <div
          style={{
            display: "flex",
            gap: "12px",
            background: "var(--bg-2)",
            border: "1px solid var(--border-strong)",
            borderRadius: "16px",
            padding: "8px",
            boxShadow: streaming ? "0 0 20px rgba(0,229,255,0.15)" : "none",
            transition: "box-shadow 0.3s",
          }}
        >
          <textarea
            ref={taRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Envoyez un message… (Entrée pour envoyer, Maj+Entrée pour saut de ligne, ↑ pour l'historique)"
            rows={1}
            style={{
              flex: 1,
              background: "transparent",
              border: "none",
              outline: "none",
              resize: "none",
              padding: "10px 12px",
              fontSize: "1em",
              fontFamily: "var(--sans)",
              minHeight: "44px",
              maxHeight: "160px",
              color: "var(--text)",
            }}
          />
          <button
            onClick={onSend}
            disabled={streaming || !input.trim()}
            style={{
              alignSelf: "flex-end",
              padding: "10px 20px",
              borderRadius: "12px",
              background: streaming
                ? "var(--bg-3)"
                : "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: streaming ? "var(--text-mute)" : "#000",
              fontWeight: 700,
              fontSize: "14px",
              opacity: streaming || !input.trim() ? 0.5 : 1,
              transition: "all 0.2s",
            }}
          >
            {streaming ? "…" : "→"}
          </button>
        </div>
        <div
          style={{
            textAlign: "center",
            fontSize: "10px",
            color: "var(--text-mute)",
            marginTop: "8px",
            letterSpacing: "1px",
          }}
        >
          AGENT AUTONOME · 100% LOCAL · ZÉRO CLOUD
        </div>
      </div>
    </main>
  );
}
