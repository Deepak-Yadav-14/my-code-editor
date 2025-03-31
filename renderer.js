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
      const expandedFolders = new Set();
      container.querySelectorAll("li.expanded").forEach((li) => {
        expandedFolders.add(li.dataset.path);
      });
      container.innerHTML = "";
      files.forEach((file) => {
        const li = document.createElement("li");
        li.textContent = file.name;
        li.dataset.path = file.path;
        if (file.isDirectory) {
          li.classList.add("folderfiles");
          if (expandedFolders.has(file.path)) {
            li.classList.add("expanded");
            ipcRenderer.send("load-subfolder", { parentPath: file.path });
          }
          li.addEventListener("click", () =>
            toggleFolder(li, file.path, container)
          );
        } else {
          li.classList.add("file");
          li.addEventListener("click", () => openFile(file.path));
        }
        container.appendChild(li);
      });
    });

    // Handle subfolder loaded
    ipcRenderer.on("subfolder-loaded", ({ parentPath, subfiles }) => {
      const escapedPath = parentPath.replace(/\\/g, "\\\\");
      const parentLi = document.querySelector(`li[data-path="${escapedPath}"]`);
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
    ipcRenderer.on("file-content", ({ filePath, content, fileName }) => {
      monacoEditor.setValue(content);

      const extension = filePath.split(".").pop().toLowerCase();
      const language = getLanguageForExtension(extension);

      if (language) {
        monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
        console.log(`Syntax highlighting updated to: ${language}`);
      } else {
        console.log(
          `No syntax highlighting available for extension: .${extension}`
        );
      }

      const index = openedFiles.findIndex((file) => file.path === filePath);
      if (index === -1) {
        openedFiles.push({ path: filePath, name: fileName });
        currentFileIndex = openedFiles.length - 1;
      } else {
        openedFiles[index].name = fileName;
        currentFileIndex = index;
      }

      updateTabs();
    });

    // Handle save dialog content request
    ipcRenderer.on("get-content-for-save", (filePath) => {
      const content = monacoEditor.getValue();
      ipcRenderer.send("save-file-as", { filePath, content });
    });

    // Handle file saved
    ipcRenderer.on("file-saved", ({ filePath, filename }) => {
      console.log(
        "File saved event received, path:",
        filePath,
        "filename:",
        filename
      );

      if (currentFileIndex === -1) {
        openedFiles.push({ path: filePath, name: filename });
        currentFileIndex = openedFiles.length - 1;
      } else {
        openedFiles[currentFileIndex].path = filePath;
        openedFiles[currentFileIndex].name = filename;
      }
      updateTabs();

      if (currentFolderPath && filePath.startsWith(currentFolderPath)) {
        ipcRenderer.send("refresh-folder", currentFolderPath); // Refresh folder
      }

      // Detect file extension and update syntax highlighting
      const extension = filePath.split(".").pop().toLowerCase();
      const language = getLanguageForExtension(extension);
      if (language) {
        monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
        console.log(`Syntax highlighting updated to: ${language}`);
      } else {
        console.log(
          `No syntax highlighting available for extension: .${extension}`
        );
      }
    });

    //Compilation logic
    ipcRenderer.on("compile-output", ({ success, output }) => {
      const statusBar = document.getElementById("statusBar");
      if (success) {
        statusBar.textContent = "Compilation Successful.";
      } else {
        statusBar.textContent = "Compilation Failed: " + output;
      }
    });

    // Sync files button
    document.getElementById("syncFiles").addEventListener("click", () => {
      if (currentFolderPath) {
        ipcRenderer.send("refresh-folder", currentFolderPath); // Refresh instead of open
      }
    });

    // Change folder button
    document.getElementById("changeFolder").addEventListener("click", () => {
      ipcRenderer.send("open-folder");
    });

    //Compile button
    document.getElementById("compileButton").addEventListener("click", () => {
      if (currentFileIndex === -1 || !openedFiles[currentFileIndex].path) {
        alert("Please save the file before compiling.");
        showSaveDialogAndSaveFile();
        return;
      }

      const filePath = openedFiles[currentFileIndex].path;
      const extension = filePath.split(".").pop().toLowerCase();
      console.log("Compiling file:", filePath, "with extension:", extension);

      if (["py", "c", "cpp", "js"].includes(extension)) {
        ipcRenderer.send("check-compiler-and-save", { filePath, extension });
      } else {
        console.log("Opening HTML file in browser:", filePath);
        ipcRenderer.send("open-in-browser", filePath); // Send event to main process
        //alert(`Unsupported file type for compilation: .${extension}`);
      }
    });

    // Handle the result of the compiler check
    ipcRenderer.on("compiler-check-result", ({ success, message }) => {
      if (success) {
        // Trigger the compile-code event after the compiler is ready
        const filePath = openedFiles[currentFileIndex].path;
        const extension = filePath.split(".").pop().toLowerCase();
        ipcRenderer.send("compile-code", { filePath, extension });
      } else {
        alert(`Error: ${message}`);
      }
    });

    // Listen for compiler installation progress
    ipcRenderer.on("compiler-install-progress", ({ success, message }) => {
      const progressContainer = document.getElementById("progressContainer");
      const progressText = document.getElementById("progressText");

      if (!progressContainer) {
        // Create a progress modal if it doesn't exist
        const modal = document.createElement("div");
        modal.id = "progressContainer";
        modal.style.position = "fixed";
        modal.style.top = "50%";
        modal.style.left = "50%";
        modal.style.transform = "translate(-50%, -50%)";
        modal.style.backgroundColor = "#333";
        modal.style.color = "#fff";
        modal.style.padding = "20px";
        modal.style.borderRadius = "8px";
        modal.style.boxShadow = "0 4px 8px rgba(0, 0, 0, 0.2)";
        modal.style.zIndex = "1000";

        const text = document.createElement("p");
        text.id = "progressText";
        text.style.margin = "0";
        modal.appendChild(text);

        const closeButton = document.createElement("button");
        closeButton.textContent = "Close";
        closeButton.style.marginTop = "10px";
        closeButton.style.padding = "5px 10px";
        closeButton.style.backgroundColor = "#4CAF50";
        closeButton.style.color = "#fff";
        closeButton.style.border = "none";
        closeButton.style.cursor = "pointer";
        closeButton.addEventListener("click", () => {
          modal.remove();
        });

        modal.appendChild(closeButton);
        document.body.appendChild(modal);
      }

      // Update the progress text
      const progressTextElement = document.getElementById("progressText");
      if (success) {
        progressTextElement.textContent = `Installing: ${message}`;
      } else {
        progressTextElement.textContent = `Error: ${message}`;
      }
    });
  });

  // File operation functions
  function createNewFile() {
    ipcRenderer.send("create-new-file");
  }

  function openFolder() {
    ipcRenderer.send("open-folder");
  }

  function saveFile() {
    if (currentFileIndex === -1) {
      showSaveDialogAndSaveFile();
    } else if (openedFiles[currentFileIndex].path) {
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
      openedFiles.push({ path: filePath, name: "Loading..." });
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
      const tab = document.createElement("li");
      tab.classList.add("tab");
      if (index === currentFileIndex) tab.classList.add("selectedFile");
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

      if (filePath) {
        ipcRenderer.send("open-file", filePath);

        // Update syntax highlighting based on the file extension
        const extension = filePath.split(".").pop().toLowerCase();
        const language = getLanguageForExtension(extension);

        if (language) {
          monaco.editor.setModelLanguage(monacoEditor.getModel(), language);
          console.log(`Syntax highlighting updated to: ${language}`);
        } else {
          console.log(
            `No syntax highlighting available for extension: .${extension}`
          );
        }
      } else {
        monacoEditor.setValue("");
      }

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

  // Function to map file extensions to Monaco Editor languages
  function getLanguageForExtension(extension) {
    const languageMap = {
      js: "javascript",
      py: "python",
      cpp: "cpp",
      c: "c",
      html: "html",
      css: "css",
      json: "json",
      txt: "plaintext",
    };
    return languageMap[extension] || null;
  }
});
