"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "../../../lib/client";
import type { Personality, InterviewQuestion } from "@ia-app/personality-core/client";
import type { Document, KnowledgeStats } from "@ia-app/knowledge-core/client";
import type { WorldData, SelectionState } from "../../../components/origin/world/OriginWorld";

const OriginWorld = dynamic(() => import("../../../components/origin/world/OriginWorld"), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "grid",
        placeItems: "center",
        background: "radial-gradient(ellipse at 50% 35%, #0d0d3e 0%, #07081a 55%, #05060f 100%)",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <div className="spinner-orbit" style={{ marginBottom: "16px" }}>
          <div className="ring" />
          <div className="ring" />
          <div className="ring" />
        </div>
        <span
          style={{
            fontSize: "11px",
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "var(--text-mute)",
            fontFamily: "var(--display)",
          }}
        >
          Ouverture du monde d&apos;Origin…
        </span>
      </div>
    </div>
  ),
});

interface StateData {
  personality: Personality | null;
  questions: InterviewQuestion[];
  evolution: { snapshots: unknown[]; totalSessions: number; totalQuestionsAnswered: number; growthScore?: number } | null;
  documents: Document[];
  stats: KnowledgeStats | null;
}

export default function MaisonPage() {
  const [data, setData] = useState<WorldData | null>(null);
  const [selection, setSelection] = useState<SelectionState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await apiFetch("/api/origin/state");
        if (!res.ok) throw new Error(`État indisponible (${res.status})`);
        const d = (await res.json()) as StateData;
        if (cancelled) return;
        const world: WorldData = {
          personality: d.personality,
          questions: d.questions ?? [],
          documents: d.documents ?? [],
          stats: d.stats ?? null,
          knowledgeChunks: d.stats?.totalChunks ?? 0,
          sessions: d.evolution?.totalSessions ?? 0,
          growth: Math.min(1, (d.documents?.length ?? 0) * 0.06 + (d.evolution?.totalQuestionsAnswered ?? 0) * 0.03),
        };
        setData(world);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e));
      }
    };
    load();
    const interval = setInterval(load, 20000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const onSelection = useCallback((s: SelectionState | null) => {
    setSelection(s);
  }, []);

  if (error) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg)",
          color: "#ff6b9d",
          fontFamily: "var(--display)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 16 }}>Impossible de charger le laboratoire d&apos;Origin</p>
          <p style={{ fontSize: 13, color: "var(--text-mute)" }}>{error}</p>
          <a href="/origin" style={{ color: "var(--cyan, #00e5ff)", fontSize: 13 }}>
            ← Retour au cerveau
          </a>
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "#05060f", overflow: "hidden" }}>
      {data && <OriginWorld data={data} onSelection={onSelection} />}

      {/* Barre supérieure */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          padding: "14px 20px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          background: "linear-gradient(180deg, rgba(5,6,15,0.85) 0%, rgba(5,6,15,0) 100%)",
          pointerEvents: "none",
        }}
      >
        <a
          href="/origin"
          style={{
            color: "var(--text-mute)",
            textDecoration: "none",
            fontSize: 13,
            pointerEvents: "auto",
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid var(--border)",
            background: "rgba(10,12,30,0.6)",
          }}
        >
          ← Cerveau
        </a>
        <h1
          style={{
            margin: 0,
            fontSize: 17,
            fontFamily: "var(--display)",
            letterSpacing: "1px",
            textTransform: "uppercase",
          }}
        >
          <span
            style={{
              background: "linear-gradient(135deg, #7c4dff, #00e5ff, #00ff9d)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              filter: "drop-shadow(0 0 14px rgba(124,77,255,0.35))",
            }}
          >
            Laboratoire d&apos;Origin
          </span>
        </h1>
        {data && (
          <span style={{ fontSize: 12, color: "var(--text-mute)", fontFamily: "var(--display)" }}>
            {data.documents.length} docs · {data.knowledgeChunks} passages · {data.sessions} sessions
          </span>
        )}
      </div>

      {/* Panneau de sélection */}
      {selection && (
        <div
          style={{
            position: "absolute",
            top: 70,
            right: 18,
            width: 300,
            padding: "16px 18px",
            borderRadius: 14,
            background: "rgba(10,12,30,0.82)",
            border: "1px solid rgba(124,77,255,0.3)",
            backdropFilter: "blur(10px)",
            color: "var(--text)",
            fontFamily: "Inter, sans-serif",
            boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
          }}
        >
          <div
            style={{
              fontSize: 13,
              fontWeight: 700,
              letterSpacing: "1.2px",
              textTransform: "uppercase",
              color: "#00e5ff",
              marginBottom: 8,
              fontFamily: "var(--display)",
            }}
          >
            {selection.title}
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.55, color: "var(--text)", whiteSpace: "pre-wrap" }}>
            {selection.body}
          </div>
        </div>
      )}

      {/* Aide clavier */}
      <div
        style={{
          position: "absolute",
          bottom: 16,
          right: 18,
          fontSize: 11,
          color: "var(--text-mute)",
          fontFamily: "var(--display)",
          letterSpacing: "0.6px",
          pointerEvents: "none",
          textAlign: "right",
          lineHeight: 1.7,
        }}
      >
        ZQSD / WASD · souris — déplacement
        <br />
        clic — porte & pièces
      </div>
    </div>
  );
}
