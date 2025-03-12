const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fileService = require('./services/fileService');
const workspaceService = require('./services/workspaceService');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'),
      contextIsolation: true,
      enableRemoteModule: false,
    }
  });

  win.loadFile('public/index.html');

  ipcMain.handle('file:save', async (event, content, filePath) => {
    return await fileService.saveFile(content, filePath);
  });

  ipcMain.handle('file:open', async (event, filePath) => {
    return await fileService.openFile(filePath);
  });

  ipcMain.handle('folder:create', async (event, folderPath) => {
    return await fileService.createFolder(folderPath);
  });

  ipcMain.handle('workspace:setup', async (event, workspacePath) => {
    return await workspaceService.setupWorkspace(workspacePath);
  });
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