"use client";

import type { Conversation } from "@ia-app/shared";

interface Props {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
  reachable: boolean;
  onOpenSettings: () => void;
}

export default function Sidebar({
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
  reachable,
  onOpenSettings,
}: Props) {
  return (
    <aside
      style={{
        background: "var(--bg-1)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "16px",
          borderBottom: "1px solid var(--border)",
        }}
      >
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
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-2))",
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
          }}
        >
          + Nouvelle conversation
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "8px",
        }}
      >
        {conversations.length === 0 && (
          <div
            style={{
              padding: "20px 12px",
              textAlign: "center",
              color: "var(--text-mute)",
              fontSize: "12px",
            }}
          >
            Aucune conversation
          </div>
        )}
        {conversations.map((c) => (
          <div
            key={c.id}
            onClick={() => onSelect(c.id)}
            style={{
              padding: "10px 12px",
              borderRadius: "8px",
              marginBottom: "4px",
              cursor: "pointer",
              background: c.id === activeId ? "rgba(0,229,255,0.1)" : "transparent",
              border: c.id === activeId ? "1px solid var(--border-strong)" : "1px solid transparent",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.15s",
            }}
          >
            <span style={{ fontSize: "13px", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {c.title}
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete(c.id);
              }}
              style={{
                color: "var(--text-mute)",
                fontSize: "14px",
                padding: "2px 6px",
                borderRadius: "4px",
                opacity: 0.5,
              }}
            >
              ×
            </button>
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
