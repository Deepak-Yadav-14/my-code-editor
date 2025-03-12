import React from 'react';
import { Menu, MenuItem } from '@material-ui/core';

const MenuBar = () => {
  const handleFileNew = () => {
    console.log('New File');
  };

  const handleFileOpen = () => {
    console.log('Open File');
  };

  const handleFileSave = () => {
    console.log('Save File');
  };

  return (
    <Menu>
      <MenuItem onClick={handleFileNew}>New</MenuItem>
      <MenuItem onClick={handleFileOpen}>Open</MenuItem>
      <MenuItem onClick={handleFileSave}>Save</MenuItem>
    </Menu>
  );
};

export default MenuBar;