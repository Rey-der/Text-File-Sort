const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs').promises;
const os = require('os');  

let mainWindow;

// Helper functions
function isHiddenFile(filename) {
  return filename.startsWith('.') || filename === 'node_modules';
}

async function scanDirectory(dirPath) {
  try {
    const items = await fs.readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const item of items) {
      if (isHiddenFile(item.name)) continue;

      const itemPath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const children = await scanDirectory(itemPath);
        result.push({
          name: item.name,
          path: itemPath,
          type: 'folder',
          children
        });
      } else {
        result.push({
          name: item.name,
          path: itemPath,
          type: 'file'
        });
      }
    }

    return result.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error) {
    console.error(`Error scanning directory ${dirPath}:`, error);
    throw error;
  }
}

async function cleanupTempFiles() {
  const tempDir = os.tmpdir();
  try {
    const files = await fs.readdir(tempDir);
    await Promise.all(files
      .filter(file => file.startsWith('clipboard-temp-'))
      .map(file => fs.unlink(path.join(tempDir, file))
        .catch(err => console.error(`Error deleting ${file}:`, err))
      )
    );
  } catch (err) {
    console.error('Error cleaning up temp files:', err);
  }
}

async function ensureTestDirectory() {
  const testPath = path.join(__dirname, 'Test');
  try {
    await fs.access(testPath);
  } catch {
    await fs.mkdir(testPath);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    minWidth: 600,
    minHeight: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: true
    }
  });

  // Improved Permission Handling
  const session = mainWindow.webContents.session;
  session.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'clipboard-read') {
      callback(true); // Allow clipboard reading
    } else {
      callback(false); // Deny other permissions
    }
  });

  mainWindow.loadFile('index.html');
}

// Initialize application
app.whenReady().then(async () => {
  await cleanupTempFiles();
  await ensureTestDirectory();
  createWindow();

  // Register IPC handlers
  ipcMain.handle('get-folder-content', async (event, folderPath) => {
    return await scanDirectory(folderPath);
  });

  ipcMain.handle('get-file-system', async () => {
    return await scanDirectory(path.join(__dirname, 'Test'));
  });

  ipcMain.on('open-file', async (event, filePath) => {
    try {
      const stat = await fs.stat(filePath);
      if (stat.isDirectory()) {
        const content = await scanDirectory(filePath);
        event.reply('folder-content', { path: filePath, data: content });
      } else {
        const content = await fs.readFile(filePath, 'utf8');
        event.reply('file-content', { path: filePath, data: content });
      }
    } catch (error) {
      console.error('Error accessing file:', error);
      event.reply('file-content', { path: filePath, error: error.message });
    }
  });

  ipcMain.on('save-text', async (event, text) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filePath = path.join(__dirname, 'Test', `clipboard-${timestamp}.txt`);
      await fs.writeFile(filePath, text);  // await here
      const content = await scanDirectory(path.join(__dirname, 'Test'));
      mainWindow.webContents.send('folder-content', { path: path.join(__dirname, 'Test'), data: content });
    } catch (err) {
      console.error('Error saving text:', err);
      // Consider sending an error message back to the renderer process.
      event.reply('save-text-error', err);
    }
  });

  ipcMain.on('save-image', async (event, imageData) => {
    let tempFilePath; // Declare tempFilePath outside the try block
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const extension = imageData.type.split('/')[1];
      tempFilePath = path.join(os.tmpdir(), `clipboard-temp-${timestamp}.${extension}`); // Assign here
      const finalFilePath = path.join(__dirname, 'Test', `clipboard-${timestamp}.${extension}`);
  
      const base64Data = imageData.data.split(',')[1];
      const buffer = Buffer.from(base64Data, 'base64');
  
      await fs.writeFile(tempFilePath, buffer);
      await fs.rename(tempFilePath, finalFilePath);
  
      const content = await scanDirectory(path.join(__dirname, 'Test'));
      mainWindow.webContents.send('folder-content', { path: path.join(__dirname, 'Test'), data: content });
    } catch (err) {
      console.error('Error saving image:', err);
      // Only try to delete tempFilePath if it was created
      if (tempFilePath) {
        try {
          await fs.unlink(tempFilePath);
        } catch (unlinkErr) {
          console.error('Error deleting temporary file:', unlinkErr);
        }
      }
      event.reply('save-image-error', err);
    }
  });
});

// App lifecycle handlers
app.on('window-all-closed', () => {
  cleanupTempFiles().then(() => {
    if (process.platform !== 'darwin') {
      app.quit();
    }
  });
});

app.on('before-quit', async (event) => {
  event.preventDefault();
  await cleanupTempFiles();
  app.exit();
});