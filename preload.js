// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseDir: () => ipcRenderer.invoke('choose-dir'),
  commonDirs: () => ipcRenderer.invoke('common-dirs'),
  start: (cfg) => ipcRenderer.invoke('start-scrape', cfg),
  test: (cfg) => ipcRenderer.invoke('test-scrape', cfg),
  status: () => ipcRenderer.invoke('scrape-status'),
  stop: () => ipcRenderer.invoke('stop-scrape'),
  getAppData: () => ipcRenderer.invoke('get-app-data'),
  clearCookies: () => ipcRenderer.invoke('clear-cookies'),
  exit: () => ipcRenderer.invoke('exit-app'),
});

