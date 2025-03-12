const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  saveFile: (filePath, content) => ipcRenderer.invoke('save-file', filePath, content),
  openFile: () => ipcRenderer.invoke('open-file'),
  createFolder: (folderPath) => ipcRenderer.invoke('create-folder', folderPath),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  setupWorkspace: (workspacePath) => ipcRenderer.invoke('setup-workspace', workspacePath),
  navigateFiles: (path) => ipcRenderer.invoke('navigate-files', path),
});