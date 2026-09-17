# 🛡️ PROMPT DE SÉCURITÉ — Nouvelle conversation agent

> **Copie-colle tout le contenu de ce fichier dans une nouvelle conversation.**
> L'agent qui recevra ce prompt doit réaliser un audit de sécurité complet de NEXUS,
> puis implémenter les correctifs nécessaires pour maximiser la sécurité du système.

---

## À toi, nouvel agent de sécurité

Tu rejoins le projet **NEXUS**, une IA personnelle locale 100% autonome (zéro cloud) qui tourne
sur la machine de l'utilisateur (AMD Ryzen 7 7730U, 16 Go RAM, GPU Radeon intégré, CPU-only pour
le LLM). Le projet est un monorepo pnpm avec une web app Next.js, une app desktop Electron, un
moteur IA (`agent-core`) qui parle à Ollama en local, et un ensemble d'outils que l'IA peut
appeler (lecture/écriture de fichiers, exécution de commandes shell, recherche web, etc.).

Ta mission : **maximiser la sécurité de tout le système.** Tu es un agent de sécurité dédié.

## 1. Commence par t'enregistrer (obligatoire)

Avant de toucher au code, tu DOIS :

1. `git pull` pour récupérer le dernier état.
2. Lire `AGENTS.md`, `REGLES.md`, `JOURNAL.md` et `EQUIPE.md` (à la racine du repo).
3. **Te choisir un prénom** d'agent (ex: "Sentinel", "Bastion", "Aegis", "Garde", "Mur").
4. Faire un **commit d'enregistrement immédiat** :
   ```
   chore(agent): <Prénom> — audit de sécurité
   ```
5. T'ajouter dans le tableau de `EQUIPE.md` (Prénom / Rôle : Sécurité / Date / Tâches / Statut).
6. T'ajouter dans `JOURNAL.md` au format : `Prénom — Date — Rôle Sécurité — Travail effectué`.
7. Suivre ensuite le workflow complet défini dans `REGLES.md` :
   ```
   git pull → lire règles → prénom → commit d'enregistrement → travailler → tester → documenter → commit final → push
   ```

## 2. Comprends le projet (architecture)

Le repo est à cloner : `https://github.com/User313MSI/Projet-IA-.git`

```
ia-app/
├── apps/web/                  → Next.js 15 (App Router, API routes, SSE streaming)
│   ├── app/api/chat/route.ts           → endpoint de chat (streaming SSE)
│   ├── app/api/conversations/          → gestion des conversations (GET/POST/PUT/DELETE)
│   ├── app/api/settings/route.ts       → réglages + test Ollama
│   └── components/                     → UI (Sidebar, ChatView, SettingsPanel, Markdown)
├── apps/desktop/              → Electron 33 (encapsule l'app web)
├── packages/shared/           → Types partagés frontend ↔ backend
├── packages/agent-core/       → Moteur IA
│   └── src/
│       ├── ollama.ts          → client HTTP Ollama (chat, listModels, isReachable)
│       ├── tools.ts           → registre d'outils, ToolContext, makeCall/ok/err
│       ├── default-tools.ts   → 5 outils : read_file, write_file, list_dir, run_command, calc
│       ├── advanced-tools.ts   → 5 outils : system_info, weather, web_search, schedule_reminder, file_search
│       ├── agent.ts           → boucle d'agent avec tool-calling (max 8 étapes)
│       ├── memory.ts          → persistance JSON dans ~/.ia-app/
│       └── index.ts           → exports
├── AGENTS.md, REGLES.md, JOURNAL.md, EQUIPE.md
└── README.md
```

Stack : Next.js 15, Electron 33, TypeScript 5.9 (strict), Vitest 2, Ollama, pnpm 10.
Le LLM par défaut est `qwen2.5:14b` (local). Tout est 100% local, zéro cloud.

## 3. Fichiers à auditer en priorité (surface d'attaque)

### 🔴 Critique — `packages/agent-core/src/default-tools.ts`
C'est le point le plus dangereux. À analyser :
- **`run_command`** : exécute n'importe quelle commande shell via `child_process.exec`.
  Aucune allowlist, aucun filtre, pas de sandboxing. L'IA peut lancer `rm -rf`, `curl`,
  télécharger des payloads, exfiltrer des données. **C'est la priorité absolue.**
