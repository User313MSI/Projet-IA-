"use client";

import { useState } from "react";
import type { Conversation } from "@ia-app/shared";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  onRename: (id: string, title: string) => void;
  onExport: (id: string) => void;
  reachable: boolean;
  onOpenSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  onRename,
  onExport,
  reachable,
  onOpenSettings,
}: Props) {
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(search.toLowerCase())
  );

  const startEdit = (c: Conversation) => {
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const commitEdit = () => {
    if (editingId && editTitle.trim()) {
      onRename(editingId, editTitle.trim());
    }
    setEditingId(null);
  };

  return (
    <aside
      style={{
        background: "var(--bg-1)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "280px",
      }}
    >
      <div style={{ padding: "16px", borderBottom: "1px solid var(--border)" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              width: "28px",
              height: "28px",
              borderRadius: "8px",
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              color: "#000",
              fontSize: "16px",
              boxShadow: "0 0 12px rgba(0,229,255,0.4)",
            }}
          >
            ◈
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: "14px" }}>NEXUS</div>
            <div style={{ fontSize: "10px", color: "var(--text-mute)", letterSpacing: "2px" }}>
              LOCAL AI
            </div>
          </div>
        </div>

        <button
          onClick={onNew}
          style={{
            width: "100%",
            padding: "10px",
            borderRadius: "var(--radius)",
            background: "linear-gradient(135deg, rgba(0,229,255,0.15), rgba(124,77,255,0.15))",
            border: "1px solid var(--border-strong)",
            color: "var(--accent)",
            fontWeight: 600,
            fontSize: "13px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
            marginBottom: "10px",
          }}
        >
          + Nouvelle conversation
        </button>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Rechercher..."
          style={{
            width: "100%",
            padding: "8px 10px",
            borderRadius: "8px",
            background: "var(--bg-2)",
            border: "1px solid var(--border)",
            outline: "none",
            fontSize: "12px",
            color: "var(--text)",
          }}
        />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: "8px" }}>
        {filtered.length === 0 && (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              color: "var(--text-mute)",
              fontSize: "12px",
            }}
          >
            {search ? "Aucun résultat" : "Aucune conversation"}
          </div>
        )}
        {filtered.map((c) => (
          <div
            key={c.id}
            onClick={() => editingId !== c.id && onSelect(c.id)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              marginBottom: "4px",
              cursor: editingId === c.id ? "default" : "pointer",
              background: c.id === activeId ? "rgba(0,229,255,0.1)" : "transparent",
              border: c.id === activeId ? "1px solid var(--border-strong)" : "1px solid transparent",
              transition: "all 0.15s",
            }}
          >
            {editingId === c.id ? (
              <input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={commitEdit}
                onKeyDown={(e) => {
                  if (e.key === "Enter") commitEdit();
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
                style={{
                  width: "100%",
                  background: "var(--bg-3)",
                  border: "1px solid var(--accent)",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "13px",
                  color: "var(--text)",
                  outline: "none",
                }}
              />
            ) : (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    fontSize: "13px",
                    flex: 1,
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {c.title}
                </span>
                <div style={{ display: "flex", gap: "2px", opacity: 0.5 }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onExport(c.id);
                    }}
                    style={{
                      color: "var(--text-mute)",
                      fontSize: "12px",
                      padding: "2px 5px",
                      borderRadius: "4px",
                    }}
                    title="Exporter en .md"
                  >
                    ↓
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      startEdit(c);
                    }}
                    style={{
                      color: "var(--text-mute)",
                      fontSize: "12px",
                      padding: "2px 5px",
                      borderRadius: "4px",
                    }}
                    title="Renommer"
                  >
                    ✎
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    style={{
                      color: "var(--text-mute)",
                      fontSize: "14px",
                      padding: "2px 5px",
                      borderRadius: "4px",
                    }}
                    title="Supprimer"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}
            {c.messages.length > 0 && editingId !== c.id && (
              <div style={{ fontSize: "10px", color: "var(--text-mute)", marginTop: "2px" }}>
                {c.messages.length} message{c.messages.length > 1 ? "s" : ""}
              </div>
            )}
          </div>
        ))}
      </div>

      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <div
            style={{
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: reachable ? "var(--ok)" : "var(--err)",
              boxShadow: reachable ? "0 0 8px var(--ok)" : "0 0 8px var(--err)",
            }}
          />
          <span style={{ fontSize: "11px", color: "var(--text-dim)" }}>
            {reachable ? "Ollama connecté" : "Ollama hors-ligne"}
          </span>
        </div>
        <a
          href="/origin"
          style={{
            color: "var(--text-dim)",
            fontSize: "16px",
            padding: "4px 8px",
            borderRadius: "6px",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
          }}
          title="Cerveau numérique d'Origin"
        >
          🧠
        </a>
        <button
          onClick={onOpenSettings}
          style={{
            color: "var(--text-dim)",
            fontSize: "16px",
            padding: "4px 8px",
            borderRadius: "6px",
          }}
          title="Réglages"
        >
          ⚙
        </button>
      </div>
    </aside>
  );
}
