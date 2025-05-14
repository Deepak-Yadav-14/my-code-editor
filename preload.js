const { contextBridge, ipcRenderer } = require("electron");

// Expose any needed versions or APIs
contextBridge.exposeInMainWorld("versions", {
  node: () => process.versions.node,
  chrome: () => process.versions.chrome,
  electron: () => process.versions.electron,
});
// Expose ipcRenderer to the renderer process
contextBridge.exposeInMainWorld("electron", {
  // ipcRenderer: {
  //   send: (channel, data) => ipcRenderer.send(channel, data),
  //   on: (channel, func) =>
  //     ipcRenderer.on(channel, (event, ...args) => func(...args)),
  // },
});

// Expose MonacoEnvironment for Monaco Web Worker loading
contextBridge.exposeInMainWorld("MonacoEnvironment", {
  getWorkerUrl: (moduleId, label) => {
    return `data:text/javascript;charset=utf-8,${encodeURIComponent(`
      self.MonacoEnvironment = { baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/' };
      importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs/base/worker/workerMain.js');
    `)}`;
  },
});

contextBridge.exposeInMainWorld("ipcRenderer", {
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, func) =>
    ipcRenderer.on(channel, (event, ...args) => func(...args)),
});
