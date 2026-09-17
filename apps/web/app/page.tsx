"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type {
  ChatMessage,
  Conversation,
  Settings,
  ToolCall,
  ToolResult,
} from "@ia-app/shared";
import { uid } from "@ia-app/shared";
import ChatView from "../components/ChatView";
import Sidebar from "../components/Sidebar";
import SettingsPanel from "../components/SettingsPanel";
import ThemeApplier from "../components/ThemeApplier";

const QUICK_PROMPTS = [
  "Bonjour, qui es-tu ?",
  "Quelles sont mes infos système ?",
  "Météo à Paris",
  "Recherche le site officiel de Next.js",
  "Calcule 15% de 245",
  "Liste les fichiers du dossier courant",
];

export default function Page() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [activeTools, setActiveTools] = useState<
    Record<string, { call: ToolCall; result?: ToolResult; running: boolean }>
  >({});
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState<Settings | null>(null);
  const [reachable, setReachable] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [promptHistory, setPromptHistory] = useState<string[]>([]);
  const [tokSpeed, setTokSpeed] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const loadConversations = useCallback(async () => {
    const res = await fetch("/api/conversations");
    const data = await res.json();
    setConversations(data);
  }, []);

  const loadSettings = useCallback(async () => {
    const res = await fetch("/api/settings");
    const data = await res.json();
    setSettings(data.settings);
    setReachable(data.reachable);
  }, []);

  useEffect(() => {
    loadConversations();
    loadSettings();
    try {
      const h = localStorage.getItem("promptHistory");
      if (h) setPromptHistory(JSON.parse(h));
    } catch {}
  }, [loadConversations, loadSettings]);

  const selectConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    const conv: Conversation = await res.json();
    setActiveId(id);
    setMessages(conv.messages);
  }, []);

  const newConversation = useCallback(async () => {
    setActiveId(null);
    setMessages([]);
    setActiveTools({});
  }, []);

  const deleteConversation = useCallback(
    async (id: string) => {
      await fetch(`/api/conversations/${id}`, { method: "DELETE" });
      if (id === activeId) {
        setActiveId(null);
        setMessages([]);
      }
      loadConversations();
    },
    [activeId, loadConversations]
  );

  const copyMessage = useCallback((id: string) => {
    const msg = messages.find((m) => m.id === id);
    if (msg) {
      navigator.clipboard.writeText(msg.content).catch(() => {});
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 1500);
    }
  }, [messages]);

  const deleteMessage = useCallback((id: string) => {
    setMessages((m) => m.filter((msg) => msg.id !== id));
  }, []);

  const renameConversation = useCallback(
    async (id: string, title: string) => {
      await fetch("/api/conversations", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, title }),
      });
      loadConversations();
    },
    [loadConversations]
  );

  const exportConversation = useCallback(async (id: string) => {
    const res = await fetch(`/api/conversations/${id}`);
    const conv: Conversation = await res.json();
    const lines: string[] = [`# ${conv.title}\n`];
    lines.push(`*Exporté le ${new Date().toLocaleString("fr-FR")}*\n`);
    for (const m of conv.messages) {
      if (m.role === "tool") continue;
      const who = m.role === "user" ? "**Vous**" : "**NEXUS**";
      lines.push(`### ${who}\n\n${m.content}\n`);
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${conv.title.replace(/[^a-zA-Z0-9]/g, "_")}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMsg: ChatMessage = {
      id: uid("msg"),
      role: "user",
      content: text,
      createdAt: Date.now(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setStreaming(true);
    setActiveTools({});
    setTokSpeed(0);

    setPromptHistory((h) => {
      const next = [text, ...h.filter((p) => p !== text)].slice(0, 20);
      try {
        localStorage.setItem("promptHistory", JSON.stringify(next));
      } catch {}
      return next;
    });

    const startTime = Date.now();
    let tokenCount = 0;

    const assistantId = uid("msg");
    setMessages((m) => [
      ...m,
      { id: assistantId, role: "assistant", content: "", createdAt: Date.now() },
    ]);

    let createdConvId: string | null = activeId;

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId, message: text }),
      });

      if (!res.ok || !res.body) {
        throw new Error("Réponse serveur invalide");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (!json) continue;
          const event = JSON.parse(json) as {
            type: string;
            token?: string;
            toolCall?: ToolCall;
            toolResult?: ToolResult;
            step?: number;
            message?: string;
            finalMessage?: ChatMessage;
          };

          if (event.type === "step" && event.message && !createdConvId) {
            createdConvId = event.message;
            setActiveId(createdConvId);
          }
          if (event.type === "token" && event.token) {
            tokenCount++;
            const elapsed = (Date.now() - startTime) / 1000;
            if (elapsed > 0.5) setTokSpeed(Math.round(tokenCount / elapsed));
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: msg.content + event.token }
                  : msg
              )
            );
          }
          if (event.type === "tool_call" && event.toolCall) {
            setActiveTools((t) => ({
              ...t,
              [event.toolCall!.id]: {
                call: event.toolCall!,
                running: true,
              },
            }));
          }
          if (event.type === "tool_result" && event.toolResult) {
            setActiveTools((t) => ({
              ...t,
              [event.toolResult!.callId]: {
                ...(t[event.toolResult!.callId] ?? {
                  call: {
                    id: event.toolResult!.callId,
                    name: event.toolResult!.name,
                    arguments: {},
                  },
                }),
                result: event.toolResult!,
                running: false,
              },
            }));
          }
          if (event.type === "error" && event.message) {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? {
                      ...msg,
                      content:
                        msg.content +
                        (msg.content ? "\n\n" : "") +
                        `⚠️ ${event.message}`,
                    }
                  : msg
              )
            );
          }
          if (event.type === "done" && event.finalMessage) {
            setMessages((m) =>
              m.map((msg) =>
                msg.id === assistantId
                  ? { ...msg, content: event.finalMessage!.content }
                  : msg
              )
            );
          }
        }
      }
    } catch (e) {
      setMessages((m) =>
        m.map((msg) =>
          msg.id === assistantId
            ? {
                ...msg,
                content:
                  msg.content +
                  (msg.content ? "\n\n" : "") +
                  `⚠️ Erreur: ${e instanceof Error ? e.message : String(e)}`,
              }
            : msg
        )
      );
    } finally {
      setStreaming(false);
      setActiveTools({});
      loadConversations();
      setTokSpeed(0);
    }
  }, [input, streaming, activeId, loadConversations]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
 e.preventDefault();
        setShowSettings((s) => !s);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!streaming && messages.length > 0) {
      const last = messages[messages.length - 1];
      if (last && last.role === "assistant" && last.content && "Notification" in window) {
        try {
          if (Notification.permission === "granted") {
            new Notification("NEXUS a répondu", {
              body: last.content.slice(0, 100),
            });
          }
        } catch {}
      }
    }
  }, [streaming, messages]);

  useEffect(() => {
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      try { Notification.requestPermission(); } catch {}
    }
  }, []);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "280px 1fr",
        height: "100vh",
        background: "var(--bg-0)",
      }}
      className="grid-bg"
    >
      <ThemeApplier theme={settings?.theme ?? "nexus"} fontSize={settings?.fontSize ?? 15} />

      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={selectConversation}
        onNew={newConversation}
        onDelete={deleteConversation}
        onRename={renameConversation}
        onExport={exportConversation}
        reachable={reachable}
        onOpenSettings={() => setShowSettings(true)}
      />

      <ChatView
        messages={messages}
        input={input}
        setInput={setInput}
        onSend={sendMessage}
        onCopy={copyMessage}
        onDelete={deleteMessage}
        copiedId={copiedId}
        streaming={streaming}
        activeTools={activeTools}
        scrollRef={scrollRef}
        tokSpeed={tokSpeed}
        quickPrompts={messages.length === 0 ? QUICK_PROMPTS : []}
        promptHistory={promptHistory}
        model={settings?.model ?? "qwen2.5:14b"}
      />

      {showSettings && settings && (
        <SettingsPanel
          settings={settings}
          reachable={reachable}
          onClose={() => setShowSettings(false)}
          onSaved={loadSettings}
        />
      )}
    </div>
  );
}
