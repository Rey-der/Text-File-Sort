const { app, BrowserWindow } = require('electron');
const path = require('path');

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,    // Mindestbreite
    minHeight: 400,   // Mindesthöhe
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // Lade die index.html aus dem aktuellen Verzeichnis
  mainWindow.loadFile('index.html');

  // Optional: Entwicklerwerkzeuge öffnen
  // mainWindow.webContents.openDevTools();
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
