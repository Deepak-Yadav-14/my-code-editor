const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const simpleGit = require('simple-git');
const fs = require('fs');
const { exec } = require('child_process');

let selectedDirectory;
let git;

function createWindow() {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });
  win.loadFile('index.html');
}

app.whenReady().then(createWindow);

// Check if Git is installed
ipcMain.handle('check-git', async () => {
  return new Promise((resolve) => {
    exec('git --version', (error) => resolve(!error));
  });
});

// Select directory
ipcMain.handle('select-directory', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] });
  if (!result.canceled && result.filePaths.length > 0) {
    selectedDirectory = result.filePaths[0];
    return selectedDirectory;
  }
  return null;
});

// Clone the repository
ipcMain.handle('clone-repo', async (event, { directory, repoUrl }) => {
  try {
    git = simpleGit();
    await git.clone(repoUrl, directory);
    event.sender.send('git-response', 'Repository cloned successfully!');
  } catch (error) {
    event.sender.send('git-response', `Failed to clone: ${error.message}`);
  }
});

// Git push
ipcMain.on('git-push', async (event, { directory, code }) => {
  try {
    git = simpleGit(directory);
    fs.writeFileSync(path.join(directory, 'main.cpp'), code);
    await git.add('.');
    await git.commit('Update from code editor');
    await git.push('origin', 'main');
    event.sender.send('git-response', 'Pushed to GitHub!');
  } catch (error) {
    event.sender.send('git-response', `Push failed: ${error.message}`);
  }
});

// Git pull
ipcMain.on('git-pull', async (event, directory) => {
  try {
    git = simpleGit(directory);
    await git.pull('origin', 'main');
    event.sender.send('git-response', 'Pulled from GitHub!');
  } catch (error) {
    event.sender.send('git-response', `Pull failed: ${error.message}`);
  }
});

// Compile C++
ipcMain.on('compile-cpp', async (event, { code, directory }) => {
  const filePath = path.join(directory, 'main.cpp');
  const outputPath = path.join(directory, 'main');
  fs.writeFileSync(filePath, code);
  exec(`g++ "${filePath}" -o "${outputPath}"`, (error, stdout, stderr) => {
    event.sender.send('compile-response', {
      success: !error,
      output: error ? stderr || error.message : 'Compiled successfully!'
    });
  });
});