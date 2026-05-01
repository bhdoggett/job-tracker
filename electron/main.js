const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("child_process");
const path = require("path");
const http = require("http");

const ROOT = path.join(__dirname, "..");
const BACKEND_URL = "http://localhost:3300";
const CLIENT_URL = "http://localhost:5275";

let win;
let backendProc;
let clientProc;

function spawnProc(cmd, args, cwd) {
  const proc = spawn(cmd, args, { cwd, stdio: "pipe", shell: true });
  proc.stderr.on("data", (d) => process.stderr.write(d));
  return proc;
}

function waitFor(url, retries = 60, delay = 1000) {
  return new Promise((resolve, reject) => {
    const attempt = (n) => {
      http
        .get(url, (res) => {
          res.resume();
          resolve();
        })
        .on("error", () => {
          if (n <= 0) return reject(new Error(`Timed out waiting for ${url}`));
          setTimeout(() => attempt(n - 1), delay);
        });
    };
    attempt(retries);
  });
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    title: "Job Tracker",
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });

  win.loadURL(CLIENT_URL);
  win.on("closed", () => {
    win = null;
  });

  // open external links in default browser
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
}

async function startServices() {
  backendProc = spawnProc("npm", ["run", "dev", "--workspace=backend"], ROOT);
  clientProc = spawnProc("npm", ["run", "dev", "--workspace=client"], ROOT);

  await Promise.all([
    waitFor(BACKEND_URL + "/api/health").catch(() => waitFor(BACKEND_URL)),
    waitFor(CLIENT_URL),
  ]);
}

app.whenReady().then(async () => {
  await startServices();
  createWindow();
});

app.on("window-all-closed", () => {
  backendProc?.kill();
  clientProc?.kill();
  app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});
