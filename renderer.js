window.addEventListener('DOMContentLoaded', () => {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' }});
    
    require(['vs/editor/editor.main'], function() {
      monaco.editor.create(document.getElementById('editor'), {
        value: "// Welcome to Monaco Editor in Electron!",
        language: "javascript",
        theme: "vs-dark",
        automaticLayout: true
      });
    });
  });
  