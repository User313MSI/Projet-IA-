/** Palette et constantes du monde virtuel d'Origin (cyberpunk chaleureux). */

export const COLORS = {
  bg: 0x05060f,
  violet: 0x7c4dff,
  cyan: 0x00e5ff,
  green: 0x00ff9d,
  pink: 0xff6b9d,
  gold: 0xffb300,
  white: 0xffffff,

  darkShell: 0x140f2e,
  darkGlass: 0x0a1428,
  floor: 0x0d0a1f,
  path: 0x00303a,
  soil: 0x120b20,
} as const;

export const ROOMS = {
  salon: { x: 0, z: 3 },
  brain: { x: -9.8, z: 3 },
  interview: { x: 9.8, z: 3 },
  library: { x: -6.5, z: -7 },
  chambre: { x: 6.5, z: -7 },
  jardin: { x: 0, z: -14 },
} as const;

export const ROOM_POS: Record<string, { x: number; z: number }> = {
  // Plan de la maison : W=26 (X ∈ [-13, 13]), D=20 (Z ∈ [-11, 9])
  // Cloisons : Z=-3 (traversante, ouverture centre), X=±6.5 (avant), X=0 (arrière)
  // Salon = centre-avant (X ∈ [-6.5, 6.5], Z ∈ [-3, 9])
  salon: { x: 0, z: 3 },
  // Avant-gauche : Salle du Cerveau (X ∈ [-13, -6.5], Z ∈ [-3, 9])
  brain: { x: -9.8, z: 3 },
  // Avant-droite : Salle d'Interview (X ∈ [6.5, 13], Z ∈ [-3, 9])
  interview: { x: 9.8, z: 3 },
  // Arrière-gauche : Bibliothèque (X ∈ [-13, 0], Z ∈ [-11, -3])
  library: { x: -6.5, z: -7 },
  // Arrière-droite : Chambre (X ∈ [0, 13], Z ∈ [-11, -3])
  chambre: { x: 6.5, z: -7 },
  // Le Jardin : baie vitrée à l'arrière → serre extérieure derrière la maison
  jardin: { x: 0, z: -14 },
};

export const ROOM_NAMES: Record<string, string> = {
  brain: "Salle du Cerveau",
  library: "Bibliothèque",
  interview: "Salle d'Interview",
  salon: "Salon",
  chambre: "Chambre",
  jardin: "Jardin",
};

export interface CategoryInfo {
  label: string;
  color: number;
  css: string;
}

export const CATEGORY_INFO: Record<string, CategoryInfo> = {
  identite: { label: "Identité", color: 0x00e5ff, css: "#00e5ff" },
  valeurs: { label: "Valeurs", color: 0xff6b9d, css: "#ff6b9d" },
  ton: { label: "Ton", color: 0xffb300, css: "#ffb300" },
  vision: { label: "Vision", color: 0x00ff9d, css: "#00ff9d" },
  limites: { label: "Limites", color: 0xff5252, css: "#ff5252" },
  connaissances: { label: "Connaissances", color: 0x00e5ff, css: "#00e5ff" },
  relation: { label: "Relation", color: 0x7c4dff, css: "#7c4dff" },
};

export const DOC_TYPE_INFO: Record<string, { color: number; label: string }> = {
  pdf: { color: 0xff6b9d, label: "PDF" },
  txt: { color: 0x00e5ff, label: "TXT" },
  epub: { color: 0xffb300, label: "EPUB" },
  markdown: { color: 0x00ff9d, label: "MD" },
  note: { color: 0x7c4dff, label: "Note" },
  web: { color: 0x00e5ff, label: "Web" },
};

export const TRAIT_INFO: Record<string, { label: string; color: number; css: string }> = {
  curiosity: { label: "Curiosité", color: 0x00e5ff, css: "#00e5ff" },
  warmth: { label: "Chaleur", color: 0xff6b9d, css: "#ff6b9d" },
  precision: { label: "Précision", color: 0x00ff9d, css: "#00ff9d" },
  humor: { label: "Humour", color: 0xffb300, css: "#ffb300" },
  empathy: { label: "Empathie", color: 0xff9ecd, css: "#ff9ecd" },
  creativity: { label: "Créativité", color: 0x7c4dff, css: "#7c4dff" },
  rigor: { label: "Rigueur", color: 0x00ffa0, css: "#00ffa0" },
};

export function traitInfo(key: string): { label: string; color: number; css: string } {
  return TRAIT_INFO[key] ?? { label: key, color: 0x00e5ff, css: "#00e5ff" };
}
