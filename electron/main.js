const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: 'STOCK-CMP',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // In production load the built index.html; in dev load Vite dev server
  if (app.isPackaged) {
    // In packaged app, the built frontend is in Resources/app_dist/
    mainWindow.loadFile(path.join(process.resourcesPath, 'app_dist', 'index.html'));
  } else {
    mainWindow.loadURL('http://localhost:5173');
  }

  mainWindow.on('closed', () => { mainWindow = null; });
}

app.whenReady().then(() => {
  createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});
