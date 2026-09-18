"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { apiFetch } from "../../lib/client";
import type {
  Personality,
  InterviewQuestion,
  PersonalityCategory,
} from "@ia-app/personality-core/client";
import {
  CATEGORY_LABELS,
  CATEGORY_COLORS,
  pendingQuestions,
  answeredQuestions,
  interviewProgress,
  nextPendingQuestion,
  pendingQuestionsByCategory,
} from "@ia-app/personality-core/client";
import type { Document, KnowledgeStats } from "@ia-app/knowledge-core/client";

const Brain3D = dynamic(() => import("../../components/origin/Brain3D"), {
  ssr: false,
  loading: () => (
    <div style={{ height: 600, display: "grid", placeItems: "center", background: "radial-gradient(ellipse at 50% 40%, #0d0d3e 0%, #07081a 55%, #05060f 100%)", borderRadius: "20px", border: "1px solid rgba(124,77,255,0.15)" }}>
      <div style={{ textAlign: "center" }}>
        <div className="spinner-orbit" style={{ marginBottom: "16px" }}>
          <div className="ring" />
          <div className="ring" />
          <div className="ring" />
        </div>
        <span style={{ fontSize: "11px", letterSpacing: "2px", textTransform: "uppercase", color: "var(--text-mute)" }}>
          Chargement du cerveau 3D…
        </span>
      </div>
    </div>
  ),
});

