window.addEventListener("DOMContentLoaded", () => {
  require.config({
    paths: {
      vs: "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs",
    },
  });

  let monacoEditor;
  let openedFiles = [];
  let currentFileIndex = -1;
  let currentFolderPath = null;

  require(["vs/editor/editor.main"], function () {
    monacoEditor = monaco.editor.create(document.getElementById("editor"), {
      value: "// Welcome to Monaco Editor in Electron!",
      language: "cpp",
      theme: "vs-dark",
      automaticLayout: true,
    });
    console.log("Monaco Editor initialized:", monacoEditor);

    ipcRenderer.on("new-file-created", () => {
      openedFiles.push({ path: null, name: "Untitled" });
      currentFileIndex = openedFiles.length - 1;
      monacoEditor.setValue("");
      updateTabs();
    });

    ipcRenderer.on("folder-opened", ({ folderPath, folderName, files }) => {
      currentFolderPath = folderPath;
      document.getElementById("folderName").textContent = folderName;
      const container = document.querySelector(".exploredFilesContainer");
      container.innerHTML = "";
      files.forEach((file) => {
        const li = document.createElement("li");
        li.textContent = file.name;
        li.dataset.path = file.path;
        // console.log(" Li path ", li.dataset.path);
        if (file.isDirectory) {
          li.classList.add("folderfiles");
          li.addEventListener("click", () => {
            console.log("toggle Folder");
            toggleFolder(li, file.path, container);
          });
        } else {
          li.classList.add("file");
          li.addEventListener("click", () => openFile(file.path));
        }
        container.appendChild(li);
      });
    });

    // Handle subfolder loaded
    ipcRenderer.on("subfolder-loaded", ({ parentPath, subfiles }) => {
      console.log("Parent Path", parentPath);
      const escapedPath = parentPath.replace(/\\/g, "\\\\");
      const parentLi = document.querySelector(`li[data-path="${escapedPath}"]`);
      console.log("Parent Li:", parentLi);
      if (parentLi) {
        subfiles.forEach((subfile) => {
          const subLi = document.createElement("li");
          subLi.textContent = subfile.name;
          subLi.dataset.path = subfile.path;
          subLi.classList.add("child");
          if (subfile.isDirectory) {
            subLi.classList.add("folderFiles");
            subLi.addEventListener("click", () =>
              toggleFolder(subLi, subfile.path, parentLi.parentNode)
            );
          } else {
            subLi.classList.add("file");
            subLi.addEventListener("click", () => openFile(subfile.path));
          }
          parentLi.parentNode.insertBefore(subLi, parentLi.nextSibling);
        });
      } else {
        console.error(`Could not find parent li for path: ${parentPath}`);
      }
    });

    // Handle file content
    ipcRenderer.on("file-content", ({ filePath, content }) => {
      monacoEditor.setValue(content);
      const index = openedFiles.findIndex((file) => file.path === filePath);
      if (index !== -1) currentFileIndex = index;
      updateTabs();
    });

    // Handle save dialog content request
    ipcRenderer.on("get-content-for-save", (filePath) => {
      const content = monacoEditor.getValue();
      ipcRenderer.send("save-file-as", { filePath, content });
    });

    // Handle file saved
    ipcRenderer.on("file-saved", (filePath) => {
      if (currentFileIndex !== -1) {
        openedFiles[currentFileIndex].path = filePath;
        openedFiles[currentFileIndex].name = path.basename(filePath);
        updateTabs();
      }
    });

    // Sync files button
    document.getElementById("syncFiles").addEventListener("click", () => {
      if (currentFolderPath) ipcRenderer.send("open-folder", currentFolderPath);
    });

    // Change folder button
    document.getElementById("changeFolder").addEventListener("click", () => {
      ipcRenderer.send("open-folder");
    });
  });

  // Handle file content
  ipcRenderer.on("file-content", ({ filePath, content }) => {
    monacoEditor.setValue(content);
    const index = openedFiles.findIndex((file) => file.path === filePath);
    if (index !== -1) currentFileIndex = index;
    updateTabs();
  });

  // // Handle save dialog content request
  // ipcRenderer.on("get-content-for-save", (event, filePath) => {
  //   const content = monacoEditor.getValue();
  //   ipcRenderer.send("save-file-as", { filePath, content });
  // });

  // // Handle file saved
  // ipcRenderer.on("file-saved", ( filePath) => {
  //   if (currentFileIndex !== -1) {
  //     openedFiles[currentFileIndex].path = filePath;
  //     openedFiles[currentFileIndex].name = path.basename(filePath);
  //     updateTabs();
  //   }
  // });

  // // Sync files button
  // document.getElementById("syncFiles").addEventListener("click", () => {
  //   if (currentFolderPath) ipcRenderer.send("open-folder", currentFolderPath);
  // });

  // // Change folder button
  // document.getElementById("changeFolder").addEventListener("click", () => {
  //   ipcRenderer.send("open-folder");
  // });

  // File operation functions
  function createNewFile() {
    ipcRenderer.send("create-new-file");
  }

  function openFolder() {
    ipcRenderer.send("open-folder");
  }

  function saveFile() {
    if (currentFileIndex !== -1 && openedFiles[currentFileIndex].path) {
      const filePath = openedFiles[currentFileIndex].path;
      const content = monacoEditor.getValue();
      ipcRenderer.send("save-file", { filePath, content });
    } else {
      showSaveDialogAndSaveFile();
    }
  }

  function showSaveDialogAndSaveFile() {
    ipcRenderer.send("show-save-dialog-and-save-file");
  }

  function openFile(filePath) {
    const index = openedFiles.findIndex((file) => file.path === filePath);
    if (index === -1) {
      openedFiles.push({ path: filePath, name: path.basename(filePath) });
      currentFileIndex = openedFiles.length - 1;
    } else {
      currentFileIndex = index;
    }
    ipcRenderer.send("open-file", filePath);
    updateTabs();
  }

  function toggleFolder(li, folderPath, container) {
    if (li.classList.contains("expanded")) {
      li.classList.remove("expanded");
      let next = li.nextSibling;
      while (next && next.classList.contains("child")) {
        const temp = next.nextSibling;
        container.removeChild(next);
        next = temp;
      }
    } else {
      li.classList.add("expanded");
      console.log("Expanding");
      ipcRenderer.send("load-subfolder", { parentPath: folderPath });
    }
  }

  function updateTabs() {
    const tabContainer = document.querySelector(".filesContainer");
    tabContainer.innerHTML = "";
    openedFiles.forEach((file, index) => {
      const tab = document.createElement("div");
      tab.classList.add("tab");
      if (index === currentFileIndex) tab.classList.add("active");
      tab.textContent = file.name;
      tab.addEventListener("click", () => switchToTab(index));
      const closeBtn = document.createElement("span");
      closeBtn.textContent = "x";
      closeBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeTab(index);
      });
      tab.appendChild(closeBtn);
      tabContainer.appendChild(tab);
    });
  }

  function switchToTab(index) {
    if (index !== currentFileIndex) {
      currentFileIndex = index;
      const filePath = openedFiles[index].path;
      if (filePath) ipcRenderer.send("open-file", filePath);
      else monacoEditor.setValue("");
      updateTabs();
    }
  }

  function closeTab(index) {
    openedFiles.splice(index, 1);
    if (currentFileIndex === index) {
      currentFileIndex = -1;
      monacoEditor.setValue("");
    } else if (currentFileIndex > index) {
      currentFileIndex--;
    }
    updateTabs();
  }

  // Expose functions to global scope for HTML onclick
  window.createNewFile = createNewFile;
  window.openFolder = openFolder;
  window.saveFile = saveFile;
  window.showSaveDialogAndSaveFile = showSaveDialogAndSaveFile;
});
