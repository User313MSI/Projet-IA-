import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// Modèles 3D réels — pack "Ultimate Home Interior" de Quaternius (CC0).
// Chaque GLB est normalisé au chargement : échelle humaine, ancré au sol,
// centré en X/Z. Les instances sont clonées en profondeur (géométries et
// matériaux) pour survivre au dispose du montage React précédent.

export type ModelName =
  | "couch"
  | "armchair"
  | "chair"
  | "bed"
  | "bookshelf"
  | "tableDining"
  | "tableLow"
  | "tableOvalLow"
  | "nightstand"
  | "dresser"
  | "mirror"
  | "lampStand"
  | "lampSmall"
  | "lampDesk"
  | "chandelier"
  | "ceilingLight"
  | "plantTall"
  | "plantMedium"
  | "plantSmall"
  | "plantBushy"
  | "rugRect"
  | "rugRound"
  | "shelfWall";

interface ModelSpec {
  file: string;
  axis: "x" | "y" | "z";
  target: number;
  anchor?: "floor" | "center" | "hang";
}

const SPECS: Record<ModelName, ModelSpec> = {
  couch: { file: "Couch_Large1.glb", axis: "x", target: 2.3 },
  armchair: { file: "Chair_1.glb", axis: "y", target: 0.95 },
  chair: { file: "Chair_2.glb", axis: "y", target: 0.92 },
  bed: { file: "Bed_King.glb", axis: "z", target: 2.0 },
  bookshelf: { file: "Bookshelf.glb", axis: "y", target: 2.0 },
  tableDining: { file: "Table_RoundSmall.glb", axis: "y", target: 0.74 },
  tableLow: { file: "Table_RoundSmall.glb", axis: "y", target: 0.4 },
  tableOvalLow: { file: "Table_RoundLarge.glb", axis: "y", target: 0.42 },
  nightstand: { file: "NightStand_1.glb", axis: "x", target: 0.5 },
  dresser: { file: "Drawer_3.glb", axis: "x", target: 1.6 },
  mirror: { file: "Bathroom_Mirror1.glb", axis: "y", target: 0.7, anchor: "center" },
  lampStand: { file: "Light_Stand1.glb", axis: "y", target: 1.55 },
  lampSmall: { file: "Light_Floor3.glb", axis: "y", target: 0.65 },
  lampDesk: { file: "Light_Desk.glb", axis: "y", target: 0.42 },
  chandelier: { file: "Light_Chandelier.glb", axis: "x", target: 0.7, anchor: "hang" },
  ceilingLight: { file: "Light_CeilingSingle.glb", axis: "x", target: 0.26, anchor: "hang" },
  plantTall: { file: "Houseplant_8.glb", axis: "y", target: 1.1 },
  plantMedium: { file: "Houseplant_6.glb", axis: "y", target: 0.85 },
  plantSmall: { file: "Houseplant_3.glb", axis: "y", target: 0.55 },
  plantBushy: { file: "Houseplant_5.glb", axis: "y", target: 0.5 },
  rugRect: { file: "Carpet_1.glb", axis: "z", target: 3.0 },
  rugRound: { file: "Carpet_Round.glb", axis: "x", target: 1.8 },
  shelfWall: { file: "Shelf_Small3.glb", axis: "x", target: 0.9 },
};

// Hauteurs des surfaces d'étagères du Bookshelf normalisé à 2,0 m
// (mesurées sur le maillage : ~0,29 m d'espacement, 8 niveaux).
export const BOOKSHELF_SLOTS = [0.005, 0.29, 0.57, 0.85, 1.14, 1.42, 1.71, 1.98] as const;

export interface FurnitureKit {
  get(name: ModelName): THREE.Group | null;
}

const loader = new GLTFLoader();
let cached: Promise<FurnitureKit> | null = null;

function deepClone(src: THREE.Group): THREE.Group {
  const clone = src.clone(true);
  clone.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry = obj.geometry.clone();
      const mat = obj.material;
      obj.material = Array.isArray(mat) ? mat.map((m) => m.clone()) : mat.clone();
    }
  });
  return clone;
}

export function loadFurnitureKit(base = "/models/"): Promise<FurnitureKit> {
  if (cached) return cached;
  cached = (async () => {
    const normalized = new Map<ModelName, THREE.Group>();
    const names = Object.keys(SPECS) as ModelName[];
    await Promise.all(
      names.map(async (name) => {
        try {
          const spec = SPECS[name];
          const gltf = await loader.loadAsync(base + spec.file);
          const root = gltf.scene;
          root.updateMatrixWorld(true);
          const bbox = new THREE.Box3().setFromObject(root);
          const size = bbox.getSize(new THREE.Vector3());
          const raw = spec.axis === "x" ? size.x : spec.axis === "y" ? size.y : size.z;
          if (!(raw > 0) || !Number.isFinite(raw)) return;
          root.scale.setScalar(spec.target / raw);
          root.updateMatrixWorld(true);
          const bbox2 = new THREE.Box3().setFromObject(root);
          const center = bbox2.getCenter(new THREE.Vector3());
          const anchor = spec.anchor ?? "floor";
          if (anchor === "hang") {
            root.position.set(-center.x, -bbox2.max.y, -center.z);
          } else if (anchor === "center") {
            root.position.set(-center.x, -center.y, -center.z);
          } else {
            root.position.set(-center.x, -bbox2.min.y, -center.z);
          }
          const holder = new THREE.Group();
          holder.add(root);
          normalized.set(name, holder);
        } catch {
          // Modèle absent ou fetch échoué : la pièce retombe sur le mobilier procédural.
        }
      })
    );
    return {
      get(name: ModelName): THREE.Group | null {
        const src = normalized.get(name);
        return src ? deepClone(src) : null;
      },
    };
  })();
  return cached;
}

