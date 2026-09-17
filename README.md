# NEXUS — IA Locale Autonome

Assistant IA **100% local**, agent autonome avec tool-calling, mémoire persistante, interface web et application desktop. **Zéro cloud** : le modèle tourne sur ta machine via [Ollama](https://ollama.com).

## Architecture

```
ia-app/
├── apps/
│   ├── web/            # App web Next.js (interface chat futuriste)
│   └── desktop/       # App desktop Electron (encapsule l'app web)
├── packages/
│   ├── shared/        # Types partagés (contrat frontend ↔ backend)
│   └── agent-core/    # Moteur IA : client Ollama, boucle agent, outils, mémoire
```

- **TypeScript de bout en bout** (typage strict, `noUncheckedIndexedAccess`)
- **Moteur agent** : boucle de tool-calling multi-étapes, 5 outils (lire/écrire fichiers, lister, exécuter commandes, calculer)
- **Mémoire persistante** : conversations et réglages sauvegardés en local (`~/.ia-app/`)
- **Streaming temps réel** : SSE (Server-Sent Events) pour l'affichage token par token
- **Tests** : Vitest (6 tests sur le moteur d'outils)
- **CI** : GitHub Actions (build + tests + typecheck)

## Prérequis

### 1. Installer Ollama

Télécharge et installe Ollama : https://ollama.com/download

Puis télécharge le modèle :

```bash
ollama pull qwen2.5:14b
```

> Sur 16 Go RAM CPU, `qwen2.5:14b` (~9 Go RAM) est le maximum réaliste. Pour aller plus vite, `qwen2.5:7b` ou `mistral-nemo:12b` sont des alternatives.

### 2. Installer Node.js 20+

```bash
# Via nvm ou directement : https://nodejs.org
node --version  # doit afficher v20+
```

### 3. Installer pnpm

```bash
npm install -g pnpm@10
```

## Lancement

### Mode développement (web)

```bash
pnpm install
pnpm dev
```

Ouvre http://localhost:3000

### Mode développement (desktop)

```bash
pnpm dev:desktop
```

Lance Next.js + Electron ensemble.

### Build de production (web)

```bash
pnpm build
pnpm --filter @ia-app/web start
```

### Build desktop (installateur)

```bash
pnpm build:desktop
```

L'installateur est généré dans `release/` (NEXUS-Setup-0.1.0.exe sur Windows).

## Utilisation

1. Lance Ollama en arrière-plan (`ollama serve` ou l'app desktop Ollama)
2. Ouvre NEXUS (web ou desktop)
3. Vérifie le voyant "Ollama connecté" en bas à gauche (vert)
4. Si rouge : ouvre les Réglages (⚙), vérifie l'URL (`http://127.0.0.1:11434`), clique "Tester"
5. Choisis ton modèle dans les réglages
6. Discute. L'agent peut utiliser des outils (lecture/écriture de fichiers, commandes) pour répondre

## Réglages

- **Modèle** : nom du modèle Ollama
- **URL Ollama** : adresse du serveur Ollama local
- **Température / Top P / Max tokens** : paramètres de génération
- **Prompt système** : instructions de base de l'IA

## Outils disponibles (agent)

| Outil | Description |
|---|---|
| `read_file` | Lit un fichier texte |
| `write_file` | Écrit dans un fichier |
| `list_dir` | Liste le contenu d'un répertoire |
| `run_command` | Exécute une commande shell (timeout 30s) |
| `calc` | Évalue une expression mathématique |

## Données

Conversations et réglages stockés dans `~/.ia-app/` :
- `conversations.json` — historique des conversations
- `settings.json` — réglages

## Tests

```bash
pnpm test
```

## Stack

- **Next.js 15** (App Router, API routes, streaming SSE)
- **Electron 33** (desktop cross-platform)
- **TypeScript 5.9** (strict mode)
- **Vitest 2** (tests unitaires)
- **Ollama** (runtime de modèles local)
- **pnpm 10** (monorepo workspaces)
