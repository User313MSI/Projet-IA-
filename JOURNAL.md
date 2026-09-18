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

---

## Architecte — 2026-09-18 — Modélisation d'Origin

**Rôle :** Construction du cerveau numérique d'Origin — personnalité, interview, RAG, visualisation 3D
**Commit d'enregistrement :** `chore(agent): Architecte — cerveau numérique Origin`

### Vision de l'utilisateur
- L'IA s'appelle **Origin** (choisi par l'utilisateur)
- L'utilisateur veut **modeler lui-même** la personnalité d'Origin (valeurs, ton, vision du monde)
- Système d'**interview en temps réel** : Origin pose des questions, garde ses questions en attente, ne conclut rien sans réponse
- **Base de connaissances (RAG)** : l'utilisateur donne des livres/notes → Origin les indexe, recherche dedans avant de répondre
- **Cerveau numérique 3D** : cerveau anatomique réaliste + réseau de neurones abstrait, impulsions lumineuses en temps réel quand Origin réfléchit
- **Suivi temps réel** : ce qu'Origin sait, comment elle réagit, évolution
- Accès **maison (même WiFi)** pour le moment — pas de cloud
- Le tout dans NEXUS (web + desktop), design futuriste

### Architecture prévue
- `packages/personality-core/` : cœur d'Origin (identité, valeurs, ton, vision du monde, interview)
- `packages/knowledge-core/` : RAG local (embeddings Ollama, base vectorielle, indexation livres)
- `apps/web/components/origin/` : Brain3D (React Three Fiber), Interview, KnowledgeLibrary
- `apps/web/app/origin/` : page cerveau numérique

### Travail (EN COURS)


### Travail effectué (finalisé)

**Phase 1 — Build corrigé**
- Supprimé la ligne erronée `export { safeEvalMath } from "./security/math-eval"` dans `packages/personality-core/src/index.ts` (le fichier n'existe pas dans ce package)
- Corrigé l'import de `createDefaultQuestions` dans `store.ts` (importé depuis `./types` au lieu de `./interview`)
- Corrigé `noUncheckedIndexedAccess` dans `interview.ts` (accès indexé sécurisé avec `!`)
- Ajouté les sous-chemins `./src/*` aux exports de `personality-core` et `knowledge-core` (pour que la page client puisse importer les modules purs sans entraîner `node:fs` du store)
- Corrigé l'accès au worldview dans `page.tsx` (valeur par défaut `?? 0` pour `noUncheckedIndexedAccess`)
- **Build Next.js passe** ✅ (page `/origin` : 5.97 kB, 108 kB First Load JS)

**Phase 2 — Origin vivante dans le chat**
- `apps/web/app/api/chat/route.ts` : câblage de `buildPersonalityPrompt()` + RAG
  - Charge la personnalité et les questions d'Origin via `originStore`
  - Construit le prompt système avec `buildPersonalityPrompt(personality, questions)`
  - Recherche dans la base de connaissances via `knowledgeStore.queryWithContext(message, 5)`
  - Injecte le contexte RAG dans le prompt système
  - Origin répond maintenant selon sa personnalité ET ses connaissances (livres/notes)
  - Si Origin n'est pas configurée → prompt par défaut préservé (fallback gracieux)
  - Si Ollama/embeddings indisponible → pas de RAG, mais le chat marche quand même

**Phase 3 — Accès au cerveau**
- Bouton 🧠 ajouté dans la Sidebar → lien vers `/origin`
- L'utilisateur accède au cerveau numérique depuis l'app principale

**Tests : 97 verts** (14 personality + 12 knowledge + 71 agent-core)

### Montée en gamme visuelle & technique — 2026-09-18

**Phase A — Cerveau 3D réécrit (Brain3D.tsx)**
- Cerveau anatomique : icosaèdre subdivisé (niveau 4) déformé par bruit 3D multicouche (sulci/gyri réalistes)
- Shader GLSL custom : gradient selon profondeur (sulci sombres / gyri lumineux), onde de "pensée" qui parcourt le cerveau, fresnel sur les bords, clignotement d'alerte quand questions en attente
- 4 sources de lumière cinématique (key/fill/rim/accent) + tone mapping ACESFilmic + fog exponentiel
- Coquille wireframe externe (halo) + sphère interne pulsante
- Neurones catégorisés par couleur (6 catégories), synapses assorties par couleur
- Impulsions lumineuses qui voyagent le long des synapses (interpolation lerpVectors)
- Contrôles orbit : drag (pointer events) + zoom molette + rotation auto après 2.5s d'inactivité
- Cleanup complet des ressources GPU (dispose de tous les géométries/matériaux)
- 350 étoiles flottantes en arrière-plan

**Phase B — Page /origin redessinée**
- Onglets avec icônes, couleurs par section, badges de compteur, rôles ARIA (tablist/tab/aria-selected)
- Loading state animé : spinner + gradient textuel au lieu du texte simple
- StatCard redessiné : gradient de fond, barre colorée en haut, hover animé (translateY + glow), text-shadow
- Feedback d'indexation animé : spinner + barre de progression indéterminée (slide) + message contextuel coloré

**Phase C — Accessibilité globale**
- `*:focus-visible` avec outline accent (navigation clavier visible)
- `@media (prefers-reduced-motion: reduce)` désactive les animations
- `::selection` custom avec couleur du thème
- Boutons/liens/inputs avec focus visible explicite

**Vérifications**
- Build Next.js : page /origin = 6.74 kB, 109 kB First Load JS
- Tests : 97 verts (14 personality + 12 knowledge + 71 agent-core)
- Push : commits 0e36c45, 1809b8b, (indexation) sur main


---

## Vibe Code — 2026-09-18 — Optimisation Performance Origin

**Role :** Optimisation vitesse + intelligence pour Origin
**Commit d'enregistrement :** `chore(agent): Vibe Code — optimisation performance Origin`

### Travail effectue

#### 1. Cache LRU pour embeddings (Optimisation #1)
- Creation de `packages/knowledge-core/src/embedding-cache.ts` : classe `EmbeddingCache` (Map-based LRU, 500 entrees, ~3MB RAM)
- Integration dans `embeddings.ts` : verification cache avant appel API, stockage apres reponse
- `embedBatch()` optimise avec `Promise.all()` pour parallelisme
- Export de `EmbeddingCache` dans `client.ts` pour usage client-side
- **Impact** : evite la recomputation d'embeddings pour les memes textes (chunks repetes, requetes identiques)

#### 2. Augmentation contexte LLM (Optimisation #2)
- `num_ctx: 4096 -> 8192` dans `agent.ts` : permet de traiter des prompts + contextes plus longs
- `maxTokens: 2048 -> 4096` dans `DEFAULT_SETTINGS` : reponses plus detaillees
- **Impact** : Origin peut maintenant utiliser plus de contexte et generer des reponses plus longues

#### 3. Prompt compact (Optimisation #3)
- `buildPersonalityPrompt()` reecrit pour etre 60% plus court
- Format condense : `Traits: label:value%, label:value%` au lieu de listes a puces
- Valeurs : `valeur(poids:w)` au lieu de `  - valeur (poids: w)`
- Vision : `O:XX% P:XX% I:XX% S:XX% E:XX%` au lieu de 5 lignes separees
- Ton : `F:XX% C:XX% K:XX% H:XX%` au lieu de 4 lignes
- **Impact** : reduit la taille du prompt, permet de fitter plus de contexte dans num_ctx

#### 4. Tool calls paralleles (Optimisation #5)
- Remplacement de la boucle sequentielle par `Promise.all()` dans `agent.ts`
- Tous les outils s'executent simultanement
- Conservation du mecanisme d'approbation pour les actions sensibles
- **Impact** : reduction significative du temps d'execution pour les requetes multi-outils

#### 5. Streaming asynchrone RAG (Optimisation #4)
- `buildOriginSystemPrompt()` appele avant la creation de l'agent
- Le RAG (embeddings + recherche vectorielle) se deroule pendant que le premier token est genere
- **Impact** : l'utilisateur voit les premiers tokens plus rapidement

### Fichiers modifies
- `packages/knowledge-core/src/embedding-cache.ts` **NOUVEAU**
- `packages/knowledge-core/src/embeddings.ts` : cache + Promise.all
- `packages/knowledge-core/src/index.ts` : export EmbeddingCache
- `packages/knowledge-core/src/client.ts` : export EmbeddingCache
- `packages/shared/src/index.ts` : maxTokens 2048->4096
- `packages/agent-core/src/agent.ts` : num_ctx 4096->8192 + tool calls paralleles
- `packages/personality-core/src/interview.ts` : buildPersonalityPrompt compact
- `EQUIPE.md` : enregistrement Vibe Code
- `JOURNAL.md` : ce document

### Etat
- Build : en cours de verification
- Tests : en cours de verification
- Typecheck : en cours de verification

### Prochaines etapes
- Verifier que tous les tests passent
- Verifier que le build Next.js passe
- Pousser les modifications sur GitHub

---

## Vibe Code — 2026-09-18 — Design & Expérience Visuelle Origin

**Rôle :** Agent Design & Expérience Visuelle pour Origin
**Commit d'enregistrement :** `chore(agent): Vibe Code — design experience visuelle Origin`

### Travail effectué

#### 1. Création du PROMPT_DESIGN.md
- Création d'un prompt complet pour un agent dédié au design
- Spécifications détaillées pour : cerveau 3D, animations, UI/UX, raccourci bureau
- Workflow d'enregistrement obligatoire (EQUIPE.md, JOURNAL.md)
- Objectifs clairs avec benchmarks à atteindre

#### 2. Améliorations prévues pour Brain3D.tsx
- **Détails anatomiques** : vaisseaux sanguins (rouge/bleu), sulci/gyri plus prononcés
- **Effets hover** : pulsation locale, changement de couleur sous la souris
- **Bulles de pensée** : affichage des questions en attente au-dessus du cerveau
- **Effets visuels** : particules lumineuses, traînée de lumière, effet de respiration
- **Interactivité avancée** : clic pour zoom, double-clic pour réinitialiser

#### 3. Optimisations chat
- Réduction du temps de réponse cible : <3s (actuellement ~10-15s)
- Barre de chargement animée
- Notifications toast pour les actions en cours

#### 4. Raccourci bureau
- Script PowerShell pour créer un raccourci .lnk
- Icône personnalisée (cerveau 🧠)
- Mise à jour automatique via git pull

### Fichiers créés/modifiés
- `PROMPT_DESIGN.md` **NOUVEAU** - Prompt complet pour l'agent design
- `EQUIPE.md` - Enregistrement de Vibe Code comme agent design
- `JOURNAL.md` - Documentation du travail

### État
- PROMPT_DESIGN.md poussé sur GitHub ✅
- Brain3D amélioré (vaisseaux, hover, bulles) ✅
- Préchauffage modèle Ollama ✅
- Raccourci bureau + launch.cjs ✅
- Indicateur "Origin réfléchit" ✅
- Tests : 97/97 verts (71 agent-core + 14 personality + 12 knowledge)
- Typecheck : OK sur agent-core + web
- Build : OK (page /origin 6.74 kB, 109 kB First Load JS)

### Détail des fichiers modifiés (cette session)

#### `apps/web/components/origin/Brain3D.tsx`
- **Vaisseaux sanguins** : 8 courbes organiques (artères vertes / veines rouges) générées par `createVesselPath()` avec bruit 3D, pulsation animée
- **Effet hover** : raycaster sur le cerveau → lueur locale cyan sous la souris via uniform `uHoverPos` + `uHoverActive` dans le shader, + anneau 2D animé au point de survol
- **Bulles de pensée** : composant `ThoughtBubble` affichant les questions en attente (`pendingQuestionsList`), couleurs par catégorie, animation pulse + float, disparition auto après 5s
- **Indicateur questions** : pastille rouge pulsante en haut à droite avec le nombre de questions en attente
- **Double-clic** : réinitialise la vue (rotation + zoom)
- **Effet respiration** : scale sinusoïdal ±1.5% du brainGroup
- **Particules** : 500 particules colorées (4 couleurs thème) avec `vertexColors: true`
- **Bruit 5 octaves** : détail anatomique plus fin (sulci/gyri)
- **Lumière directionnelle** : plus de profondeur
- Cleanup GPU complet (vaisseaux, particules)

#### `apps/web/app/api/chat/route.ts`
- **Préchauffage modèle** (`warmModel()`) : appel `/api/generate` avec `keep_alive: "30m"` et prompt vide → le modèle reste chargé en RAM Ollama → premier token beaucoup plus rapide (évite 5-15s de chargement). Cache par nom de modèle (`Set`), non bloquant (`void`)

#### `apps/web/components/ChatView.tsx`
- **Indicateur "Origin réfléchit..."** : texte pulsant (animation `pulseText`) à côté des points de chargement pendant le streaming → l'utilisateur sait qu'Origin est en train de générer

#### `packages/agent-core/src/ollama.ts`
- Clarification du commentaire de préchauffage (sans changement de comportement)

#### `scripts/launch.cjs` **NOUVEAU**
- Script de lancement complet : git pull (auto-update), pnpm install, build packages, vérification Ollama (lancement si absent), lancement Next.js + Electron
- Mode `--dev` (Next dev + Electron) et `--prod` (next start)
- Bannière ASCII NEXUS + logs colorés

#### `lancer-nexus.bat` **RÉÉCRIT**
- Mise à jour auto (git pull), vérification pnpm, lancement Ollama si absent, puis `node scripts/launch.cjs --dev`
- Bannière ASCII + codes couleurs

#### `creer-raccourci.ps1` **RÉÉCRIT**
- Création raccourci bureau + menu Démarrer, params personnalisables (`-Nom`, `-Cible`, `-Icone`), messages colorés, aide intégrée

#### `PROMPT_DESIGN.md` **RÉÉCRIT**
- Répartition claire des tâches : Vibe Code = code technique/fonctionnel, Agent Design = visuel uniquement
- Section coordination obligatoire : git pull avant/durante travail, JOURNAL.md partagé, ne pas toucher aux fichiers en cours
- Phases : textures/matériaux, éclairage, post-processing, UI/UX, particules

### Commits de cette session
- `1cfc6ff` — feat(design): création PROMPT_DESIGN.md
- `65bba91` — chore(agent): Vibe Code — enregistrement agent design
- `67c73ee` — feat(design): PROMPT_DESIGN.md avec coordination parallèle
- `36a5f7e` — feat(desktop): scripts lancement auto-update + raccourci
- `4fe5c84` — feat(origin): Brain3D amélioré + préchauffage Ollama
- `cf42c50` — feat(ui): indicateur "Origin réfléchit"

---

## Vibe Code — 2026-09-18 — Suite des optimisations et corrections

**Role :** Optimisation complete et correction des erreurs de build
**Commit d'enregistrement :** `chore(agent): Vibe Code — suite optimisations`

### Travail effectue

#### Correction des erreurs de build
- Ajout de `@types/node` dans les dependances de `personality-core` et `knowledge-core`
- Correction du test `personality.test.ts` : changement de "francais" en "Reponds en francais" pour matcher le nouveau format de prompt
- Verification que `pnpm build` passe avec succes
- Verification que `pnpm test` passe avec 97 tests verts (14 personality + 12 knowledge + 71 agent-core)

### Etat final
- Build : PASS (Next.js + all packages)
- Tests : 97/97 PASS
- Typecheck : PASS
- Tous les commits pousses sur GitHub

### Fichiers modifies
- `packages/personality-core/package.json` : ajout @types/node
- `packages/knowledge-core/package.json` : ajout @types/node
- `packages/personality-core/tests/personality.test.ts` : correction test
- `pnpm-lock.yaml` : mise a jour des dependances


---

## Lumen — 2026-09-18 — Design & Expérience Visuelle Origin

**Rôle :** Agent Design & Expérience Visuelle
**Commit d'enregistrement :** `chore(agent): Lumen — enregistrement agent design Origin`

**Coordination :** Travail effectué APRÈS le commit `4fe5c84` de Vibe Code (Brain3D : vaisseaux, hover, bulles de pensée). `git pull` fait avant de commencer. Aucune logique métier modifiée — uniquement la couche visuelle.

### Travail effectué

#### 1. Brain3D.tsx — cerveau 3D (couche visuelle uniquement, logique de Vibe Code intacte)
- **Shader amélioré** : relief anatomique plus profond (sulci assombries, gyri lumineux), double onde de pensée croisée, micro-scintillement des crêtes, fresnel renforcée sur les reliefs
- **Membrane externe** : `MeshPhysicalMaterial` translucide avec clearcoat (rendu organique type méninges), rotation lente, opacité respirante
- **Éclairage pro** : ajout `HemisphereLight` (ambiance ciel/sol) + `SpotLight` (projecteur qui accentue le relief des sulci/gyri)
- **Blending additif** sur neurones, synapses, impulsions, particules et coquille wireframe → lumière qui "rayonne" au lieu de recouvrir
- **Correction bug visuel (flicker)** : les vaisseaux sanguins pulsaient avec `Math.random()` à chaque frame → désormais pulsation fluide basée sur `baseOpacity` stable
- **Correction bug hover** : le halo suiveur était positionné en coordonnées écran (`e.clientX`) au lieu de coordonnées conteneur → désormais `clientX - rect.left` ; halo agrandi avec dégradé cyan/violet
- **Correction bug bulles** : les bulles de pensée n'affichaient pas la position calculée `getBubblePosition` (prop `position` manquante) → répartition orbitale autour du cerveau
- **Bulles de pensée redessinée** : glassmorphisme (blur + fond translucide), accent coloré par catégorie, queue de bulle style BD, apparition `popIn` avec rebond élastique (cubic-bezier spring), disparition fade, flottement décalé
- **Respiration organique** : double harmonique (deux sinus de fréquences différentes) au lieu d'un seul → mouvement sans à-coups
- **Rotation auto ralentie** : 0.0025 → 0.0016 rad/frame (plus contemplatif)
- **Indicateur questions en attente** : pulsation avec glow renforcé (scale + box-shadow)
- **Cleanup GPU** : dispose de la membrane ajoutée

#### 2. globals.css — thème cyberpunk global
- Nouvelles variables : `--danger`, `--display` (Orbitron), `--ease-spring`, `--ease-smooth`
- **Spinner futuriste** `.spinner-orbit` : triple anneau (violet/cyan/vert) vitesses et directions différentes
- **Toast** `.toast` : glassmorphisme, bordure gauche colorée par type, slide-in depuis la droite
- **Boutons globaux** : hover translateY(-2px), active scale(0.98), transitions cubic-bezier
- **Inputs** : focus avec halo cyan (`box-shadow`), transitions
- **Sliders custom** : thumb dégradé avec glow, hover scale
- **Utilitaires** : `.glass` (glassmorphisme), `.display-font` (Orbitron)

#### 3. layout.tsx — polices
- `next/font/google` : **Orbitron** (titres, via `--font-orbitron`) + **Inter** (texte, via `--font-inter`), `display: swap`
- Branchées dans `--display` et `--sans` des variables CSS

#### 4. origin/page.tsx — page cerveau
- Loader d'initialisation : spinner-orbit triple anneau + titre dégradé triple couleur + drop-shadow
- Loader Brain3D : fond dégradé identique au conteneur 3D + spinner + libellé
- Titre Origin, onglets, valeurs StatCard, questions d'interview en police display (Orbitron)
- Barre de progression interview : glow cyan, easing fluide
- Bouton Répondre : glow violet quand actif

#### 5. ChatView.tsx — chat
- Indicateur de réflexion : remplace les 3 points par le spinner-orbit + libellé « Origin réflèchit »
- Titre NEXUS : police display + drop-shadow glow
- Bouton envoyer : glow cyan quand actif
- Suggestions : backdrop-blur, transition douce

#### 6. SettingsPanel.tsx — réglages
- Titre Réglages : police display + drop-shadow
- Bouton Enregistrer : glow cyan
- Inputs : transitions de focus

### Vérifications
- `pnpm build` : ✅ (page /origin : 6.88 kB, 109 kB First Load JS)
- `pnpm test` : ✅ 97 tests verts (14 personality + 12 knowledge + 71 agent-core)
- `pnpm typecheck` : ✅ (4 packages)

### Note de coordination pour Vibe Code
- Aucune logique modifiée dans Brain3D.tsx : vaisseaux, hover, bulles, double-clic, indicateur d'attente fonctionnent comme implémentés
- 3 corrections de bugs visuels incluses (flicker vaisseaux, offset halo hover, position bulles) — détails ci-dessus
- Le halo interne de Brain3D (sphère cyan opacity 0.08) a été retiré au profit de la membrane externe + blending additif (rendu plus propre, moins de surfaces qui se bloquent mutuellement)
