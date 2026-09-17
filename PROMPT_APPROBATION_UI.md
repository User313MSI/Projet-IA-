# 🤝 PROMPT — Câbler l'approbation UI dans le stream SSE

> **Copie-colle tout le contenu de ce fichier dans une nouvelle conversation.**
> L'agent qui recevra ce prompt doit implémenter la confirmation utilisateur
> pour les actions sensibles de l'IA (run_command hors allowlist, write_file).

---

## À toi, nouvel agent

Tu rejoins le projet **NEXUS**, une IA personnelle locale 100% autonome (zéro cloud).
Le projet est un monorepo pnpm (web app Next.js 15, desktop Electron, moteur IA `agent-core`
qui parle à Ollama en local). L'agent de sécurité **Aegis** a déjà durci tout le système :
allowlist de commandes, confinement des chemins, token API, Electron durci, 49 tests verts.

Ta mission : **câbler l'approbation UI** — actuellement, le handler d'approbation retourne
`false` par défaut, donc **toute action sensible est refusée**. L'IA ne peut pas exécuter
de commande hors allowlist ni écrire de fichiers, même avec l'accord de l'utilisateur.
Il faut que l'utilisateur puisse **valider ou refuser** chaque action sensible via l'interface.

## 1. Commence par t'enregistrer (obligatoire)

Avant de toucher au code, tu DOIS :

1. `git pull` pour récupérer le dernier état.
2. Lire `AGENTS.md`, `REGLES.md`, `JOURNAL.md`, `EQUIPE.md` et `SECURITE.md` (racine du repo).
3. **Te choisir un prénom** d'agent (ex: "Aegis" si tu continues, ou un nouveau comme
   "Pont", "Relais", "Pacte", "Lien").
4. Faire un **commit d'enregistrement immédiat** :
   ```
   chore(agent): <Prénom> — approbation UI
   ```
5. T'ajouter dans le tableau de `EQUIPE.md` (Prénom / Rôle / Date / Tâches / Statut).
6. T'ajouter dans `JOURNAL.md` au format : `Prénom — Date — Rôle — Travail effectué`.
7. Suivre le workflow complet défini dans `REGLES.md`.

## 2. Comprends l'état actuel (ce qui existe déjà)

Le repo : `https://github.com/User313MSI/Projet-IA-.git`

### Le mécanisme d'approbation EST déjà implémenté côté moteur — mais pas câblé.

**`packages/agent-core/src/tools.ts`** — `ToolContext` contient déjà :
```typescript
export interface ToolContext {
  cwd: string;
  log: (msg: string) => void;
  pathPolicy: PathPolicy;
  commandPolicy: CommandPolicy;
  approve?: (call: ToolCall) => Promise<boolean>;  // ← existe mais non câblé
}
```
Par défaut, `makeContext()` met `approve: () => Promise.resolve(false)` → **refuse tout**.

**`packages/agent-core/src/agent.ts`** — `AgentOptions` contient déjà :
```typescript
export interface AgentOptions {
  settings: Settings;
  tools?: ToolRegistry;
  cwd?: string;
  maxSteps?: number;
  onEvent?: (event: AgentStreamEvent) => void;
  powerUser?: boolean;                              // ← mode power user
  approve?: (call: ToolCall) => Promise<boolean>;  // ← handler d'approbation
}
```
Le `Agent` construit son contexte avec `approve: opts.approve` — mais la route API
**ne passe jamais de handler `approve`**, donc ça reste `undefined` → refuse tout.

**`packages/agent-core/src/default-tools.ts`** — `run_command` et `write_file`
appellent déjà `ctx.approve?.(call)` pour les actions sensibles (hors allowlist pour
`run_command`, et `write_file` demande approbation). Si `approve` est absent/`false`,
l'outil renvoie une erreur "action non approuvée".

### Ce qui manque (ta mission)

1. **`AgentStreamEvent`** (`packages/shared/src/index.ts`) n'a pas de type
   `approval_required`. Il faut l'ajouter pour que l'agent puisse demander une
   approbation en cours de stream.
2. **`apps/web/app/api/chat/route.ts`** crée l'agent SANS handler `approve` :
   `new Agent({ settings, cwd: process.cwd() })`. Il faut un mécanisme où le serveur
   peut suspendre le stream, demander au client une approbation, attendre la réponse,
   puis la passer à l'agent. Le défi : le stream SSE est unidirectionnel
   (serveur → client). Pour la réponse client → serveur, il faut soit un canal
   séparé (POST `/api/approve`), soit un protocole de polling.
3. **L'UI** (`apps/web/app/page.tsx`, `apps/web/components/ChatView.tsx`) n'a pas
   de composant de confirmation. Il faut afficher une carte "L'IA veut exécuter
   `run_command: rm tmp.log` — Accepter ? Refuser ?" avec deux boutons.
4. Le **mode power user** (`powerUser` dans `AgentOptions`) n'est pas exposé dans
   les settings. Il faudrait un toggle dans le `SettingsPanel` pour activer le
   mode power user (sinon, hors allowlist = refus même avec approbation).

## 3. Architecture recommandée (à valider avec l'utilisateur si besoin)

### Approche A — Approbation synchrone dans le stream (recommandée)

