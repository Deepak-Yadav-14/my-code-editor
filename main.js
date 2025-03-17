const { app, BrowserWindow, ipcMain, Menu, dialog } = require("electron");
const fs = require("fs");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    frame: false,

    webPreferences: {
      preload: path.join(app.getAppPath(), "preload.js"),
      nodeIntegration: false, // Disable nodeIntegration for security
      contextIsolation: true, // Enable contextIsolation
    },
  });

  win.loadFile("index.html");

  ipcMain.on("minimize", () => {
    win.minimize();
  });

  ipcMain.on("maximize", () => {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  });

  ipcMain.on("close", () => {
    win.close();
  });

  // Adding the Menu Bar File save and load system
  ipcMain.on("create-new-file", () => {
    // Logic to create a new file
    win.webContents.send("new-file-created", "New file created");
  });

  ipcMain.on("open-folder", async () => {
    const result = await dialog.showOpenDialog(win, {
      properties: ["openDirectory"],
    });
    if (!result.canceled) {
      let folderPath = result.filePaths[0];
      let folderName = path.basename(folderPath);
      // Logic to handle the opened folder
      let files = fs.readdirSync(folderPath).map((file) => {
        const fullpath = path.join(folderPath, file);
        return {
          name: file,
          path: fullpath,
          isDirectory: fs.statSync(fullpath).isDirectory(),
        };
      });

      win.webContents.send("folder-opened", { folderPath, folderName, files });
    }
  });

  ipcMain.on("save-file", (event, { filePath, content }) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) console.error("Error saving file:", err);
      else console.log("File saved:", filePath);
    });
  });

  ipcMain.on("show-save-dialog-and-save-file", async () => {
    const result = await dialog.showSaveDialog(win, {
      title: "Save File",
      defaultPath: path.join(app.getAppPath(), "Untitled.txt"),
      buttonLabel: "Save",
      filters: [
        { name: "Text Files", extensions: ["txt"] },
        { name: "All Files", extensions: ["*"] },
      ],
    });
    if (!result.canceled) {
      const filePath = result.filePath.toString();
      win.webContents.send("get-content-for-save", filePath);
    }
  });

  ipcMain.on("save-file-as", (event, { filePath, content }) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) console.error("Error saving file:", err);
      else {
        console.log("File saved as:", filePath);
        win.webContents.send("file-saved", filePath);
      }
    });
  });

  ipcMain.on("open-file", (event, filePath) => {
    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) console.error("Error reading file:", err);
      else win.webContents.send("file-content", { filePath, content: data });
    });
  });

  ipcMain.on("load-subfolder", (event, { parentPath }) => {
    console.log("Loading subfolder:", parentPath);
    const subfiles = fs.readdirSync(parentPath).map((file) => {
      const fullPath = path.join(parentPath, file);
      return {
        name: file,
        path: fullPath,
        isDirectory: fs.statSync(fullPath).isDirectory(),
      };
    });
    // console.log("Subfiles:", subfiles);
    win.webContents.send("subfolder-loaded", { parentPath, subfiles });
  });
}

// app.whenReady().then(createWindow);
app.on("ready", () => {
  createWindow();

  ipcMain.on("file_option", () => {
    const template = [
      {
        label: "File",
        submenu: [
          {
            label: "New File",
            click: () => {
              win.webContents.send("create-new-file");
            },
          },
          {
            label: "Open Folder",
            click: () => {
              win.webContents.send("open-folder");
            },
          },
          {
            label: "Save",
            click: () => {
              win.webContents.send("save-file");
            },
          },
          {
            label: "Save As",
            click: () => {
              win.webContents.send("show-save-dialog-and-save-file");
            },
          },
        ],
      },
    ];
    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
  });
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
