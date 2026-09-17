# Journal d'intervention — NEXUS

> Chaque agent qui travaille sur ce projet DOIT se déclarer ici avant de commencer,
> et documenter ce qu'il fait à la fin de son intervention.
> Format : `Prénom — Date — Rôle — Travail effectué`

---

## Vibe — 2026-09-17 — Créateur initial
**Rôle :** Création complète du projet NEXUS
**Commit d'enregistrement :** `chore(agent): Vibe — création du projet NEXUS`

### Travail effectué
- Création du monorepo pnpm (apps/web, apps/desktop, packages/shared, packages/agent-core)
- Développement du moteur IA : client Ollama, boucle agent avec tool-calling (8 étapes max), 5 outils (read_file, write_file, list_dir, run_command, calc)
- Mémoire persistante (conversations + settings dans ~/.ia-app/)
- Interface web Next.js 15 : chat futuriste/techno, streaming SSE, sidebar conversations, panneau réglages
- App desktop Electron 33 : encapsule l'app web, scripts dev/build
- TypeScript strict partout, 6 tests Vitest, CI GitHub Actions
- Push du code sur GitHub (User313MSI/Projet-IA-)

### Fichiers créés
- `packages/shared/src/` : types + utils (contrat frontend↔backend)
- `packages/agent-core/src/` : ollama.ts, tools.ts, default-tools.ts, agent.ts, memory.ts, index.ts
- `apps/web/app/` : layout, page, globals.css, 4 routes API (chat, conversations, settings)
- `apps/web/components/` : Sidebar, ChatView, SettingsPanel
- `apps/desktop/` : main.ts, scripts dev/build, electron-builder.json
- `.github/workflows/ci.yml` (CI — non poussé, restriction GitHub sur .github/)
- `README.md`, `AGENTS.md`, `REGLES.md`, `JOURNAL.md`

### État
- Build ✅, tests ✅ (6/6), typecheck ✅ (4 packages)
- Modèle : qwen2.5:14b installé et fonctionnel
- App lancée et testée par l'utilisateur

### Prochaines étapes suggérées
- Raccourci bureau pour lancer en un clic
- Améliorer la vitesse de réponse (optimiser params, option modèle plus rapide)
- Améliorer le design
- Ajouter rendu Markdown dans les réponses
- Intégration vocale (plus tard)

---
