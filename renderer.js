
window.addEventListener('DOMContentLoaded', () => {
  require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' }});
  
  let monacoEditor;
  let currentFilePath = null;

  require(['vs/editor/editor.main'], function() {
    monacoEditor = monaco.editor.create(document.getElementById('editor'), {
      value: "// Welcome to Monaco Editor in Electron!",
      language: "cpp",
      theme: "vs-dark",
      automaticLayout: true
    });
    console.log('Monaco Editor initialized:', monacoEditor);


    ipcRenderer.on('new-file-created', () => {
      console.log('New file created event received');
      monacoEditor.setValue(''); // Clear the editor
      currentFilePath = null; // Reset file path
      console.log('Editor content after clear:', monacoEditor.getValue());
    });

    
  });
});

function createNewFile() {

  ipcRenderer.send('create-new-file');
}

function openFolder() {
  ipcRenderer.send('open-folder');
}

function saveFile() {
  ipcRenderer.send('save-file');
}

function showSaveDialogAndSaveFile() {
  ipcRenderer.send('show-save-dialog-and-save-file');
}