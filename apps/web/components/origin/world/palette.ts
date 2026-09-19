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

// Plan de la maison compacte : W=18 (X ∈ [-9, 9]), D=13 (Z ∈ [-6.5, 6.5])
// Cloisons : Z=-1.5 (2 portes x=±4.5), X=±4.5 avant (porte près façade), X=0 arrière
export const ROOMS = {
  salon: { x: 0, z: 2.6 },
  brain: { x: -6.8, z: 2.6 },
  interview: { x: 6.8, z: 2.6 },
  library: { x: -4.5, z: -4.0 },
  chambre: { x: 4.5, z: -4.0 },
  jardin: { x: 0, z: -9.2 },
} as const;

export const ROOM_POS: Record<string, { x: number; z: number }> = {
  // Salon = centre-avant (X ∈ [-4.5, 4.5], Z ∈ [-1.5, 6.5])
  salon: { x: 0, z: 2.6 },
  // Avant-gauche : Salle du Cerveau (X ∈ [-9, -4.5], Z ∈ [-1.5, 6.5])
  brain: { x: -6.8, z: 2.6 },
  // Avant-droite : Salle d'Interview (X ∈ [4.5, 9], Z ∈ [-1.5, 6.5])
  interview: { x: 6.8, z: 2.6 },
  // Arrière-gauche : Bibliothèque (X ∈ [-9, 0], Z ∈ [-6.5, -1.5])
  library: { x: -4.5, z: -4.0 },
  // Arrière-droite : Chambre (X ∈ [0, 9], Z ∈ [-6.5, -1.5])
  chambre: { x: 4.5, z: -4.0 },
  // Jardin : serre derrière la maison (baie vitrée arrière)
  jardin: { x: 0, z: -9.2 },
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
