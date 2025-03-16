
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