Le stream SSE reste serveur → client, mais quand l'agent veut une action sensible :
1. L'agent émet un événement `approval_required` avec l'id de l'appel et le détail
   (nom de l'outil, arguments).
2. Le stream se **met en pause** côté serveur (l'agent attend une promesse).
3. Le client affiche la carte de confirmation (Accepter / Refuser).
4. Le client POST sur `/api/approve` avec l'id de l'appel + la décision.
5. Le serveur résout la promesse → l'agent continue (exécute ou refuse).

Problème : le `ReadableStream` SSE ne se met pas facilement en pause en attendant
une réponse externe. Solution propre : stocker les promesses en attente dans une
`Map<callId, {resolve, reject}>` côté serveur, et `/api/approve` les résout.

### Approche B — Polling (plus simple, moins élégant)

L'agent envoie `approval_required`, le stream se termine proprement, le client
affiche la carte, l'utilisateur décide, le client renvoie un nouveau POST
`/api/chat` avec la décision et l'historique. Plus simple mais casse le flux
continu. **Préfère l'approche A.**

### Ce qu'il faut implémenter

1. **`packages/shared/src/index.ts`** :
   - Ajouter `"approval_required"` au type `AgentStreamEvent["type"]`.
   - Ajouter des champs : `approvalId?: string`, `toolCall?: ToolCall`,
     `reason?: string` (pourquoi l'approbation est demandée).

2. **`packages/agent-core/src/agent.ts`** :
   - Au lieu d'appeler `ctx.approve` directement dans les outils, l'agent doit
     **émettre** `approval_required` quand un outil le demande, attendre la
     réponse via un callback `opts.approve`, puis exécuter ou refuser.
   - Ou bien : garder `ctx.approve` dans les outils, mais faire que le handler
     `approve` passé par la route API émette l'événement SSE et attende la réponse
     du client via la Map de promesses.

3. **`apps/web/app/api/chat/route.ts`** :
   - Créer une `Map<approvalId, {resolve: (ok: boolean) => void}>` (à scopes
     par conversation/request pour éviter les fuites).
   - Passer un handler `approve` à l'agent qui :
     - émet `approval_required` dans le stream,
     - retourne une promesse stockée dans la Map.
   - Gérer le timeout (ex: 120s sans réponse → refus auto).

4. **`apps/web/app/api/approve/route.ts`** (NOUVEAU) :
   - POST `{ conversationId, approvalId, accepted: boolean }`.
   - Résout la promesse correspondante dans la Map.
   - Protéger avec le même `guard` (token + rate limit) que les autres routes.

5. **`apps/web/app/page.tsx`** + **`ChatView.tsx`** :
   - État `pendingApproval: { id, toolCall } | null`.
   - Quand on reçoit `approval_required` dans le stream SSE, l'afficher.
   - Composant `ApprovalCard` : "L'IA veut exécuter `<outil>`" + arguments
     (affichés en code), boutons **Accepter** / **Refuser**.
   - Au clic, POST `/api/approve` + mettre à jour l'UI.

6. **`apps/web/components/SettingsPanel.tsx`** :
   - Ajouter un toggle **"Mode power user"** (désactivé par défaut).
   - Quand activé, passer `powerUser: true` à l'agent (via settings ou un flag).
   - Ajouter `powerUser: boolean` à `Settings` dans `packages/shared`.

## 4. Contraintes de sécurité (à respecter absolument)

- **Ne JAMAIS contourner l'approbation** — l'approbation reste obligatoire pour
  toute action sensible. C'est le filet de sécurité d'Aegis.
- **Les commandes toujours refusées** (rm -rf, curl, wget, sudo, etc.) restent
  refusées MÊME avec approbation et en power user. Ne pas toucher à l'allowlist.
- **Timeout d'approbation** : si l'utilisateur ne répond pas, refus auto après
  120s (configurable).
- **Pas d'auto-accept** : on ne mémorise pas "toujours accepter" pour un outil.
  Chaque appel sensible demande une approbation explicite.
- Conserver `pnpm test` vert (49 tests existants) + ajouter des tests pour le
  nouveau mécanisme (timeout, refus, accept).

## 5. Tests
- Ajoute des tests Vitest pour : émission de `approval_required`, résolution par
  accept, résolution par refuse, timeout d'approbation.
- Lance `pnpm test` (doit rester vert : 49 + tes nouveaux) et `pnpm typecheck`.

## 6. Documentation & livraison
- Mets à jour `JOURNAL.md` avec ton prénom, ce que tu as fait, les fichiers
  modifiés/créés.
- Mets à jour `SECURITE.md` §4 (qui dit que l'approbation UI n'est pas câblée)
  pour marquer cette partie comme **faite**.
- Commits en français : `feat: approbation UI ...`, `fix: ...`, `docs: ...`.
- Pousse sur GitHub (`git push` fonctionne maintenant — l'app Mistral est
  installée sur le repo).
- L'utilisateur fera ensuite `git pull` + `pnpm install` + `pnpm test` sur son PC.

## 7. Ce qu'on attend de toi

Une fois terminé :
- L'IA qui demande à exécuter une commande hors allowlist → une carte s'affiche
  dans le chat → l'utilisateur clique Accepter → la commande s'exécute.
- L'IA qui veut écrire un fichier → carte → l'utilisateur valide → l'écriture se fait.
- L'utilisateur clique Refuser (ou ne répond pas pendant 120s) → l'outil est refusé,
  l'IA reçoit "action non approuvée" et continue normalement.
- Le mode power user est activable dans les réglages (sinon, hors allowlist = refus
  même avec approbation).
- Tous les tests passent. La sécurité d'Aegis est intacte.

Vois grand mais reste robuste : ce mécanisme est critique pour la sécurité.
Bienvenue dans l'équipe NEXUS. 🤝
