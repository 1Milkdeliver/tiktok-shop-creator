// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  chooseDir: () => ipcRenderer.invoke('choose-dir'),
  commonDirs: () => ipcRenderer.invoke('common-dirs'),
  start: (cfg) => ipcRenderer.invoke('start-scrape', cfg),
  test: (cfg) => ipcRenderer.invoke('test-scrape', cfg),
  status: () => ipcRenderer.invoke('scrape-status'),
  pause: () => ipcRenderer.invoke('pause-scrape'),
  resume: () => ipcRenderer.invoke('resume-scrape'),
  stop: () => ipcRenderer.invoke('stop-scrape'),
  getAppData: () => ipcRenderer.invoke('get-app-data'),
  clearCookies: () => ipcRenderer.invoke('clear-cookies'),
  openHistoryFile: (p) => ipcRenderer.invoke('open-history-file', p),
  copyHistoryPath: (p) => ipcRenderer.invoke('copy-history-path', p),
  openHistoryFolder: (p) => ipcRenderer.invoke('open-history-folder', p),
  deleteHistoryFile: (p) => ipcRenderer.invoke('delete-history-file', p),
  getVersion: () => ipcRenderer.invoke('get-version'),
  exit: () => ipcRenderer.invoke('exit-app'),
});

