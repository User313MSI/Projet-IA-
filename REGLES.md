# NEXUS — Règles du projet

## Identité de l'agent

Chaque nouvelle conversation qui travaille sur ce projet DOIT :
1. Se choisir un prénom d'agent (ex: "Nova", "Orion", "Echo", "Sage")
2. Faire un **commit d'enregistrement** IMMÉDIATEMENT avec le format :
   ```
   chore(agent): <Prénom> — <tâche effectuée>
   ```
   Ex: `chore(agent): Nova — amélioration du rendu Markdown`
3. Se présenter dans le journal (`JOURNAL.md`) avec son prénom, la date, et ce qu'il fait
4. Lire `AGENTS.md`, `REGLES.md`, et `JOURNAL.md` AVANT de toucher au code
5. Documenter TOUT ce qu'il fait dans le journal (fichiers modifiés, raison, tests)
6. À la fin de son travail, faire un commit final résumant ses changements

### Workflow obligatoire
```
1. git pull                          # Récupérer le dernier état
2. Lire AGENTS.md + REGLES.md + JOURNAL.md
3. Se donner un prénom
4. git commit --allow-empty -m "chore(agent): <Prénom> — <tâche>"
5. Travailler (modifier le code)
6. Tester (pnpm test && pnpm typecheck)
7. Documenter dans JOURNAL.md
8. git add -A && git commit -m "feat/fix: <description>"
9. git push
```

> Le commit d'enregistrement (étape 4) est obligatoire et doit être fait AVANT de modifier le code.
> Un agent qui ne s'est pas enregistré ne doit pas modifier le projet.

## Règles de développement

### Style de code
- TypeScript strict partout (`strict: true`, `noUncheckedIndexedAccess`)
- Pas de `any`, pas de `@ts-ignore`
- Imports sans extension `.js` (résolution Bundler)
- Nommage : `camelCase` pour variables/fonctions, `PascalCase` pour types/composants
- Fichiers en anglais, commentaires et UI en français

### Architecture
- Monorepo pnpm : `apps/web`, `apps/desktop`, `packages/shared`, `packages/agent-core`
- Types partagés dans `packages/shared/src/index.ts`
- Moteur IA dans `packages/agent-core`
- API routes dans `apps/web/app/api/`
- Composants UI dans `apps/web/components/`

### Avant de modifier du code
1. Lire `AGENTS.md` et ce fichier
2. Lire `JOURNAL.md` pour voir ce qui a été fait
3. Inspecter les fichiers à modifier et les patterns voisins
4. Faire le plus petit changement correct possible

### Tests
- Tout nouveau code dans `agent-core` doit avoir un test Vitest
- Lancer `pnpm test` avant de valider
- Lancer `pnpm typecheck` avant de valider

### Commits
- Préfixe : `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`
- Messages en français
- Un commit = un changement logique

### Interdits
- Ne jamais exposer de secrets, tokens, clés API dans le code
- Ne jamais désactiver le strict mode TypeScript
- Ne jamais push sur `main` sans avoir testé
- Ne jamais ajouter de dépendances non nécessaires
- Ne jamais contourner les tests

## Modèle IA par défaut
- `qwen2.5:14b` sur Ollama local (adapté à 16 Go RAM CPU)
- Pour aller plus vite : `qwen2.5:7b` ou `mistral-nemo:12b`
- Tout est 100% local, zéro cloud
