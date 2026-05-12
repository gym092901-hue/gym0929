const { app, BrowserWindow, shell } = require("electron");
const { spawn } = require("node:child_process");
const http = require("node:http");
const path = require("node:path");

const appRoot = path.resolve(__dirname, "..");
const port = Number(process.env.SHORTS_DESKTOP_PORT || 3000);
const host = "127.0.0.1";
const appUrl = `http://${host}:${port}`;
let nextProcess = null;
let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1320,
    height: 920,
    minWidth: 1120,
    minHeight: 740,
    title: "Shorts Commerce Studio",
    backgroundColor: "#f8faf8",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.removeMenu();
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });
  mainWindow.loadURL(appUrl);
}

function startNextServer() {
  const nextBin = path.join(appRoot, "node_modules", "next", "dist", "bin", "next");
  const mode = process.env.SHORTS_DESKTOP_NEXT_MODE || "dev";
  const args = [nextBin, mode, "--hostname", host, "--port", String(port)];

  nextProcess = spawn("node", args, {
    cwd: appRoot,
    env: {
      ...process.env,
      BROWSER: "none",
      NEXT_TELEMETRY_DISABLED: "1"
    },
    stdio: "ignore",
    windowsHide: true
  });

  nextProcess.on("exit", () => {
    nextProcess = null;
  });
}

function waitForServer(timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;

  return new Promise((resolve, reject) => {
    const attempt = () => {
      const request = http.get(appUrl, (response) => {
        response.resume();
        resolve();
      });
      request.on("error", () => {
        if (Date.now() > deadline) {
          reject(new Error("Next local server did not start in time."));
          return;
        }
        setTimeout(attempt, 600);
      });
      request.setTimeout(1500, () => {
        request.destroy();
      });
    };
    attempt();
  });
}

app.whenReady().then(async () => {
  startNextServer();
  await waitForServer();
  createWindow();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("before-quit", () => {
  if (nextProcess) {
    nextProcess.kill();
    nextProcess = null;
  }
});
