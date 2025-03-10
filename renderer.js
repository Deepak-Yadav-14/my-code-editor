function customPrompt(message) {
  return new Promise((resolve) => {
    const dialog = document.getElementById('prompt-dialog');
    const messageElem = document.getElementById('prompt-message');
    const inputElem = document.getElementById('prompt-input');
    const errorElem = document.getElementById('prompt-error');
    const okButton = document.getElementById('prompt-ok');
    const cancelButton = document.getElementById('prompt-cancel');

    messageElem.textContent = message;
    inputElem.value = '';
    errorElem.style.display = 'none';
    dialog.style.display = 'block';

    setTimeout(() => {
      inputElem.focus();
    }, 100);

    okButton.onclick = () => {
      const value = inputElem.value.trim();
      if (value === '') {
        errorElem.style.display = 'block';
      } else {
        dialog.style.display = 'none';
        resolve(value);
      }
    };

    cancelButton.onclick = () => {
      dialog.style.display = 'none';
      resolve(null);
    };

    inputElem.onkeydown = (e) => {
      if (e.key === 'Enter') {
        const value = inputElem.value.trim();
        if (value === '') {
          errorElem.style.display = 'block';
        } else {
          dialog.style.display = 'none';
          resolve(value);
        }
      }
    };
  });
}

window.addEventListener('DOMContentLoaded', () => {
  const welcomeScreen = document.getElementById('welcome-screen');
  const gitSetupScreen = document.getElementById('git-setup-screen');
  const editorDiv = document.getElementById('editor');
  let editor;

  // "Yes" to Git
  document.getElementById('yesGit').addEventListener('click', async () => {
    welcomeScreen.style.display = 'none';
    gitSetupScreen.style.display = 'flex';

    const gitInstalled = await window.api.checkGit();
    if (!gitInstalled) {
      alert('Git is not installed. Please install it from git-scm.com and restart the app.');
      welcomeScreen.style.display = 'flex';
      gitSetupScreen.style.display = 'none';
      return;
    }

    alert('Let’s set up Git:\n1. A browser tab will open to GitHub.\n2. Create a new repository (don’t initialize with a README).\n3. Copy the repository URL (e.g., https://github.com/username/repo.git).\n4. Come back here and click "Continue".');
    window.open('https://github.com/new', '_blank');
  });

  // "Continue" button action
  document.getElementById('continueGit').addEventListener('click', async () => {
    const repoUrl = await customPrompt('Paste the GitHub repository URL here:');
    if (!repoUrl) {
      alert('You need to provide a repository URL to continue.');
      return;
    }

    const directory = await window.api.selectDirectory();
    if (!directory) {
      alert('Please select a folder to continue.');
      return;
    }

    gitSetupScreen.style.display = 'none';
    editorDiv.style.display = 'block';
    await window.api.cloneRepo({ directory, repoUrl });
    setupEditorAndUI(directory, true);
  });

  // "No" to Git
  document.getElementById('noGit').addEventListener('click', async () => {
    welcomeScreen.style.display = 'none';
    editorDiv.style.display = 'block';
    const directory = await window.api.selectDirectory();
    if (directory) {
      setupEditorAndUI(directory, false);
    } else {
      alert('Please select a folder to continue.');
      welcomeScreen.style.display = 'flex';
    }
  });

  function setupEditorAndUI(directory, withGit) {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' } });
    require(['vs/editor/editor.main'], function () {
      editor = monaco.editor.create(editorDiv, {
        value: "// Start coding here!\n#include <iostream>\nint main() {\n  std::cout << \"Hello, World!\" << std::endl;\n  return 0;\n}",
        language: "cpp",
        theme: "vs-dark",
        automaticLayout: true
      });

      const buttonContainer = document.createElement('div');
      buttonContainer.style.position = 'absolute';
      buttonContainer.style.bottom = '10px';
      buttonContainer.style.right = '10px';
      buttonContainer.style.display = 'flex';
      buttonContainer.style.gap = '10px';

      if (withGit) {
        buttonContainer.innerHTML = `
          <button id="push">Push</button>
          <button id="pull">Pull</button>
          <button id="compile">Compile</button>
        `;
      } else {
        buttonContainer.innerHTML = `
          <button id="compile">Compile</button>
        `;
      }
      document.body.appendChild(buttonContainer);

      const buttons = buttonContainer.getElementsByTagName('button');
      for (let btn of buttons) {
        btn.style.padding = '8px 16px';
        btn.style.backgroundColor = '#007ACC';
        btn.style.color = 'white';
        btn.style.border = 'none';
        btn.style.borderRadius = '5px';
        btn.style.cursor = 'pointer';
        btn.onmouseover = () => (btn.style.backgroundColor = '#005F99');
        btn.onmouseout = () => (btn.style.backgroundColor = '#007ACC');
      }

      if (withGit) {
        document.getElementById('push').addEventListener('click', () => {
          const code = editor.getValue();
          window.api.gitPush({ directory, code });
        });
        document.getElementById('pull').addEventListener('click', () => window.api.gitPull(directory));
      }

      document.getElementById('compile').addEventListener('click', () => {
        const code = editor.getValue();
        window.api.compileCpp({ code, directory });
      });
    });
  }

  window.api.onGitResponse((message) => alert(message));
  window.api.onCompileResponse(({ success, output }) => {
    alert(success ? `Success: ${output}` : `Error: ${output}`);
  });
});