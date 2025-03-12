import React, { useState, useEffect } from 'react';
import { List, ListItem, ListItemText } from '@material-ui/core';
import { ipcRenderer } from 'electron';

const Explorer = () => {
  const [files, setFiles] = useState([]);

  useEffect(() => {
    ipcRenderer.on('update-file-list', (event, fileList) => {
      setFiles(fileList);
    });

    // Request initial file list
    ipcRenderer.send('request-file-list');

    return () => {
      ipcRenderer.removeAllListeners('update-file-list');
    };
  }, []);

  const handleFileClick = (filePath) => {
    ipcRenderer.send('open-file', filePath);
  };

  return (
    <List>
      {files.map((file, index) => (
        <ListItem button key={index} onClick={() => handleFileClick(file.path)}>
          <ListItemText primary={file.name} />
        </ListItem>
      ))}
    </List>
  );
};

export default Explorer;