# NEXUS — Guide de l'agent

## Contexte

NEXUS est une IA locale autonome : agent avec tool-calling, mémoire persistante, interface web et desktop. 100% local via Ollama. TypeScript de bout en bout (monorepo pnpm).

## Architecture

```
apps/web/          → Next.js 15 (App Router, API routes, SSE streaming)
apps/desktop/      → Electron 33 (encapsule l'app web)
packages/shared/   → Types partagés frontend ↔ backend
packages/agent-core/ → Moteur IA : client Ollama, boucle agent, outils, mémoire
```

## Commandes essentielles

```bash
pnpm install          # Installer les dépendances
pnpm dev              # Lancer l'app web (http://localhost:3000)
pnpm dev:desktop      # Lancer l'app desktop (Electron + Next)
pnpm build            # Build de production
pnpm test             # Tests (Vitest)
pnpm typecheck        # Vérification des types
```

## Avant de travailler

1. Lire `REGLES.md` — les règles obligatoires
2. Lire `JOURNAL.md` — l'historique des interventions
3. Choisir un prénom d'agent
4. Faire un commit d'enregistrement : `chore(agent): <Prénom> — <tâche>`
5. Se déclarer dans `JOURNAL.md` avec son prénom
6. Vérifier `git status` et la branche courante

## Points critiques

- Les imports internes des packages se font SANS extension `.js`
- `transpilePackages` dans `next.config.js` permet à Next de compiler les packages source
- Les API routes utilisent `runtime = "nodejs"` (pas Edge)
- Le streaming chat utilise SSE (Server-Sent Events)
- La mémoire persiste dans `~/.ia-app/` (conversations.json, settings.json)

## Modèle

- Défaut : `qwen2.5:14b` (Ollama local)
- CPU-only sur Ryzen 7 7730U, 16 Go RAM
- ~3 tok/s sur 14B, ~8 tok/s sur 7B
