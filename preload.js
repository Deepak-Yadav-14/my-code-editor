const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  checkGit: () => ipcRenderer.invoke('check-git'),
  selectDirectory: () => ipcRenderer.invoke('select-directory'),
  cloneRepo: (data) => ipcRenderer.invoke('clone-repo', data),
  gitPush: (data) => ipcRenderer.send('git-push', data),
  gitPull: (directory) => ipcRenderer.send('git-pull', directory),
  compileCpp: (data) => ipcRenderer.send('compile-cpp', data),
  onGitResponse: (callback) => ipcRenderer.on('git-response', (event, message) => callback(message)),
  onCompileResponse: (callback) => ipcRenderer.on('compile-response', (event, data) => callback(data))
});

contextBridge.exposeInMainWorld('MonacoEnvironment', {
  getWorkerUrl: (moduleId, label) => {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = { baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/' };
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/base/worker/workerMain.js');
    `)}`;
  }
});