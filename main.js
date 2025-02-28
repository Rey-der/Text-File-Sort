// main.js
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
  });
  mainWindow.loadFile('index.html');
}

// Recursively read the directory structure
function readDirectory(dirPath) {
  const items = fs.readdirSync(dirPath, { withFileTypes: true });
  return items
    .filter(item => !item.name.startsWith('.'))
    .map(item => {
      const itemPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        return {
          name: item.name,
          type: "folder",
          path: itemPath,
          children: readDirectory(itemPath)
        };
      } else {
        return { 
          name: item.name, 
          type: "file",
          path: itemPath
        };
      }
    });
}

// Function to open a file (or return folder content if needed)
function openFile(fileName) {
  let filePath = path.isAbsolute(fileName)
    ? fileName
    : path.join(app.getAppPath(), 'Test', fileName);

  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const folderContent = readDirectory(filePath);
      mainWindow.webContents.send('folder-content', { path: filePath, data: folderContent });
    } else {
      // Read file and send its content to renderer.
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          console.error('Error reading file:', err);
          return;
        }
        mainWindow.webContents.send('file-content', { path: filePath, data: data });
      });
    }
  } catch (err) {
    console.error("Error accessing file:", err);
  }
}

app.whenReady().then(() => {
  createWindow();

  // Directory to load – "Test" folder relative to the app directory
  const directoryPath = path.join(app.getAppPath(), 'Test');

  // Expose the file system tree via IPC.
  ipcMain.handle('get-file-system', async () => {
    return readDirectory(directoryPath);
  });

  // Listen for file-open requests from the renderer.
  ipcMain.on('open-file', (event, fileName) => {
    openFile(fileName);
  });
});

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
