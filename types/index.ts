export interface File {
    name: string;
    path: string;
    type: 'file' | 'folder';
  }
  
  export interface Workspace {
    files: File[];
    currentFile: File | null;
  }
  
  export interface MenuOption {
    label: string;
    action: () => void;
  }