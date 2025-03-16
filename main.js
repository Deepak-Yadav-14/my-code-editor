const { app, BrowserWindow, ipcMain , Menu, dialog} = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    // frame: false,
    
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'),
      nodeIntegration: false, // Disable nodeIntegration for security
      contextIsolation: true // Enable contextIsolation
    }
  });

  win.loadFile('index.html');

  ipcMain.on('minimize', () => {
    win.minimize();
  });

  ipcMain.on('maximize', () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on('close', () => {
    win.close();
  });



  // Adding the Menu Bar File save and load system
  ipcMain.on('create-new-file', () => {
    // Logic to create a new file
    console.log('New File created');
  });

  ipcMain.on('open-folder', async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory']
    });
    if (!result.canceled) {
      const folderPath = result.filePaths[0];
      console.log('Folder opened:', folderPath);
      // Logic to handle the opened folder
    }
  });

  ipcMain.on('save-file', () => {
    // Logic to save the current file
    console.log('File saved');
  });

  ipcMain.on('show-save-dialog-and-save-file', async () => {
    const result = await dialog.showSaveDialog(win, {
      title: 'Save File',
      defaultPath: path.join(app.getAppPath(), 'Untitled.txt'),
      buttonLabel: 'Save',
      filters: [
        { name: 'Text Files', extensions: ['txt'] },
        { name: 'All Files', extensions: ['*'] }
      ]
    });
    if (!result.canceled) {
      const filePath = result.filePath.toString();
      console.log('File saved as:', filePath);
      // Logic to save the file at the specified path
    }
  });


  ipcMain.on('file_option', () => {
    const template = [
      {
        label: 'File',
        submenu: [
          {
            label: 'New File',
            click: () => {
              win.webContents.send('create-new-file');
            }
          },
          {
            label: 'Open Folder',
            click: () => {
              win.webContents.send('open-folder');
            }
          },
          {
            label: 'Save',
            click: () => {
              win.webContents.send('save-file');
            }
          },
          {
            label: 'Save As',
            click: () => {
              win.webContents.send('show-save-dialog-and-save-file');
            }
          }
        ]
      }
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
    
  });

}

// app.whenReady().then(createWindow);
app.on('ready', () => {
  createWindow();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }

});


