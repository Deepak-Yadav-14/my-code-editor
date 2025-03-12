const { MonacoEnvironment } = require('monaco-editor');

function setupMonacoEditor(container) {
  const editor = monaco.editor.create(container, {
    value: '',
    language: 'javascript',
    theme: 'vs-dark',
    automaticLayout: true,
  });

  return editor;
}

document.addEventListener('DOMContentLoaded', () => {
  const editorContainer = document.getElementById('editor-container');
  const editor = setupMonacoEditor(editorContainer);

  // Add event listeners for menu actions
  const { ipcRenderer } = require('electron');

  document.getElementById('save-file').addEventListener('click', () => {
    const content = editor.getValue();
    ipcRenderer.send('save-file', content);
  });

  document.getElementById('open-file').addEventListener('click', () => {
    ipcRenderer.send('open-file');
  });

  document.getElementById('create-folder').addEventListener('click', () => {
    ipcRenderer.send('create-folder');
  });

  document.getElementById('open-folder').addEventListener('click', () => {
    ipcRenderer.send('open-folder');
  });

  document.getElementById('setup-workspace').addEventListener('click', () => {
    ipcRenderer.send('setup-workspace');
  });
});