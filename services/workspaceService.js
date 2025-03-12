import fs from 'fs';
import path from 'path';

const workspace = {
  files: [],
  currentDirectory: '',
};

export const setupWorkspace = (directory) => {
  workspace.currentDirectory = directory;
  workspace.files = fs.readdirSync(directory).map(file => ({
    name: file,
    path: path.join(directory, file),
  }));
};

export const navigateToDirectory = (directory) => {
  if (fs.existsSync(directory) && fs.lstatSync(directory).isDirectory()) {
    setupWorkspace(directory);
  } else {
    throw new Error('Invalid directory');
  }
};

export const getWorkspaceFiles = () => {
  return workspace.files;
};

export const getCurrentDirectory = () => {
  return workspace.currentDirectory;
};