window.addEventListener('DOMContentLoaded', () => {
    require.config({ paths: { 'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.52.2/min/vs' }});
    
    require(['vs/editor/editor.main'], function() {
      monaco.editor.create(document.getElementById('editor'), {
        value: "// Welcome to Monaco Editor in Electron!",
        language: "cpp",
        theme: "vs-dark",
        automaticLayout: true
      });
    });
  });
  //buttons
  /*
  const remote=require("electron").remote;
var minimise=document.getElementById("minimise");
var maximise=document.getElementById("maximise");
var quit=document.getElementById("quit");

minimise.addEventListener("click",minimiseApp);
maximise.addEventListener("click",maximiseApp);
quit.addEventListener("click",quitApp);
function minimiseApp(){
    remote.BrowserWindow.getFocusedWindow().minimize();
}
function maximiseApp(){
    remote.BrowserWindow.getFocusedWindow().maximize();
}
function quitAppApp(){
    remote.getCurrentWindow().close();
}
  */