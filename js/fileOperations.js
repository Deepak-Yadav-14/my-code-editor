const { dialog } = require('electron');
const fs = require('fs');
const path = require('path');

function createNewFile(win) {
  
  win.webContents.send('new-file-created', 'New file created');
}


module.exports = {
  createNewFile
};