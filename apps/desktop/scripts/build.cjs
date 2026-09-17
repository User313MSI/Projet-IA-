const { spawnSync } = require("node:child_process");
const path = require("node:path");

const root = path.resolve(__dirname, "..", "..", "..");

console.log("[desktop:build] Build des packages shared + agent-core...");
spawnSync("npx", ["pnpm", "build"], { cwd: root, stdio: "inherit", shell: true });

console.log("[desktop:build] Build de l'app web Next.js (static export)...");
spawnSync("npx", ["pnpm", "--filter", "@ia-app/web", "build"], {
  cwd: root,
  stdio: "inherit",
  shell: true,
});

console.log("[desktop:build] Build de l'app Electron...");
spawnSync("npx", ["electron-builder"], {
  cwd: path.join(root, "apps", "desktop"),
  stdio: "inherit",
  shell: true,
});

console.log("[desktop:build] Terminé.");
