// preload.js — expose safe IPC API to the renderer
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseDir: () => ipcRenderer.invoke('choose-dir'),
  commonDirs: () => ipcRenderer.invoke('common-dirs'),
  start: (cfg) => ipcRenderer.invoke('start-scrape', cfg),
  status: () => ipcRenderer.invoke('scrape-status'),
  stop: () => ipcRenderer.invoke('stop-scrape'),
  exit: () => ipcRenderer.invoke('exit-app'),
});
