#!/usr/bin/env node
/**
 * Script de lancement pour NEXUS - Origin
 * Gère : mise à jour auto, installation des dépendances, lancement de l'app
 * Utilisé par le raccourci bureau
 */

const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const fs = require("node:fs");

const root = path.resolve(__dirname, "..");
const webDir = path.join(root, "apps", "web");
const desktopDir = path.join(root, "apps", "desktop");

// Couleurs pour les logs
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function log(message, color = "cyan") {
  console.log(`${colors.bright}${colors[color]}[NEXUS]${colors.reset} ${message}`);
}

function logError(message) {
  console.error(`${colors.bright}${colors.red}[NEXUS ERROR]${colors.reset} ${message}`);
}

function logSuccess(message) {
  console.log(`${colors.bright}${colors.green}[NEXUS OK]${colors.reset} ${message}`);
}

// Vérifier si on est en mode dev ou production
const isDev = process.argv.includes("--dev");
const isProduction = process.argv.includes("--prod");

// Étape 1 : Mise à jour automatique du code
function updateCode() {
  log("Mise à jour du code depuis GitHub...", "yellow");
  
  try {
    const result = spawnSync(
      "git",
      ["pull", "origin", "main"],
      { cwd: root, stdio: "pipe", encoding: "utf8" }
    );
    
    if (result.status === 0) {
      if (result.stdout && result.stdout.trim()) {
        log(result.stdout.trim(), "green");
      } else {
        logSuccess("Code déjà à jour.");
      }
      return true;
    } else {
      if (result.stderr) {
        logError(`Échec de la mise à jour : ${result.stderr.trim()}`);
      } else {
        logError("Échec de la mise à jour (code non zéro).");
      }
      return false;
    }
  } catch (err) {
    logError(`Erreur lors de la mise à jour : ${err.message}`);
    return false;
  }
}

// Étape 2 : Installation des dépendances
function installDependencies() {
  log("Vérification des dépendances...", "yellow");
  
  try {
    // Vérifier si pnpm est disponible
    const pnpmCheck = spawnSync("pnpm", ["--version"], { stdio: "pipe", shell: true });
    if (pnpmCheck.status !== 0) {
      logError("pnpm non trouvé. Veuillez installer pnpm : npm install -g pnpm");
      return false;
    }
    
    // Installation des dépendances
    log("Installation des dépendances...");
    const result = spawnSync(
      "pnpm",
      ["install"],
      { cwd: root, stdio: "inherit", shell: true }
    );
    
    if (result.status === 0) {
      logSuccess("Dépendances installées.");
      return true;
    } else {
      logError("Échec de l'installation des dépendances.");
      return false;
    }
  } catch (err) {
    logError(`Erreur lors de l'installation : ${err.message}`);
    return false;
  }
}

// Étape 3 : Build des packages
function buildPackages() {
  log("Build des packages...", "yellow");
  
  try {
    const result = spawnSync(
      "pnpm",
      ["build"],
      { cwd: root, stdio: "inherit", shell: true }
    );
    
    if (result.status === 0) {
      logSuccess("Build réussi.");
      return true;
    } else {
      logError("Échec du build.");
      return false;
    }
  } catch (err) {
    logError(`Erreur lors du build : ${err.message}`);
    return false;
  }
}

// Étape 4 : Vérifier Ollama
function checkOllama() {
  log("Vérification d'Ollama...", "yellow");
  
  try {
    // Vérifier si Ollama est en cours d'exécution
    const { platform } = process;
    let ollamaRunning = false;
    
    if (platform === "win32") {
      const result = spawnSync(
        "tasklist",
        ["/FI", "IMAGENAME eq ollama.exe"],
        { stdio: "pipe", encoding: "utf8" }
      );
      ollamaRunning = result.stdout.includes("ollama.exe");
    } else {
      // Linux/Mac
      const result = spawnSync(
        "pgrep",
        ["-f", "ollama serve"],
        { stdio: "pipe" }
      );
      ollamaRunning = result.status === 0;
    }
    
    if (!ollamaRunning) {
      log("Lancement d'Ollama...", "magenta");
      
      // Lancer Ollama en arrière-plan
      const ollama = spawn(
        platform === "win32" ? "ollama.cmd" : "ollama",
        ["serve"],
        { 
          cwd: root,
          detached: true,
          stdio: "ignore"
        }
      );
      
      ollama.unref();
      
      // Attendre que Ollama soit prêt
      log("Attente du démarrage d'Ollama (10s)...");
      
      // Simple délai - dans une vraie app, on vérifierait l'API
      return new Promise(resolve => setTimeout(resolve, 10000));
    } else {
      logSuccess("Ollama est déjà en cours d'exécution.");
      return Promise.resolve();
    }
  } catch (err) {
    logError(`Erreur avec Ollama : ${err.message}`);
    return Promise.resolve(); // Continuer même sans Ollama
  }
}

// Fallback navigateur : si Electron echoue, on ouvre le navigateur sur Next.js
let browserFallbackUsed = false;
function fallbackToBrowser() {
  if (browserFallbackUsed) return;
  browserFallbackUsed = true;
  log("Ouverture du navigateur (mode fallback) sur http://127.0.0.1:3001...", "magenta");
  log("NEXUS reste accessible tant que cette fenêtre est ouverte.");
  try {
    const { exec } = require("node:child_process");
    const cmd = process.platform === "win32"
      ? 'start "" http://127.0.0.1:3001'
      : process.platform === "darwin"
        ? "open http://127.0.0.1:3001"
        : "xdg-open http://127.0.0.1:3001";
    exec(cmd);
  } catch {
    // Le navigateur ne s'ouvre pas -> l'utilisateur peut ouvrir l'URL manuellement.
  }
}

