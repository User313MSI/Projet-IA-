import { app, BrowserWindow, shell, session } from "electron";
import * as path from "node:path";

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

// Politique CSP stricte : empêche l'exécution de scripts inline, le chargement
// de ressources distantes non autorisées, et limite les origines de connexion.
// Tout le contenu provient de l'origine locale (self).
const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self' http://127.0.0.1:11434 http://localhost:11434 https://wttr.in https://html.duckduckgo.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

function configureCsp(): void {
  session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
      responseHeaders: {
        ...details.responseHeaders,
        "Content-Security-Policy": [CSP],
      },
    });
  });
}

// Bloque la création de fenêtres/liaisons externes sauf ouverture explicite.
function configureNavigation(win: BrowserWindow): void {
  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
  win.webContents.on("will-navigate", (event, url) => {
    const allowed = isDev
      ? url.startsWith("http://127.0.0.1:3000") || url.startsWith("http://localhost:3000")
      : url.startsWith("file://");
    if (!allowed) {
      event.preventDefault();
      void shell.openExternal(url);
    }
  });
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    backgroundColor: "#05060f",
    title: "NEXUS — IA Locale",
    autoHideMenuBar: true,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      allowRunningInsecureContent: false,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  if (isDev) {
    mainWindow.loadURL("http://127.0.0.1:3000");
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(
      path.join(__dirname, "..", "..", "web", "out", "index.html")
    );
  }

  configureNavigation(mainWindow);
}

app.whenReady().then(() => {
  configureCsp();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