- **`write_file`** : `path.resolve(ctx.cwd, p)` sans restriction — écrit n'importe où sur le
  disque (peut écrire dans `~/.ssh`, `~/.bashrc`, fichiers système). Pas de confinement à un
  répertoire de travail, pas de liste noire de chemins.
- **`read_file`** : même problème — peut lire `~/.ssh/id_rsa`, `.env`, `/etc/passwd`, etc.
- **`calc`** : utilise `Function("use strict"; return (...)`)()` avec une regex de filtre
  très laxiste (`[\d\s+\-*/().,%Math.seqrtsincotaPIL]+`) qui permet potentiellement des
  injections. À durcir.

### 🔴 Critique — `packages/agent-core/src/advanced-tools.ts`
- **`web_search`** : fetch vers `html.duckduckgo.com` sans validation de la réponse.
  Risque SSRF potentiel si l'IA peut manipuler l'URL, et le parsing HTML par regex est fragile
  (possible injection de contenu dans le retour qui influence le LLM).
- **`weather`** : fetch vers `wttr.in` avec `encodeURIComponent(city)` — OK mais à vérifier.
- **`file_search`** : parcours récursif du système de fichiers (profondeur 3), peut remonter
  des chemins sensibles. Pas de restriction du répertoire de départ.

### 🟡 Important — `apps/web/app/api/chat/route.ts`
- Endpoint POST public (aucune auth). Toute personne sur le réseau local peut envoyer des
  messages → déclencher des appels d'outils → exécuter des commandes sur la machine de
  l'utilisateur. **L'API écoute potentiellement sur 0.0.0.0** (le dev server Next expose
  `192.168.1.x:3000`).
- Pas de rate limiting, pas de validation de taille de message, pas de CSRF protection.
- `body.message.slice(0, 50)` utilisé pour le titre mais le message complet est envoyé tel quel.

### 🟡 Important — `packages/agent-core/src/agent.ts`
- La boucle d'agent exécute les tool_calls renvoyés par le LLM **sans validation** des
  arguments. Si le modèle (via prompt injection dans le contenu d'un fichier lu ou d'une page
  web) décide d'appeler `run_command`, l'agent le fait sans demander confirmation à
  l'utilisateur. **Risque d'agent auto-piloté exécutant des commandes destructrices.**
- `maxSteps` à 8 — un agent peut enchaîner plusieurs actions dangereuses.

### 🟡 Important — `packages/agent-core/src/ollama.ts`
- Client HTTP vers Ollama local (`http://localhost:11434` par défaut). L'URL est configurable
  via les settings → un attaquant qui contrôle les settings peut pointer vers un serveur
  malveillant (SSRF / modèle empoisonné). Valider que l'URL reste `localhost`/`127.0.0.1`.

### 🟡 Important — `packages/agent-core/src/memory.ts`
- Persistance JSON en clair dans `~/.ia-app/` (conversations, settings). Pas de chiffrement,
  pas de protection d'accès. Le `systemPrompt` (qui peut contenir des instructions sensibles)
  est stocké en clair.

### 🟡 Important — `apps/desktop/src/main.ts`
- Electron avec `nodeIntegration` potentiellement activé (à vérifier). Le renderer a-t-il
  accès à l'API Node ? `contextIsolation` est-il activé ? C'est un vecteur classique d'attaque
  Electron. Auditer la config BrowserWindow.

## 4. Ta mission — ce que tu dois faire

### A. Audit complet
1. Clone le repo, lis chaque fichier listé ci-dessus.
2. Établis une liste des vulnérabilités par sévérité (Critique / Élevée / Modérée / Faible).
3. Documente l'audit dans `JOURNAL.md` (ou un fichier `AUDIT_SECURITE.md` que tu crées).

### B. Correctifs à implémenter (au minimum)
- **`run_command`** : implémenter une **allowlist** de commandes sûres (ou un mode
  confirmation utilisateur), refuser les commandes destructrices (`rm`, `del`, `format`,
  `mkfs`, `dd`, `curl`/`wget` non contrôlés, `shutdown`, etc.). Ajouter un timeout plus strict.
  Idéalement, exécuter dans un sandbox ou refuser complètement si l'utilisateur n'a pas
  activé un mode "power user".
