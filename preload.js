// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
// GitHub: https://github.com/1Milkdeliver/tiktok-shop-creator
// Author: 1Milkdeliver
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