export default function OriginPage() {
  const [personality, setPersonality] = useState<Personality | null>(null);
  const [questions, setQuestions] = useState<InterviewQuestion[]>([]);
  const [evolution, setEvolution] = useState<{ snapshots: unknown[]; totalSessions: number; totalQuestionsAnswered: number } | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [stats, setStats] = useState<KnowledgeStats | null>(null);
  const [activeTab, setActiveTab] = useState<"brain" | "interview" | "personality" | "knowledge">("brain");
  const [interviewAnswer, setInterviewAnswer] = useState("");
  const [knowledgeInput, setKnowledgeInput] = useState("");
  const [knowledgeTitle, setKnowledgeTitle] = useState("");
  const [indexing, setIndexing] = useState(false);
  const [indexProgress, setIndexProgress] = useState(0);
  const [indexStatus, setIndexStatus] = useState("");
  const [embeddingReachable, setEmbeddingReachable] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const res = await apiFetch("/api/origin/state");
      const data = await res.json();
      setPersonality(data.personality);
      setQuestions(data.questions);
      setEvolution(data.evolution);
      setDocuments(data.documents ?? []);
      setStats(data.stats ?? null);
      setEmbeddingReachable(data.embeddingReachable ?? false);
    } catch (e) {
      console.error("loadData error", e);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const pending = pendingQuestions(questions);
  const answered = answeredQuestions(questions);
  const progress = interviewProgress(questions);
  const currentQuestion = nextPendingQuestion(questions);
  const pendingByCat = pendingQuestionsByCategory(questions);

  const submitAnswer = useCallback(async () => {
    if (!currentQuestion || !interviewAnswer.trim()) return;
    try {
      await apiFetch("/api/origin/questions", {
        method: "POST",
        body: JSON.stringify({
          action: "answer",
          questionId: currentQuestion.id,
          answer: interviewAnswer,
        }),
      });
      setInterviewAnswer("");
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }, [currentQuestion, interviewAnswer, loadData]);

  const skipCurrent = useCallback(async () => {
    if (!currentQuestion) return;
    try {
      await apiFetch("/api/origin/questions", {
        method: "POST",
        body: JSON.stringify({
          action: "skip",
          questionId: currentQuestion.id,
        }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }, [currentQuestion, loadData]);

  const addKnowledge = useCallback(async () => {
    if (!knowledgeInput.trim() || !knowledgeTitle.trim()) return;
    setIndexing(true);
    setIndexProgress(0);
    setIndexStatus("Découpage du texte...");
    try {
      const res = await apiFetch("/api/origin/knowledge", {
        method: "POST",
        body: JSON.stringify({
          title: knowledgeTitle,
          text: knowledgeInput,
          type: "note",
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        setIndexStatus(`Erreur: ${err.error ?? "inconnue"}`);
      } else {
        const data = await res.json();
        setIndexStatus(data.message ?? "Document ajouté");
        setKnowledgeInput("");
        setKnowledgeTitle("");
        await loadData();
      }
    } catch (e) {
      setIndexStatus(`Erreur: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIndexing(false);
    }
  }, [knowledgeInput, knowledgeTitle, loadData]);

  const deleteDoc = useCallback(async (id: string) => {
    try {
      await apiFetch(`/api/origin/knowledge?id=${id}`, { method: "DELETE" });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }, [loadData]);

  const updateTrait = useCallback(async (key: string, value: number) => {
    try {
      await apiFetch("/api/origin/personality", {
        method: "POST",
        body: JSON.stringify({ action: "updateTrait", key, value }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }, [loadData]);

  const updateBio = useCallback(async (bio: string) => {
    try {
      await apiFetch("/api/origin/personality", {
        method: "POST",
        body: JSON.stringify({ action: "updateBio", bio }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }, [loadData]);

  const addValue = useCallback(async () => {
    const val = prompt("Quelle valeur veux-tu ajouter ?");
    if (!val) return;
    try {
      await apiFetch("/api/origin/personality", {
        method: "POST",
        body: JSON.stringify({ action: "addValue", value: val, weight: 1 }),
      });
      await loadData();
    } catch (e) {
      console.error(e);
    }
  }, [loadData]);

  if (!personality) {
    return (
      <div style={{ display: "grid", placeItems: "center", height: "100vh", background: "radial-gradient(ellipse at center, #0a0a2e 0%, #05060f 70%)", color: "var(--text)" }}>
        <div style={{ textAlign: "center" }}>
          <div className="spinner-orbit" style={{ marginBottom: "24px" }}>
            <div className="ring" />
            <div className="ring" />
            <div className="ring" />
          </div>
          <p style={{ fontSize: "15px", fontWeight: 600, letterSpacing: "3px", textTransform: "uppercase", fontFamily: "var(--display)", background: "linear-gradient(135deg, #7c4dff, #00e5ff, #00ff9d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 18px rgba(124,77,255,0.35))" }}>
            Initialisation d’Origin…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text)" }}>
      <div style={{
        padding: "20px 24px",
        borderBottom: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap",
      }}>
        <a href="/" style={{ color: "var(--text-mute)", textDecoration: "none", fontSize: "14px", display: "inline-flex", alignItems: "center", gap: "6px" }}>
          ← Retour
        </a>
        <h1 style={{ fontSize: "26px", fontWeight: 800, margin: 0, letterSpacing: "-0.5px", fontFamily: "var(--display)" }}>
          <span style={{ background: "linear-gradient(135deg, #7c4dff, #00e5ff, #00ff9d)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", filter: "drop-shadow(0 0 20px rgba(124,77,255,0.3))" }}>
            Origin
          </span>
          <span style={{ color: "var(--text-mute)", fontSize: "13px", marginLeft: "12px", fontWeight: 400 }}>
            {personality.identity.tagline}
          </span>
        </h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: "6px", flexWrap: "wrap" }} role="tablist" aria-label="Sections d'Origin">
          {(["brain", "interview", "personality", "knowledge"] as const).map((tab) => {
            const labels: Record<string, { icon: string; text: string; badge?: number; color: string }> = {
              brain: { icon: "🧠", text: "Cerveau", color: "#7c4dff" },
              interview: { icon: "💬", text: "Interview", badge: pending.length, color: "#00e5ff" },
              personality: { icon: "✨", text: "Personnalité", color: "#ff6b9d" },
              knowledge: { icon: "📚", text: "Connaissances", color: "#00ff9d" },
            };
            const meta = labels[tab]!;
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                role="tab"
                aria-selected={active}
                aria-label={meta.text}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: "9px 16px",
                  borderRadius: "10px",
                  border: "1px solid",
                  borderColor: active ? meta.color : "var(--border)",
                  background: active ? `${meta.color}1a` : "transparent",
                  color: active ? meta.color : "var(--text-mute)",
                  cursor: "pointer",
                  fontSize: "13px",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.8px",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "7px",
                  transition: "all 0.25s var(--ease-smooth)",
                  boxShadow: active ? `0 0 16px ${meta.color}33` : "none",
                  fontFamily: "var(--display)",
                }}
              >
                <span style={{ fontSize: "15px" }}>{meta.icon}</span>
                {meta.text}
                {meta.badge ? (
                  <span style={{ background: "#ff6b9d", color: "#fff", fontSize: "10px", fontWeight: 800, padding: "1px 6px", borderRadius: "10px", marginLeft: "2px" }}>{meta.badge}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ padding: "24px" }}>
        {activeTab === "brain" && (
          <div>
            <Brain3D
              activity={answered.length / Math.max(questions.length, 1)}
              knowledgeCount={documents.length}
              pendingQuestions={pending.length}
              questionsAnswered={answered.length}
              totalQuestions={questions.length}
            />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginTop: "24px" }}>
              <StatCard label="Personnalité" value={`${progress}%`} sub={`${answered.length}/${questions.length} questions`} color="#7c4dff" />
              <StatCard label="Connaissances" value={`${documents.length}`} sub={`${stats?.totalChunks ?? 0} passages indexés`} color="#00e5ff" />
              <StatCard label="Questions en attente" value={`${pending.length}`} sub="À poser en interview" color={pending.length > 0 ? "#ff6b9d" : "#00ff9d"} />
              <StatCard label="Sessions" value={`${evolution?.totalSessions ?? 0}`} sub={`${evolution?.totalQuestionsAnswered ?? 0} réponses`} color="#ffb300" />
            </div>
            {pending.length > 0 && (
              <div style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: "12px",
                background: "rgba(255,107,157,0.1)",
                border: "1px solid rgba(255,107,157,0.3)",
                textAlign: "center",
              }}>
                <span style={{ color: "#ff6b9d", fontWeight: 600 }}>
                  ⚠️ Origin a {pending.length} question(s) à te poser. Va dans l'onglet Interview.
                </span>
              </div>
            )}
            {!embeddingReachable && (
              <div style={{
                marginTop: "16px",
                padding: "16px",
                borderRadius: "12px",
                background: "rgba(255,179,0,0.1)",
                border: "1px solid rgba(255,179,0,0.3)",
                textAlign: "center",
              }}>
                <span style={{ color: "#ffb300", fontWeight: 600 }}>
                  ⚠️ Ollama/embeddings n'est pas accessible. Lance "ollama pull nomic-embed-text" pour activer la base de connaissances.
                </span>
              </div>
            )}
          </div>
        )}

        {activeTab === "interview" && (
          <div style={{ maxWidth: 700, margin: "0 auto" }}>
            <div style={{ marginBottom: "20px" }}>
              <div style={{ height: "8px", borderRadius: "4px", background: "var(--bg-3)", overflow: "hidden", boxShadow: "inset 0 1px 3px rgba(0,0,0,0.4)" }}>
                <div style={{
                  width: `${progress}%`,
                  height: "100%",
                  background: "linear-gradient(90deg, #7c4dff, #00e5ff)",
                  transition: "width 0.6s var(--ease-smooth)",
                  borderRadius: "4px",
                  boxShadow: "0 0 12px rgba(0,229,255,0.4)",
                }} />
              </div>
              <p style={{ textAlign: "center", marginTop: "8px", color: "var(--text-mute)", fontSize: "13px" }}>
                {progress}% complété — {answered.length} répondues, {pending.length} en attente
              </p>
            </div>

            {currentQuestion ? (
              <div style={{
                padding: "24px",
                borderRadius: "16px",
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" }}>
                  <span style={{
                    padding: "4px 10px",
                    borderRadius: "6px",
                    fontSize: "11px",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "1px",
                    background: `${CATEGORY_COLORS[currentQuestion.category]}22`,
                    color: CATEGORY_COLORS[currentQuestion.category],
                  }}>
                    {CATEGORY_LABELS[currentQuestion.category]}
                  </span>
                </div>
                <h2 style={{ fontSize: "20px", fontWeight: 600, marginBottom: "8px", fontFamily: "var(--display)" }}>
                  {currentQuestion.question}
                </h2>
                {currentQuestion.context && (
                  <p style={{ color: "var(--text-mute)", fontSize: "14px", marginBottom: "20px", fontStyle: "italic" }}>
                    {currentQuestion.context}
                  </p>
                )}
                <textarea
                  value={interviewAnswer}
                  onChange={(e) => setInterviewAnswer(e.target.value)}
                  placeholder="Ta réponse..."
                  rows={4}
                  style={{
                    width: "100%",
                    padding: "14px",
                    borderRadius: "10px",
                    border: "1px solid var(--border)",
                    background: "var(--bg)",
                    color: "var(--text)",
                    fontSize: "15px",
                    resize: "vertical",
                    fontFamily: "inherit",
                  }}
                />
                <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                  <button
                    onClick={submitAnswer}
                    disabled={!interviewAnswer.trim()}
                    style={{
                      flex: 1,
                      padding: "12px",
                      borderRadius: "10px",
                      border: "none",
                      background: interviewAnswer.trim() ? "linear-gradient(135deg, #7c4dff, #00e5ff)" : "var(--bg-3)",
                      color: interviewAnswer.trim() ? "#fff" : "var(--text-mute)",
                      cursor: interviewAnswer.trim() ? "pointer" : "not-allowed",
                      fontWeight: 600,
                      fontSize: "14px",
                      boxShadow: interviewAnswer.trim() ? "0 4px 18px rgba(124,77,255,0.35)" : "none",
                    }}
                  >
                    Répondre
                  </button>
                  <button
                    onClick={skipCurrent}
                    style={{
                      padding: "12px 20px",
                      borderRadius: "10px",
                      border: "1px solid var(--border)",
                      background: "transparent",
                      color: "var(--text-mute)",
                      cursor: "pointer",
                      fontSize: "14px",
                    }}
                  >
                    Passer
                  </button>
                </div>
              </div>
            ) : (
              <div style={{
                padding: "40px",
                borderRadius: "16px",
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                textAlign: "center",
              }}>
                <p style={{ fontSize: "48px", margin: "0 0 12px" }}>✓</p>
                <h2 style={{ fontSize: "20px", marginBottom: "8px" }}>Toutes les questions ont été traitées</h2>
                <p style={{ color: "var(--text-mute)" }}>
                  La personnalité d'Origin est maintenant définie à {progress}%.
                </p>
              </div>
            )}

            {pending.length > 1 && (
              <div style={{ marginTop: "24px" }}>
                <h3 style={{ fontSize: "14px", color: "var(--text-mute)", textTransform: "uppercase", letterSpacing: "1px", marginBottom: "12px" }}>
                  Questions en attente par catégorie
                </h3>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {(Object.keys(pendingByCat) as PersonalityCategory[]).map((cat) => (
                    <span key={cat} style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      fontSize: "12px",
                      background: `${CATEGORY_COLORS[cat]}22`,
                      color: CATEGORY_COLORS[cat],
                      border: `1px solid ${CATEGORY_COLORS[cat]}44`,
                    }}>
                      {CATEGORY_LABELS[cat]}: {pendingByCat[cat]}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "personality" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <Section title="Identité">
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
                <InfoChip label="Nom" value={personality.identity.name} />
                <InfoChip label="Origine" value={personality.identity.origin} />
                <InfoChip label="Version" value={`v${personality.identity.version}`} />
                <InfoChip label="Registre" value={personality.tone.register} />
              </div>
            </Section>

            <Section title="Biographie">
              <textarea
                defaultValue={personality.bio}
                onBlur={(e) => updateBio(e.target.value)}
                placeholder="Décris qui est Origin..."
                rows={3}
                style={inputStyle}
              />
            </Section>

            <Section title="Traits de personnalité">
              {personality.traits.map((t) => (
                <div key={t.key} style={{ marginBottom: "16px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontSize: "14px" }}>{t.label}</span>
                    <span style={{ fontSize: "13px", color: "var(--text-mute)" }}>{Math.round(t.value * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={t.value}
                    onChange={(e) => updateTrait(t.key, parseFloat(e.target.value))}
                    style={{ width: "100%", accentColor: "#7c4dff" }}
                  />
                  <p style={{ fontSize: "12px", color: "var(--text-mute)", marginTop: "4px" }}>{t.description}</p>
                </div>
              ))}
            </Section>

            <Section title="Valeurs fondamentales">
              {personality.values.length === 0 ? (
                <p style={{ color: "var(--text-mute)", fontSize: "14px" }}>(À définir via l'interview)</p>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {personality.values.map((v) => (
                    <span key={v.id} style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      background: "rgba(0,229,255,0.1)",
                      color: "#00e5ff",
                      border: "1px solid rgba(0,229,255,0.3)",
                      fontSize: "13px",
                    }}>
                      {v.value}
                    </span>
                  ))}
                </div>
              )}
              <button onClick={addValue} style={btnStyle}>+ Ajouter une valeur</button>
            </Section>

            <Section title="Vision du monde">
              {[
                { key: "openness", label: "Ouverture" },
                { key: "curiosity", label: "Curiosité" },
                { key: "pragmatism", label: "Pragmatisme" },
                { key: "idealism", label: "Idéalisme" },
                { key: "skepticism", label: "Esprit critique" },
                { key: "empathy", label: "Empathie" },
              ].map((w) => {
                const wv = personality.worldview as unknown as Record<string, number>;
                const val = wv[w.key] ?? 0;
                return (
                <div key={w.key} style={{ marginBottom: "12px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontSize: "14px" }}>{w.label}</span>
                    <span style={{ fontSize: "13px", color: "var(--text-mute)" }}>{Math.round(val * 100)}%</span>
                  </div>
                  <div style={{ height: "6px", borderRadius: "3px", background: "var(--bg-3)", overflow: "hidden", marginTop: "4px" }}>
                    <div style={{
                      width: `${val * 100}%`,
                      height: "100%",
                      background: "linear-gradient(90deg, #ff6b9d, #ffb300)",
                      borderRadius: "3px",
                    }} />
                  </div>
                </div>
                );
              })}
              {personality.worldview.principles.length > 0 && (
                <div style={{ marginTop: "16px" }}>
                  <p style={{ fontSize: "13px", color: "var(--text-mute)", marginBottom: "8px" }}>Principes :</p>
                  <ul style={{ paddingLeft: "20px", margin: 0 }}>
                    {personality.worldview.principles.map((p, i) => (
                      <li key={i} style={{ fontSize: "14px", marginBottom: "4px" }}>{p}</li>
                    ))}
                  </ul>
                </div>
              )}
            </Section>
          </div>
        )}

        {activeTab === "knowledge" && (
          <div style={{ maxWidth: 800, margin: "0 auto" }}>
            <div style={{
              padding: "20px",
              borderRadius: "12px",
              background: "var(--bg-2)",
              border: "1px solid var(--border)",
              marginBottom: "24px",
            }}>
              <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>Ajouter un document</h3>
              <input
                type="text"
                placeholder="Titre du document..."
                value={knowledgeTitle}
                onChange={(e) => setKnowledgeTitle(e.target.value)}
                style={{ ...inputStyle, marginBottom: "10px" }}
              />
              <textarea
                placeholder="Colle ici le texte, les notes, ou le contenu du livre..."
                value={knowledgeInput}
                onChange={(e) => setKnowledgeInput(e.target.value)}
                rows={6}
                style={inputStyle}
              />
              <button
                onClick={addKnowledge}
                disabled={!knowledgeInput.trim() || !knowledgeTitle.trim() || indexing}
                style={{
                  ...btnStyle,
                  marginTop: "10px",
                  background: (!knowledgeInput.trim() || !knowledgeTitle.trim() || indexing)
                    ? "var(--bg-3)" : "linear-gradient(135deg, #00e5ff, #00ff9d)",
                  color: (!knowledgeInput.trim() || !knowledgeTitle.trim() || indexing) ? "var(--text-mute)" : "#05060f",
                }}
              >
                {indexing ? "Indexation en cours..." : "Indexer dans le cerveau"}
              </button>
              {indexing && (
                <div style={{ marginTop: "14px", padding: "16px", borderRadius: "10px", background: "rgba(0,229,255,0.06)", border: "1px solid rgba(0,229,255,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(0,229,255,0.25)", borderTopColor: "#00e5ff", animation: "origin-spin 0.8s linear infinite" }} />
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "#00e5ff" }}>{indexStatus || "Indexation en cours…"}</span>
                  </div>
                  <div style={{ height: "5px", borderRadius: "3px", background: "var(--bg-3)", overflow: "hidden", position: "relative" }}>
                    <div style={{
                      position: "absolute",
                      width: "40%",
                      height: "100%",
                      borderRadius: "3px",
                      background: "linear-gradient(90deg, #00e5ff, #00ff9d)",
                      animation: "origin-slide 1.4s ease-in-out infinite",
                    }} />
                  </div>
                  <style>{`@keyframes origin-spin { to { transform: rotate(360deg) } } @keyframes origin-slide { 0% { left: -40% } 100% { left: 100% } }`}</style>
                </div>
              )}
              {indexStatus && !indexing && (
                <p style={{ marginTop: "10px", fontSize: "13px", color: indexStatus.startsWith("Erreur") ? "#ff4444" : "#00ff9d" }}>{indexStatus}</p>
              )}
            </div>

            {stats && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                <StatCard label="Documents" value={`${stats.totalDocuments}`} sub="" color="#00e5ff" />
                <StatCard label="Passages" value={`${stats.totalChunks}`} sub="indexés" color="#00ff9d" />
                <StatCard label="Caractères" value={`${(stats.totalChars / 1000).toFixed(1)}k`} sub="total" color="#7c4dff" />
              </div>
            )}

            <div>
              <h3 style={{ fontSize: "16px", marginBottom: "12px" }}>Bibliothèque</h3>
              {documents.length === 0 ? (
                <p style={{ color: "var(--text-mute)", fontSize: "14px" }}>
                  Aucun document. Ajoute ton premier livre ou tes premières notes ci-dessus.
                </p>
              ) : (
                documents.map((doc) => (
                  <div key={doc.id} style={{
                    padding: "14px",
                    borderRadius: "10px",
                    background: "var(--bg-2)",
                    border: "1px solid var(--border)",
                    marginBottom: "8px",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                  }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "6px",
                      fontSize: "11px",
                      textTransform: "uppercase",
                      background: "rgba(0,229,255,0.1)",
                      color: "#00e5ff",
                    }}>
                      {doc.type}
                    </span>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, margin: 0, fontSize: "14px" }}>{doc.title}</p>
                      <p style={{ fontSize: "12px", color: "var(--text-mute)", margin: "2px 0 0 0" }}>
                        {doc.chunkCount} passages · {doc.totalChars.toLocaleString()} caractères
                      </p>
                    </div>
                    <button
                      onClick={() => deleteDoc(doc.id)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "6px",
                        border: "none",
                        background: "rgba(255,68,68,0.15)",
                        color: "#ff4444",
                        cursor: "pointer",
                        fontSize: "12px",
                      }}
                    >
                      Supprimer
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <div
      style={{
        padding: "20px",
        borderRadius: "16px",
        background: "linear-gradient(145deg, var(--bg-2), var(--bg-3))",
        border: "1px solid var(--border)",
        textAlign: "center",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
      }}
      onMouseEnter={(e) => {
 e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = `0 8px 30px ${color}22`; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: "3px", background: `linear-gradient(90deg, transparent, ${color}, transparent)` }} />
      <p style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1.5px", color: "var(--text-mute)", margin: "0 0 8px 0", fontWeight: 600 }}>{label}</p>
      <p style={{ fontSize: "32px", fontWeight: 800, color, margin: "0 0 6px 0", textShadow: `0 0 20px ${color}55`, fontFamily: "var(--display)" }}>{value}</p>
      <p style={{ fontSize: "12px", color: "var(--text-mute)", margin: 0 }}>{sub}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      padding: "20px",
      borderRadius: "12px",
      background: "var(--bg-2)",
      border: "1px solid var(--border)",
      marginBottom: "16px",
    }}>
      <h3 style={{ fontSize: "14px", textTransform: "uppercase", letterSpacing: "1px", color: "var(--text-mute)", marginBottom: "16px" }}>{title}</h3>
      {children}
    </div>
  );
}

function InfoChip({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      padding: "8px 14px",
      borderRadius: "8px",
      background: "var(--bg)",
      border: "1px solid var(--border)",
    }}>
      <p style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--text-mute)", margin: "0 0 2px 0" }}>{label}</p>
      <p style={{ fontSize: "15px", fontWeight: 600, margin: 0 }}>{value}</p>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px",
  borderRadius: "10px",
  border: "1px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: "15px",
  fontFamily: "inherit",
  resize: "vertical",
};

const btnStyle: React.CSSProperties = {
  padding: "10px 16px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontWeight: 600,
  fontSize: "14px",
};
