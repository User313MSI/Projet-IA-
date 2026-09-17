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

## Vibe — 2026-09-17 — Workflow d'équipe + prompt de sécurité
**Rôle :** Mise en place du workflow d'équipe et préparation de l'audit de sécurité
**Commit d'enregistrement :** `chore(agent): Vibe — workflow équipe + prompt sécurité`

### Travail effectué
- Création de `EQUIPE.md` : registre des agents (tableau Prénom/Rôle/Date/Tâches/Statut)
- Création de `PROMPT_SECURITE.md` : prompt complet pour une nouvelle conversation dédiée à la sécurité du système
- Le prompt de sécurité explique l'architecture de NEXUS, liste les fichiers à auditer (default-tools.ts, advanced-tools.ts, agent.ts, ollama.ts, memory.ts, route.ts, main.ts), et demande au nouvel agent de choisir un prénom, s'enregistrer dans EQUIPE.md et JOURNAL.md, puis maximiser la sécurité (allowlist commandes, confinement chemins, approbation utilisateur, durcissement Electron, restriction API à localhost, etc.)
- Push sur GitHub des deux fichiers via `python3 scripts/push_contents.py`

### Fichiers créés
- `EQUIPE.md` — Registre des agents de l'équipe NEXUS
- `PROMPT_SECURITE.md` — Prompt à copier dans une nouvelle conversation pour l'audit de sécurité

### État
- `EQUIPE.md` poussé sur GitHub ✅ (1021 bytes)
- `PROMPT_SECURITE.md` poussé sur GitHub ✅ (11811 bytes)
- `.github/workflows/ci.yml` reste non poussable via PAT fins (restriction GitHub)

---

---

## Pont — 2026-09-17 — Approbation UI

**Rôle :** Câblage du mécanisme d'approbation UI pour les actions sensibles
**Commit d'enregistrement :** `chore(agent): Pont — approbation UI`

### Travail effectué
- Mise en place de l'agent « Pont » dans EQUIPE.md et JOURNAL.md
- Câblage des modules de sécurité d'Aegis dans le moteur (makeContext, approve, pathPolicy, commandPolicy)
- Mécanisme d'approbation asynchrone via stream SSE (événement `approval_required`)
- Route POST /api/approve (résolution des promesses en attente, guard token + rate limit)
- Composant ApprovalCard dans l'UI (Accepter / Refuser)
- Toggle « Mode power user » dans les réglages
- Tests Vitest pour le mécanisme d'approbation
- Câblage des modules de sécurité d'Aegis dans le moteur (makeContext, confinement chemins, allowlist commandes, parseur math, validation URL Ollama) — `pnpm test` était ROUGE (makeContext manquant), désormais 71 tests verts
- Guard token + rate limit appliqué sur /api/chat et /api/settings ; validation ollamaUrl avant sauvegarde

### État final
- `pnpm test` : 71 tests verts (43 security + 8 tools + 20 approvals)
- `pnpm typecheck` : OK (4 packages)
- `pnpm build` : OK (route /api/approve compilée)
- Sécurité d'Aegis intacte : commandes destructrices toujours refusées, approbation obligatoire, refus auto 120s, aucun auto-accept

### Fichiers modifiés
- `packages/shared/src/index.ts` — type `approval_required` + champs, `powerUser` dans Settings
- `packages/agent-core/src/tools.ts` — ToolContext durci (pathPolicy, commandPolicy, approve), makeContext
- `packages/agent-core/src/default-tools.ts` — confinement chemins + allowlist commandes + approve + safeEvalMath
- `packages/agent-core/src/agent.ts` — émission approval_required + handler approve
- `packages/agent-core/src/ollama.ts` — validation URL loopback
- `apps/web/app/api/chat/route.ts` — handler approve + Map promesses + guard
- `apps/web/app/api/approve/route.ts` — NOUVEAU
- `apps/web/components/ChatView.tsx` — ApprovalCard
- `apps/web/components/SettingsPanel.tsx` — toggle power user
- `EQUIPE.md`, `JOURNAL.md`, `SECURITE.md`

---

## Vibe — 2026-09-17 — Correctifs post-Pont (tests + sécurité réseau)

**Rôle :** Stabilisation et durcissement après le travail de Pont

### Travail effectué

3 correctifs poussés directement via l'API GitHub (fix rapides) :

1. **`packages/agent-core/vitest.config.ts`** — Restauration de l'alias `@ia-app/shared` vers le source (`../shared/src/index.ts`). Pont l'avait retiré, ce qui rendait `pnpm test` ROUGE (Vitest ne trouvait pas le package `@ia-app/shared`, cherchait un `dist/` inexistant). 70/71 tests revenus verts.

2. **`packages/agent-core/tests/approvals.test.ts`** — Remplacement de la commande `printf powerok` (Linux-only) par `node -e "process.stdout.write('powerok')"` (multiplateforme). Le test échouait sur Windows car `printf` n'existe pas. Désormais 71/71 tests verts sur Windows ET Linux.

3. **`apps/web/package.json`** — Ajout de `-H 127.0.0.1` aux scripts `dev` et `start`. Avant, `next dev -p 3000` écoutait sur `0.0.0.0` → l'API était accessible depuis le réseau local (`192.168.1.134:3000`). Maintenant restreint à localhost uniquement. Renforce le travail d'Aegis sur la restriction réseau.

### Commits
- `d6c70919` — fix: restaure alias vitest @ia-app/shared vers source (tests rouges)
- `6de1567f` — fix: test run_command multiplateforme (printf -> node -e, fonctionne sur Windows)
- `3e280238` — fix: restreint l'API a 127.0.0.1 (dev + start) - plus exposee sur le reseau local

### État
- `pnpm test` : 71/71 verts sur Windows et Linux
- API restreinte à `127.0.0.1` (localhost uniquement)
- Sécurité d'Aegis et approbation UI de Pont intactes

---
