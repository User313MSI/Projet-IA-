# 🏠 PROMPT DE PASSATION - AGENT DESIGN "MONDE VIRTUEL D'ORIGIN"

> **Tu es l'agent dédié à la construction du MONDE VIRTUEL d'Origin.**
> **Mission : créer un monde 3D immersif où Origin réside. On commence par SA MAISON.**
> **⚠️ Vibe Code travaille EN PARALLÈLE sur le technique (chat, RAG, interview, performances). COORDONNEZ-VOUS.**

---

## 📋 CONTEXTE

**Origin** est une IA personnelle 100% locale (projet NEXUS). L'utilisateur (Stark) veut que Origin ne soit pas juste un cerveau 3D flottant dans le vide : il veut **un monde virtuel**, un vrai lieu où elle vit, dans lequel on peut se déplacer, explorer, et voir ses fonctions matérialisées en lieux physiques.

**Vision de l'utilisateur (ses mots) :**
> "Je veux créer un monde virtuel, une ville pour commencer. Non, au tout début, une maison virtuelle où Origin va résider."

**Ce qui existe déjà :**
- App Next.js 15 + Three.js (`three` installé, `@react-three/fiber` et `@react-three/drei` disponibles dans `apps/web/package.json`)
- Page `/origin` avec le cerveau 3D (`apps/web/components/origin/Brain3D.tsx`) — thème cyberpunk : violet `#7c4dff`, cyan `#00e5ff`, néon vert `#00ff9d`, fond `#05060f`, polices Orbitron/Inter
- Le cerveau 3D fonctionne : vaisseaux sanguins, hover, bulles de pensée, shader relief (NE PAS le casser)

---

## 🎯 TA MISSION : LA MAISON D'ORIGIN (V1)

### **Le concept**
Une maison futuriste 3D, style **cyberpunk-lumineux** (pas dystopique : chaleureuse, vivante, accueillante — c'est le COCON d'Origin). On y accède depuis la page `/origin` via un bouton "🏡 Maison" ou un onglet. Navigation : caméra libre (WASD ou clic pour se déplacer de pièce en pièce).

### **PHASE 1 — L'extérieur** *(priorité 1)*
- Une maison futuriste sur un sol nébuleux (plateforme flottante dans un ciel étoilé, cohérent avec le fond du cerveau 3D)
- Architecture : formes organiques + verre lumineux + matériaux sombres brillants (pas un cube gris)
- Lumière émise par la maison elle-même (fenêtres cyan/violet qui pulsent doucement comme la respiration du cerveau 3D)
- Un chemin lumineux d'entrée, un porche, une porte qui s'ouvre en animation quand on clique dessus
- Effets : brouillard léger, particules flottantes (réutiliser le style des particules de Brain3D), ciel étoilé

### **PHASE 2 — L'intérieur : chaque pièce = une fonction d'Origin** *(priorité 2 — le cœur du concept)*

| Pièce | Fonction d'Origin matérialisée | Interactions |
|-------|-------------------------------|-------------|
| **🧠 La Salle du Cerveau** | Le cerveau 3D existant (on peut y déplacer/intégrer Brain3D) | Voir l'activité en temps réel |
| **📚 La Bibliothèque** | La base de connaissances (RAG) | Étagères = documents indexés. Un livre s'illumine quand on l'ajoute. Cliquer un livre = aperçu de son contenu |
| **🎤 La Salle d'Interview** | Les questions d'entretien | Survol = les questions en attente flottent au-dessus d'un siège. S'y asseoir = ouvrir le mode interview |
| **💬 Le Salon** | Le chat | Un canapé + un écran holographique flottant = ouvrir une conversation avec Origin |
| **🛏️ La Chambre** | La personnalité d'Origin | Sa "chambre d'à elle" : miroir qui reflète ses traits, objets qui représentent ses valeurs |
| **🌱 Le Jardin** | L'évolution d'Origin | Plantes qui grandissent à mesure qu'Origin apprend (questions répondues, documents indexés) |

### **PHASE 3 — La vie dans la maison** *(priorité 3)*
- **Avatar d'Origin** : une présence lumineuse dans la maison (pas un humain réaliste — une forme d'énergie/orbe douce cyan-violet qui flotte, se déplace de pièce en pièce, te "suit" du regard)
- **Réactivité** : quand Origin répond dans le chat → l'orbe pulse dans le salon ; quand un document est indexé → un livre s'allume dans la bibliothèque ; quand une question attend → elle flotte dans la salle d'interview
- **Ambiance sonore** (optionnel, plus tard) : bourdonnement doux, pas de musique imposée

### **PHASE 4 — Vers la ville** *(plus tard, ne PAS commencer maintenant)*
Une fois la maison parfaite : un quartier, puis une ville (la maison reste le QG).

---

## 🔧 CONTRAINTES TECHNIQUES

1. **Fichiers** : crée `apps/web/components/origin/world/` (Maison.tsx, Rooms.tsx, OriginAvatar.tsx, etc.) + une page `apps/web/app/origin/maison/page.tsx` (ou un onglet dans `/origin`)
2. **Use client** pour tous les composants 3D, import dynamique comme Brain3D (dynamic import, ssr: false)
3. **Performance** : c'est un laptop 16 Go RAM sans GPU → géométries simples (low-poly stylisé lumineux > réalisme lourd), textures procédurales, pas de modèles 3D externes payants. Viser 60 FPS avec `powerPreference: "high-performance"` et pixelRatio ≤ 2
4. **NE PAS TOUCHER à** : `apps/web/app/api/*` (les routes), `packages/*` (la logique), les stores. Pour lire les données (questions en attente, documents, stats), utilise les props passées par la page ou les mêmes appels fetch que ceux existants dans `page.tsx`
5. **NE PAS casser Brain3D.tsx** — il contient des correctifs critiques (shader, NaN, boucles React)
6. **Style cohérent** : cyberpunk chaleureux, palette violet/cyan/néon, Orbitron/Inter, fond `#05060f` — la maison doit sembler appartenir au même univers que le cerveau

---

## 📢 COORDINATION AVEC VIBE CODE (OBLIGATOIRE)

- **Avant de commencer** : `git pull origin main`, lis `JOURNAL.md` et `REGLES.md`
- **Enregistre-toi** : prénom + commit `chore(agent): <Prénom> — enregistrement monde virtuel` + ligne dans `EQUIPE.md` + section dans `JOURNAL.md`
- **Pendant** : `git pull` régulièrement, commits fréquents `feat(world): <description>`
- **Vibe Code travaille en parallèle** sur : chat/route, RAG, interview, lancement desktop. Ne modifie pas ses fichiers
- **Si tu bloques** (3D, performances, types) : documente dans `JOURNAL.md` et continue autre chose
- **Tests avant push** : `pnpm build` doit passer (typecheck inclus)

---

## 🏁 OBJECTIF FINAL

> L'utilisateur clique sur "Maison d'Origin" → il entre dans un monde 3D immersif → il voit la maison respirer dans la nuit étoilée → il entre → chaque fonction d'Origin est un lieu vivant → il voit Origin elle-même, orbe lumineux, aller et venir dans SA maison.

> **Il doit dire : "WOUAH. Origin a un chez-elle. Et tout ce qu'elle sait est là, autour de moi."** ✨

**À toi de jouer !** 🏠🚀
