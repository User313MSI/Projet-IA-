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

## Aegis — 2026-09-17 — Rôle Sécurité — Audit & durcissement complet
**Commit d'enregistrement :** `chore(agent): Aegis — audit de sécurité`

### Travail effectué
Audit de sécurité complet de NEXUS et implémentation de multiples couches de
 défense en profondeur. Création d'un module de sécurité dédié
 `packages/agent-core/src/security/` et durcissement de toute la surface
 d'attaque.

**Modèle de menaces** (voir `SECURITE.md`) : 12 vecteurs identifiés (V1–V12),
 5 scénarios d'attaque (A1–A6).

### Fichiers créés
- `packages/agent-core/src/security/safe-path.ts` — confinement des chemins
  (refus absolus/`../`, liste noire `.ssh`/`.aws`/`.env`/`.git`…)
- `packages/agent-core/src/security/safe-command.ts` — allowlist de commandes +
  liste noire destructrice (`rm -rf`, `curl`, `mkfs`, `shutdown`…), refus des
  opérateurs shell hors power user
- `packages/agent-core/src/security/safe-url.ts` — validation URL Ollama
  loopback uniquement (anti-SSRF)
- `packages/agent-core/src/security/sanitize.ts` — marquage contenu externe
  non fiable + détection prompt injection
- `packages/agent-core/src/security/math-eval.ts` — parseur arithmétique
  récursif (remplace `Function()`)
- `packages/agent-core/src/security/policies.ts`, `index.ts`
- `packages/agent-core/tests/security.test.ts` — 43 tests de sécurité
- `apps/web/lib/auth.ts` — token local partagé + rate limit + lecture body bornée
- `apps/web/lib/client.ts` — helper client `apiFetch` (header token)
- `apps/web/app/api/auth/route.ts` — distribution du token (Same-Origin)
- `apps/desktop/src/preload.ts` — bridge Electron minimal
- `SECURITE.md` — modèle de menaces, mesures, reste à faire, recommandations

### Fichiers modifiés
- `packages/agent-core/src/tools.ts` — `ToolContext` étendu
  (pathPolicy, commandPolicy, approve) + `makeContext`
- `packages/agent-core/src/default-tools.ts` — confinement chemins +
  allowlist commandes + approbation write_file + parseur calc
- `packages/agent-core/src/advanced-tools.ts` — confinement file_search +
  assainissement web_search/weather + validation ville + system_info sans PII
- `packages/agent-core/src/agent.ts` — contexte sécurisé + assainissement
  résultats externes + approbation + détection injection
- `packages/agent-core/src/ollama.ts` — validation URL à la construction/setBaseUrl
- `packages/agent-core/src/memory.ts` — permissions 0o700/0o600
- `packages/agent-core/src/index.ts` — export `security`
- `packages/agent-core/vitest.config.ts` — alias `@ia-app/shared` vers source
- `packages/agent-core/tests/tools.test.ts` — adapté au nouveau modèle
- `apps/web/app/api/chat/route.ts` — guard + taille message + body borné
- `apps/web/app/api/settings/route.ts` — guard + validation ollamaUrl + bornage
- `apps/web/app/api/conversations/route.ts` + `[id]/route.ts` — guard
- `apps/web/app/page.tsx` + `components/SettingsPanel.tsx` — `apiFetch` (token)
- `apps/desktop/src/main.ts` — sandbox + CSP + preload + navigation contrôlée
- `apps/desktop/scripts/dev.cjs` — `next dev -H 127.0.0.1`
- `apps/web/package.json` — `dev`/`start` sur `127.0.0.1`
- `EQUIPE.md` — ligne Aegis ajoutée

### État
- Tests ✅ (49/49 : 6 tools + 43 sécurité)
- Typecheck ✅ (4 packages)
- Build ✅ (`pnpm -r build`)

### Surface résiduelle connue
- Approbation UI non câblée dans le stream SSE (par défaut, les actions
  sensibles sont refusées — sûr mais bloque l'agent power user). Voir
  `SECURITE.md` §4.
- Prompt injection avancée non éliminable (l'approbation humaine reste le filet).

---
### Livraison GitHub
- Push initial bloqué par la sandbox (403 git push + appels API mutatifs interdits).
- L'utilisateur a installé l'**GitHub App Mistral** sur le dépôt (`User313MSI/Projet-IA-`).
- Après installation, le token dispose des droits d'écriture (`permissions.push: true`),
  et `git push origin main` a réussi (commits `b62bbab` + `982c68b` poussés).
- **À partir de maintenant, les futures sessions d'agent peuvent pousser directement
  via `git push origin <branche>`** (l'app reste installée sur le dépôt).
  Workflow de livraison désormais : travailler sur une branche `vibe/<slug>` ou
  `main`, puis `git push`.

---
### Déploiement local — À FAIRE (par le créateur Vibe)
- **Le durcissement n'a PAS encore été déployé/testé sur le PC de l'utilisateur.**
  Les correctifs sont poussés sur GitHub (`main`) mais l'utilisateur n'a pas encore
  cloné ni `git pull` le dépôt localement sur sa machine.
- ⚠️ **Action attendue du créateur (Vibe)** : donner à l'utilisateur les commandes
  exactes de déploiement sur son PC (clone du dépôt + `pnpm install` + relance de
  NEXUS), et valider que les protections sont actives en local.
- Commandes prévues (à confirmer par le créateur selon la structure du PC) :
  ```
  git clone https://github.com/User313MSI/Projet-IA-.git
  cd Projet-IA-
  pnpm install
  pnpm test          # vérifier 49 tests verts
  pnpm dev           # ou pnpm dev:desktop
  ```
- Tant que ce n'est pas fait, l'ancienne version (non durcie) reste celle qui tourne
  sur le PC. La sécurité n'est réellement active qu'après déploiement local.

---
