"use client";

import { useState } from "react";
import type { Settings, Theme } from "@ia-app/shared";
import { apiFetch } from "../lib/client";

interface Props {
  settings: Settings;
  reachable: boolean;
  onClose: () => void;
  onSaved: () => void;
}

interface ModelInfo {
  name: string;
  size?: number;
  parameterSize?: string;
}

export default function SettingsPanel({
  settings,
  reachable,
  onClose,
  onSaved,
}: Props) {
  const [local, setLocal] = useState<Settings>(settings);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [saving, setSaving] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkConnection = async () => {
    const res = await apiFetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ollamaUrl: local.ollamaUrl }),
    });
    await res.json();
    const res2 = await apiFetch("/api/settings");
    const data = await res2.json();
    setModels(data.models ?? []);
    setChecked(true);
    onSaved();
  };

  const save = async () => {
    setSaving(true);
    await apiFetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(local),
    });
    setSaving(false);
    onSaved();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(5,6,15,0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "520px",
          maxHeight: "85vh",
          overflowY: "auto",
          background: "var(--bg-2)",
          border: "1px solid var(--border-strong)",
          borderRadius: "20px",
          padding: "28px",
          boxShadow: "0 0 40px rgba(0,229,255,0.15)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              fontSize: "18px",
              fontWeight: 700,
              background: "linear-gradient(135deg, var(--accent), var(--accent-2))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Réglages
          </h2>
          <button
            onClick={onClose}
            style={{ fontSize: "20px", color: "var(--text-mute)" }}
          >
            ×
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
          <Field label="Modèle IA">
            <input
              value={local.model}
              onChange={(e) => setLocal({ ...local, model: e.target.value })}
              placeholder="qwen2.5:14b"
              style={inputStyle}
            />
            <div style={{ marginTop: "8px", display: "flex", gap: "8px" }}>
              <button
                onClick={() => setLocal({ ...local, model: "qwen2.5:7b" })}
                style={{
                  flex: 1, padding: "6px", borderRadius: "8px", fontSize: "12px",
                  background: local.model === "qwen2.5:7b" ? "rgba(0,255,157,0.2)" : "var(--bg-3)",
                  border: "1px solid var(--border)",
                  color: local.model === "qwen2.5:7b" ? "var(--ok)" : "var(--text-dim)",
                }}
              >⚡ Rapide (7B)</button>
              <button
                onClick={() => setLocal({ ...local, model: "qwen2.5:14b" })}
                style={{
                  flex: 1, padding: "6px", borderRadius: "8px", fontSize: "12px",
                  background: local.model === "qwen2.5:14b" ? "rgba(124,77,255,0.2)" : "var(--bg-3)",
                  border: "1px solid var(--border)",
                  color: local.model === "qwen2.5:14b" ? "var(--accent-2)" : "var(--text-dim)",
                }}
              >🧠 Intelligent (14B)</button>
            </div>
            {models.length > 0 && (
              <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "6px" }}>
                {models.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => setLocal({ ...local, model: m.name })}
                    style={{
                      padding: "4px 10px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      fontFamily: "var(--mono)",
                      background:
                        local.model === m.name
                          ? "rgba(0,229,255,0.2)"
                          : "var(--bg-3)",
                      border: "1px solid var(--border)",
                      color: local.model === m.name ? "var(--accent)" : "var(--text-dim)",
                    }}
                  >
                    {m.name}
                  </button>
                ))}
              </div>
            )}
          </Field>

          <Field label="URL Ollama">
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                value={local.ollamaUrl}
                onChange={(e) =>
                  setLocal({ ...local, ollamaUrl: e.target.value })
                }
                style={{ ...inputStyle, flex: 1 }}
              />
              <button
                onClick={checkConnection}
                style={{
                  padding: "0 16px",
                  borderRadius: "10px",
                  border: "1px solid var(--border-strong)",
                  color: "var(--accent)",
                  fontSize: "13px",
                  whiteSpace: "nowrap",
                }}
              >
                Tester
              </button>
            </div>
            {checked && (
              <div
                style={{
                  fontSize: "12px",
                  marginTop: "6px",
                  color: reachable ? "var(--ok)" : "var(--err)",
                }}
              >
                {reachable
                  ? `✓ Connecté — ${models.length} modèle(s) disponible(s)`
                  : "✗ Ollama injoignable"}
              </div>
            )}
          </Field>

          <div style={{ display: "flex", gap: "12px" }}>
            <Field label="Température">
              <input
                type="number"
                step="0.1"
                min="0"
                max="2"
                value={local.temperature}
                onChange={(e) =>
                  setLocal({ ...local, temperature: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Top P">
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={local.topP}
                onChange={(e) =>
                  setLocal({ ...local, topP: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </Field>
            <Field label="Max tokens">
              <input
                type="number"
                step="256"
                value={local.maxTokens}
                onChange={(e) =>
                  setLocal({ ...local, maxTokens: Number(e.target.value) })
                }
                style={inputStyle}
              />
            </Field>
          </div>

          <Field label="Thème">
            <div style={{ display: "flex", gap: "8px" }}>
              {([
                { id: "nexus", label: "Nexus", color: "linear-gradient(135deg, #00e5ff, #7c4dff)" },
                { id: "ocean", label: "Océan", color: "linear-gradient(135deg, #00b4ff, #0066ff)" },
                { id: "sunset", label: "Sunset", color: "linear-gradient(135deg, #ff7828, #ff3860)" },
                { id: "forest", label: "Forêt", color: "linear-gradient(135deg, #00ff82, #20a060)" },
              ] as { id: Theme; label: string; color: string }[]).map((t) => (
                <button
                  key={t.id}
                  onClick={() => setLocal({ ...local, theme: t.id })}
                  style={{
                    flex: 1,
                    padding: "10px 4px",
                    borderRadius: "10px",
                    border: local.theme === t.id ? "2px solid var(--accent)" : "1px solid var(--border)",
                    background: "var(--bg-1)",
                    color: local.theme === t.id ? "var(--text)" : "var(--text-dim)",
                    fontSize: "11px",
                    fontWeight: local.theme === t.id ? 600 : 400,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                  }}
                >
                  <div style={{ width: "20px", height: "20px", borderRadius: "6px", background: t.color }} />
                  {t.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label={`Taille de police: ${local.fontSize}px`}>
            <input
              type="range"
              min="12"
              max="20"
              step="1"
              value={local.fontSize}
              onChange={(e) => setLocal({ ...local, fontSize: Number(e.target.value) })}
              style={{ width: "100%", accentColor: "var(--accent)" }}
            />
          </Field>

          <Field label="Prompt système">
            <textarea
              value={local.systemPrompt}
              onChange={(e) =>
                setLocal({ ...local, systemPrompt: e.target.value })
              }
              rows={4}
              style={{
                ...inputStyle,
                resize: "vertical",
                fontFamily: "var(--mono)",
                fontSize: "13px",
              }}
            />
          </Field>

          <button
            onClick={save}
            disabled={saving}
            style={{
              padding: "12px",
              borderRadius: "12px",
              background:
                "linear-gradient(135deg, var(--accent), var(--accent-2))",
              color: "#000",
              fontWeight: 700,
              fontSize: "14px",
              opacity: saving ? 0.5 : 1,
            }}
          >
            {saving ? "Sauvegarde…" : "Enregistrer"}
          </button>
        </div>
      </div>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  background: "var(--bg-1)",
  border: "1px solid var(--border)",
  borderRadius: "10px",
  padding: "10px 12px",
  fontSize: "14px",
  width: "100%",
  outline: "none",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        style={{
          display: "block",
          fontSize: "11px",
          color: "var(--text-dim)",
          marginBottom: "6px",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}