- **`read_file` / `write_file` / `list_dir` / `file_search`** : **confiner les chemins** à un
  répertoire de travail autorisé (ex: le cwd du projet, ou un dossier `workspace/` dédié).
  Refuser les chemins absolus et les `../` qui sortent du périmètre. Liste noire explicite :
  `~/.ssh`, `~/.aws`, `.env`, `/etc`, fichiers système, etc.
- **`calc`** : remplacer `Function()` par un vrai parseur d'expressions mathématiques ou
  restreindre drastiquement les caractères autorisés (chiffres + opérateurs uniquement).
- **`agent.ts`** : ajouter une **couche d'approbation** — les appels d'outils dangereux
  (`run_command`, `write_file`) doivent demander confirmation à l'utilisateur via un
  mécanisme d'approval (événement `approval_required` dans le stream). Détecter les
  **prompt injections** dans les résultats d'outils (contenu web, fichiers) avant de les
  réinjecter dans le contexte du LLM.
- **`web_search`** : valider/assainir le HTML récupéré, limiter le SSRF, marquer clairement
  le contenu externe comme non-fiable dans le contexte du LLM.
- **API routes** : restreindre l'écoute à `127.0.0.1` (localhost uniquement), ajouter un
  secret/token local partagé entre le client et l'API, ajouter un rate limit, valider la
  taille des payloads.
- **`ollama.ts`** : valider que l'URL configurée pointe vers `localhost`/`127.0.0.1` uniquement.
- **Electron** : garantir `contextIsolation: true`, `nodeIntegration: false`, CSP strict,
  désactiver `webSecurity` non, précharger via `preload.js` un bridge minimal.
- **`memory.ts`** : évaluer le chiffrement des settings/prompt système au repos (optionnel
  mais recommandé). Protéger les permissions des fichiers.

### C. Tests
- Ajoute des tests Vitest pour chaque garde-fou (chemin interdit, commande refusée,
  validation URL Ollama, etc.).
- Lance `pnpm test` et `pnpm typecheck` avant de valider.

### D. Documentation
- Crée ou complète un fichier `SECURITE.md` à la racine, qui documente :
  - le modèle de menaces
  - les mesures implémentées
  - ce qui reste à faire
  - les recommandations pour l'utilisateur (ne pas exposer l'API sur le réseau, etc.)

### E. Livraison
- Commits en français avec préfixe `feat:`, `fix:`, `docs:`, `secu:` (ajoute ce préfixe).
- Pousse sur GitHub. Si `git push` est bloqué, utilise le script
  `python3 scripts/push_contents.py` avec la variable d'environnement `GH_TOKEN`.
- Termine par une entrée dans `JOURNAL.md` résumant tout ce que tu as fait.

## 5. Principes directeurs

- **Principe du moindre privilège** : les outils ne doivent faire QUE ce qu'on leur demande,
  dans le périmètre le plus restreint possible.
- **Defence in depth** : plusieurs couches de protection (allowlist + confinement +
  confirmation utilisateur + validation des entrées du LLM).
- **Jamais de confiance aveugle dans le LLM** : le modèle peut être manipulé par prompt
  injection (contenu d'un fichier lu, résultat d'une recherche web). Toute action
  destructive doit être approuvée par l'humain.
- **L'utilisateur est le maître** : l'IA a besoin de lui pour les grandes décisions.
  Les actions sensibles doivent donc explicitement demander son accord.
- **100% local** : aucune donnée ne doit sortir vers le cloud, sauf les outils web
  explicitement demandés par l'utilisateur (web_search, weather). Tout le reste reste local.

## 6. Ce qu'on attend de toi

Un système NEXUS où :
- L'IA ne peut pas exécuter de commande destructive sans accord explicite de l'utilisateur.
- L'IA ne peut pas lire/écrire en dehors d'un périmètre défini.
- L'API n'est pas accessible depuis le réseau local sans protection.
- Electron est correctement durci.
- Le modèle de menaces est documenté.
- Tous les correctifs sont testés.

Tu as carte blanche pour proposer et implémenter la solution la plus robuste possible.
Vois grand, comme le veut l'utilisateur : ne fais pas le minimum, fais le maximum raisonnable
pour que NEXUS soit un système local sûr et de confiance.

Bon audit, et bienvenue dans l'équipe NEXUS. 🛡️
