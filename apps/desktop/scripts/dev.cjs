const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");
const webDir = path.join(root, "apps", "web");

function startNextDev() {
  const next = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "dev", "-H", "127.0.0.1", "-p", "3000"],
    { cwd: webDir, stdio: "inherit", shell: true }
  );
  next.on("error", (err) => {
    console.error("Erreur lancement Next.js:", err);
    process.exit(1);
  });
  return next;
}

function startElectron() {
  const electronBin = path.join(
    root,
    "node_modules",
    ".bin",
    process.platform === "win32" ? "electron.cmd" : "electron"
  );
  const electron = spawn(
    electronBin,
    [path.join(__dirname, "..", "..", "desktop", "dist", "main.js")],
    { cwd: root, stdio: "inherit", shell: true }
  );
  electron.on("close", () => process.exit(0));
  return electron;
}

console.log("[desktop:dev] Build d'agent-core et shared...");
spawnSync("npx", ["pnpm", "build"], { cwd: root, stdio: "inherit", shell: true });

console.log("[desktop:dev] Démarrage de Next.js...");
const nextProc = startNextDev();

setTimeout(() => {
  console.log("[desktop:dev] Démarrage d'Electron...");
  startElectron();
}, 5000);

process.on("exit", () => {
  try {
    nextProc?.kill();
  } catch {}
});
