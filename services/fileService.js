const fs = require('fs');
const path = require('path');

const fileService = {
  saveFile: (filePath, data) => {
    return new Promise((resolve, reject) => {
      fs.writeFile(filePath, data, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  },

  openFile: (filePath) => {
    return new Promise((resolve, reject) => {
      fs.readFile(filePath, 'utf8', (err, data) => {
        if (err) {
          return reject(err);
        }
        resolve(data);
      });
    });
  },

  createFolder: (folderPath) => {
    return new Promise((resolve, reject) => {
      fs.mkdir(folderPath, { recursive: true }, (err) => {
        if (err) {
          return reject(err);
        }
        resolve();
      });
    });
  },

  openFolder: (folderPath) => {
    return new Promise((resolve, reject) => {
      fs.readdir(folderPath, (err, files) => {
        if (err) {
          return reject(err);
        }
        resolve(files);
      });
    });
  }
};

module.exports = fileService;