// Étape 5 : Lancement de l'application
function launchApp() {
  if (isProduction) {
    log("Lancement en mode production...", "green");
    
    // Build d'abord
    if (!buildPackages()) {
      logError("Impossible de lancer : build échoué.");
      process.exit(1);
    }
    
    // Lancer Next.js en production
    const next = spawn(
      "node",
      ["node_modules/next/dist/bin/next", "start", "-H", "127.0.0.1", "-p", "3000"],
      { 
        cwd: webDir,
        stdio: "inherit",
        shell: true
      }
    );
    
    next.on("error", (err) => {
      logError(`Erreur de lancement : ${err.message}`);
      process.exit(1);
    });
    
    next.on("close", () => {
      log("Next.js arrêté.");
      process.exit(0);
    });
    
    // Ouvrir le navigateur
    setTimeout(() => {
      const { exec } = require("node:child_process");
      const start = process.platform === "darwin" ? "open" : 
                   process.platform === "win32" ? "start" : "xdg-open";
      exec(`${start} http://localhost:3000`);
    }, 2000);
    
    return next;
  } else {
    // Mode dev : lancer Next.js + Electron
    log("Lancement en mode développement...", "green");
    
    // Build des packages nécessaires
    log("Build des packages...");
    spawnSync(
      "pnpm",
      ["-r", "--filter=...@ia-app/shared", "build"],
      { cwd: root, stdio: "inherit", shell: true }
    );
    
    spawnSync(
      "pnpm",
      ["-r", "--filter=...@ia-app/agent-core", "build"],
      { cwd: root, stdio: "inherit", shell: true }
    );
    
    spawnSync(
      "pnpm",
      ["-r", "--filter=...@ia-app/personality-core", "build"],
      { cwd: root, stdio: "inherit", shell: true }
    );
    
    spawnSync(
      "pnpm",
      ["-r", "--filter=...@ia-app/knowledge-core", "build"],
      { cwd: root, stdio: "inherit", shell: true }
    );
    
    // Lancer Next.js
    log("Démarrage de Next.js sur http://127.0.0.1:3001...");
    const next = spawn(
      process.platform === "win32" ? "npx.cmd" : "npx",
      ["next", "dev", "-H", "127.0.0.1", "-p", "3001"],
      { cwd: webDir, stdio: "inherit", shell: true }
    );
    
    next.on("error", (err) => {
      logError(`Erreur Next.js : ${err.message}`);
      process.exit(1);
    });
    
    // Attendre que Next.js soit prêt
    setTimeout(() => {
      log("Démarrage d'Electron...");
      
      // Compiler TypeScript pour Electron
      spawnSync(
        "npx",
        ["tsc", "-p", "tsconfig.json"],
        { cwd: desktopDir, stdio: "inherit", shell: true }
      );
      
      // Lancer Electron
      const electronBin = path.join(
        desktopDir,
        "node_modules",
        ".bin",
        process.platform === "win32" ? "electron.cmd" : "electron"
      );
      
      const electron = spawn(
        electronBin,
        [path.join(desktopDir, "dist", "main.js")],
        { cwd: desktopDir, stdio: "inherit", shell: true }
      );
      
      electron.on("error", (err) => {
        logError(`Erreur Electron : ${err.message}`);
        fallbackToBrowser();
      });
      
      electron.on("close", (code) => {
        if (code !== 0 && !browserFallbackUsed) {
          logError(`Electron a échoué (code ${code}).`);
          log("Solution : lancez \"pnpm install\" dans le projet pour retélécharger le binaire Electron.");
          fallbackToBrowser();
        } else {
          log("Electron arrêté.");
          next.kill();
          process.exit(0);
        }
      });
      
      // Gérer l'arrêt
      process.on("SIGINT", () => {
        log("Arrêt en cours...");
        electron.kill();
        next.kill();
        process.exit(0);
      });
      
    }, 8000); // Attendre 8s pour que Next.js démarre
    
    return next;
  }
}

// Fonction principale
async function main() {
  console.log("\n");
  console.log("  ███╗   ██╗███████╗ ██████╗ ███╗   ██╗");
  console.log("  ████╗  ██║██╔════╝██╔═══██╗████╗  ██║");
  console.log("  ██╔██╗ ██║█████╗  ██║   ██║██╔██╗ ██║");
  console.log("  ██║╚██╗██║██╔══╝  ██║   ██║██║╚██╗██║");
  console.log("  ██║ ╚████║███████╗╚██████╔╝██║ ╚████║");
  console.log("  ╚═╝  ╚═══╝╚══════╝ ╚═════╝ ╚═╝  ╚═══╝");
  console.log("  ");
  console.log("  🧠 Origin - Cerveau Numérique");
  console.log("  ============================\n");
  
  log("Démarrage de NEXUS...", "magenta");
  
  // Étape 1 : Mise à jour
  const updated = updateCode();
  if (!updated) {
    log("Continuer sans mise à jour...", "yellow");
  }
  
  // Étape 2 : Dépendances
  const depsOk = installDependencies();
  if (!depsOk) {
    logError("Impossible de continuer : dépendances manquantes.");
    process.exit(1);
  }
  
  // Étape 3 : Build
  if (isProduction) {
    const buildOk = buildPackages();
    if (!buildOk) {
      logError("Impossible de continuer : build échoué.");
      process.exit(1);
    }
  }
  
  // Étape 4 : Vérifier Ollama
  await checkOllama();
  
  // Étape 5 : Lancer l'app
  launchApp();
}

// Démarrer
main().catch(err => {
  logError(`Erreur fatale : ${err.message}`);
  process.exit(1);
});
