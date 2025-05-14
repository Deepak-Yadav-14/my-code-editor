const {
  app,
  BrowserWindow,
  ipcMain,
  Menu,
  dialog,
  shell,
} = require("electron");
const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");
const simpleGit = require("simple-git");
const git = simpleGit();

const tdmGccPath = path.join(__dirname, "resources", "tdm-gcc", "bin");
process.env.PATH += `;${tdmGccPath}`;

console.log("TDM-GCC added to PATH:", tdmGccPath);

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

  // In main.js
  ipcMain.on("open-folder", async (event, folderPath) => {
    if (!folderPath) {
      // No folderPath provided, open dialog (e.g., "Change Folder")
      const result = await dialog.showOpenDialog(win, {
        properties: ["openDirectory"],
      });
      if (!result.canceled) {
        folderPath = result.filePaths[0];
      } else {
        return; // User canceled, do nothing
      }
    }
    // Process folder (whether from dialog or provided path)
    const folderName = path.basename(folderPath);
    const files = fs.readdirSync(folderPath).map((file) => {
      const fullpath = path.join(folderPath, file);
      return {
        name: file,
        path: fullpath,
        isDirectory: fs.statSync(fullpath).isDirectory(),
      };
    });
    win.webContents.send("folder-opened", { folderPath, folderName, files });
  });

  ipcMain.on("refresh-folder", (event, folderPath) => {
    // Refresh the specified folder without opening dialog
    const folderName = path.basename(folderPath);
    const files = fs.readdirSync(folderPath).map((file) => {
      const fullpath = path.join(folderPath, file);
      return {
        name: file,
        path: fullpath,
        isDirectory: fs.statSync(fullpath).isDirectory(),
      };
    });
    win.webContents.send("folder-opened", { folderPath, folderName, files });
  });

  ipcMain.on("save-file", (event, { filePath, content }) => {
    fs.writeFile(filePath, content, (err) => {
      if (err) console.error("Error saving file:", err);
      else {
        console.log("File saved:", filePath);
        const filename = path.basename(filePath);
        win.webContents.send("file-saved", { filePath, filename });
      }
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
        const filename = path.basename(filePath);
        win.webContents.send("file-saved", { filePath, filename });
      }
    });
  });

  ipcMain.on("open-file", (event, filePath) => {
    fs.readFile(filePath, "utf-8", (err, data) => {
      if (err) {
        console.error("Error reading file:", err);
      } else {
        const fileName = path.basename(filePath); // Use path.basename here
        win.webContents.send("file-content", {
          filePath,
          content: data,
          fileName,
        });
      }
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

  // Compilation logic
  ipcMain.on("compile-code", (event, { filePath, extension }) => {
    let command;

    switch (extension) {
      case "py":
        command = `start cmd /k "python "${filePath}" & pause"`; // Open a new terminal, run Python, and pause
        break;
      case "c":
        const cOutputPath = filePath.replace(/\.c$/, "");
        command = `start cmd /k "gcc "${filePath}" -o "${cOutputPath}" && "${cOutputPath}" & pause"`; // Open a new terminal, compile C, run the program, and pause
        break;
      case "cpp":
        const cppOutputPath = filePath.replace(/\.cpp$/, "");
        command = `start cmd /k "g++ "${filePath}" -o "${cppOutputPath}" && "${cppOutputPath}" & pause"`; // Open a new terminal, compile C++, run the program, and pause
        break;
      case "js":
        command = `start cmd /k "node "${filePath}" & pause"`; // Open a new terminal, run Node.js, and pause
        break;
      default:
        event.reply("compile-output", {
          success: false,
          output: "Unsupported file type.",
        });
        return;
    }

    exec(command, (error, stdout, stderr) => {
      if (error) {
        event.reply("compile-output", {
          success: false,
          output: stderr || error.message,
        });
      } else {
        event.reply("compile-output", {
          success: true,
          output: stdout || "Compilation succeeded.",
        });
      }
    });
  });

  ipcMain.on("open-in-browser", async (event, filePath) => {
    console.log("File Path received in main process:", filePath);

    if (!filePath) {
      console.error("No file path provided to open in browser.");
      return;
    }

    if (!fs.existsSync(filePath)) {
      console.error("File does not exist:", filePath);
      return;
    }

    // Normalize the file path to use forward slashes
    const normalizedFilePath = filePath.replace(/\\/g, "/");

    // List of common browsers
    const browsers = [
      { name: "Google Chrome", command: "chrome" },
      { name: "Mozilla Firefox", command: "firefox" },
      { name: "Microsoft Edge", command: "msedge" },
      { name: "Internet Explorer", command: "iexplore" },
    ];

    // Prompt the user to select a browser
    const selectedBrowser = await dialog.showMessageBox({
      type: "question",
      buttons: browsers.map((browser) => browser.name),
      title: "Select Browser",
      message: "Choose a browser to open the file:",
    });

    const browserIndex = selectedBrowser.response;
    if (browserIndex < 0 || browserIndex >= browsers.length) {
      console.error("No browser selected.");
      return;
    }

    const browserCommand = browsers[browserIndex].command;

    // Encode the normalized file path and open it with the selected browser
    const encodedFilePath = `file://${normalizedFilePath}`;
    console.log("Encoded File Path:", encodedFilePath);

    exec(`start ${browserCommand} "${encodedFilePath}"`, (error) => {
      if (error) {
        console.error("Failed to open file in browser:", error.message);
      } else {
        console.log(`File opened in ${browsers[browserIndex].name}:`, filePath);
      }
    });
  });

  ipcMain.on(
    "check-compiler-and-save",
    async (event, { filePath, extension }) => {
      console.log("Checking compiler for extension:", extension);

      // Define compilers and their check commands
      const compilers = {
        py: {
          check: "python --version",
          install:
            "winget install python --accept-source-agreements --accept-package-agreements",
        },
        js: {
          check: "node --version",
          install:
            "winget install -e --id OpenJS.NodeJS --accept-source-agreements",
        },
      };

      if (extension === "c" || extension === "cpp") {
        // Skip installation compile C and C++ since TDM-GCC is pre-bundled
        ipcMain.emit("compile-code", event, { filePath, extension });
        return;
      }

      const compiler = compilers[extension];
      if (!compiler) {
        console.error("Unsupported file type:", extension);
        event.reply("compiler-check-result", {
          success: false,
          message: "Unsupported file type.",
        });
        return;
      }

      // Check if the compiler is available
      exec(compiler.check, (error, stdout, stderr) => {
        if (error) {
          console.error(`Compiler not found for ${extension}:`, error.message);

          // Prompt the user to install the compiler
          dialog
            .showMessageBox({
              type: "warning",
              buttons: ["Install", "Cancel"],
              title: "Compiler Not Found",
              message: `The required compiler for ${extension.toUpperCase()} files is not installed.\nWould you like to install it now?`,
            })
            .then((result) => {
              if (result.response === 0) {
                // Install the compiler
                const installProcess = exec(compiler.install);

                installProcess.stdout.on("data", (data) => {
                  console.log(`Installing ${extension} compiler:`, data);
                  event.reply("compiler-install-progress", {
                    success: true,
                    message: data.trim(),
                  });
                });

                installProcess.stderr.on("data", (data) => {
                  console.error(
                    `Error during ${extension} compiler installation:`,
                    data
                  );
                  event.reply("compiler-install-progress", {
                    success: false,
                    message: data.trim(),
                  });
                });

                installProcess.on("close", (code) => {
                  if (code === 0) {
                    console.log(
                      `Compiler installed successfully for ${extension}.`
                    );
                    event.reply("compiler-check-result", {
                      success: true,
                      message: `Compiler installed successfully for ${extension.toUpperCase()}.`,
                    });
                  } else {
                    console.error(
                      `Installation process exited with code ${code}.`
                    );
                    event.reply("compiler-check-result", {
                      success: false,
                      message: `Failed to install compiler for ${extension.toUpperCase()}.`,
                    });
                  }
                });
              } else {
                event.reply("compiler-check-result", {
                  success: false,
                  message: `Compiler for ${extension.toUpperCase()} not installed.`,
                });
              }
            });
        } else {
          console.log(`Compiler found for ${extension}:`, stdout || stderr);
          event.reply("compiler-check-result", {
            success: true,
            message: `${extension.toUpperCase()} compiler is already installed.`,
          });
        }
      });
    }
  );

  ipcMain.on("git-check-login", async (event) => {
    try {
      const isRepo = await git.checkIsRepo();
      if (!isRepo) {
        event.reply("git-repo-options");
      } else {
        event.reply("git-operations");
      }
    } catch (error) {
      console.error("Git error:", error);
      event.reply("git-login-prompt");
    }
  });

  ipcMain.on("git-login", async (event, { username, password }) => {
    try {
      await git.addConfig("user.name", username);
      await git.addConfig("user.password", password);
      console.log("GitHub login successful.");
      event.reply("git-repo-options");
    } catch (error) {
      console.error("Git login error:", error);
      event.reply("git-login-prompt");
    }
  });

  ipcMain.on("git-create-repo", async (event, { repoName }) => {
    try {
      await git.init();
      await git.addRemote("origin", `https://github.com/${repoName}.git`);
      console.log("Repository created and linked.");
      event.reply("git-operations");
    } catch (error) {
      console.error("Git create repo error:", error);
    }
  });

  ipcMain.on("git-use-existing-repo", async (event) => {
    try {
      console.log("Using existing repository.");
      event.reply("git-operations");
    } catch (error) {
      console.error("Git use existing repo error:", error);
    }
  });

  ipcMain.on("git-commit", async (event, { message }) => {
    try {
      await git.add("./*");
      await git.commit(message);
      console.log("Changes committed.");
    } catch (error) {
      console.error("Git commit error:", error);
    }
  });

  ipcMain.on("git-push", async () => {
    try {
      await git.push("origin", "main");
      console.log("Changes pushed to GitHub.");
    } catch (error) {
      console.error("Git push error:", error);
    }
  });

  ipcMain.on("git-pull", async () => {
    try {
      await git.pull("origin", "main");
      console.log("Changes pulled from GitHub.");
    } catch (error) {
      console.error("Git pull error:", error);
    }
  });

  ipcMain.on("git-view", async () => {
    try {
      const repoUrl = await git.getConfig("remote.origin.url");
      shell.openExternal(repoUrl.value);
    } catch (error) {
      console.error("Git view error:", error);
    }
  });

  ipcMain.handle(
    "show-input-dialog",
    async (event, { title, message, type }) => {
      const result = await dialog.showMessageBox({
        type: "question",
        buttons: ["OK", "Cancel"],
        title: title || "Input",
        message: message || "Enter input:",
        noLink: true, // Prevents "Don't ask me again" checkbox
      });

      if (result.response === 0) {
        // Simulate input value (since dialog.showMessageBox doesn't support input fields)
        const input = await dialog.showMessageBox({
          type: "question",
          buttons: ["Submit"],
          title: title || "Input",
          message: message || "Enter input:",
          detail:
            "Simulated input dialog. Replace with a custom input dialog if needed.",
        });
        return input.response === 0 ? "Simulated Input Value" : null;
      }
      return null; // User canceled
    }
  );

  ipcMain.handle("show-confirm-dialog", async (event, { title, message }) => {
    const { response } = await dialog.showMessageBox({
      type: "question",
      buttons: ["Yes", "No"],
      title: title || "Confirm",
      message: message || "Are you sure?",
    });

    return response === 0; // Return true if "Yes" was clicked
  });

  ipcMain.handle(
    "show-select-dialog",
    async (event, { title, message, options }) => {
      const { response } = await dialog.showMessageBox({
        type: "question",
        buttons: options,
        title: title || "Select",
        message: message || "Choose an option:",
      });

      return options[response]; // Return the selected option
    }
  );
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
