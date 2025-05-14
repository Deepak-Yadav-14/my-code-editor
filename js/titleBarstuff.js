// const { ipcRenderer } = window.electron;

var minimise = document.getElementById("minimise");
var maximise = document.getElementById("maximise");
var quit = document.getElementById("quit");

minimise.addEventListener("click", () => {
  ipcRenderer.send("minimize");
});

maximise.addEventListener("click", () => {
  ipcRenderer.send("maximize");
});

quit.addEventListener("click", () => {
  ipcRenderer.send("close");
});
