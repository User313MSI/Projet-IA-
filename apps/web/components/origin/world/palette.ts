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
  brain: { x: -13.5, z: -6 },
  library: { x: -4.5, z: -14 },
  interview: { x: 13.5, z: -6 },
  salon: { x: 4.5, z: -14 },
  chambre: { x: -4.5, z: -21.5 },
  jardin: { x: 4.5, z: -21.5 },
} as const;

export const ROOM_POS: Record<string, { x: number; z: number }> = {
  brain: { x: -13.5, z: -6 },
  library: { x: -4.5, z: -14 },
  interview: { x: 13.5, z: -6 },
  salon: { x: 4.5, z: -14 },
  chambre: { x: -4.5, z: -21.5 },
  jardin: { x: 4.5, z: -21.5 },
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
