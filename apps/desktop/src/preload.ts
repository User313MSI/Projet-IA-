/**
 * Préchargeur Electron : expose un bridge minimal et sécurisé au renderer.
 * contextIsolation: true + sandbox: true → le renderer n'a aucun accès direct
 * à Node.js ni aux APIs Electron privilégiées. Seule la surface explicitement
 * exposée via contextBridge est accessible.
 */
import { contextBridge } from "electron";

const nexusApi = {
  version: "1.0.0",
  platform: process.platform,
};

try {
  contextBridge.exposeInMainWorld("nexus", nexusApi);
} catch {
  // En cas d'échec de l'exposition, on ne plante pas le renderer.
}

export type NexusApi = typeof nexusApi;
