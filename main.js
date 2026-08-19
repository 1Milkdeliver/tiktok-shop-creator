// main.js — Electron main process: native window, native folder picker, scrape orchestration
'use strict';

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { MultiRunner } = require('./lib/multirunner');

let mainWindow = null;
const runner = new MultiRunner();

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 820,
    title: 'TikTok 达人抓取工具',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });
  mainWindow.loadFile('index.html');
  mainWindow.on('closed', () => { mainWindow = null; });
}

// IPC: choose output directory (native dialog)
ipcMain.handle('choose-dir', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: '选择输出目录',
    properties: ['openDirectory', 'createDirectory'],
  });
  if (result.canceled || !result.filePaths.length) return '';
  return result.filePaths[0];
});

// IPC: get common directories
ipcMain.handle('common-dirs', async () => {
  const dirs = [];
  const home = os.homedir();
  dirs.push(path.join(home, 'Desktop'), path.join(home, 'Documents'), path.join(home, 'Downloads'), home, 'D:\\', 'E:\\');
  return dirs.filter(d => { try { return fs.existsSync(d); } catch (e) { return false; } });
});

// IPC: start scrape (cookies as array of JSON strings, or temp file paths)
ipcMain.handle('start-scrape', async (event, config) => {
  if (runner.running) return { error: '已在运行中' };
  try {
    // save pasted cookies to temp files
    const cookieFiles = [];
    const pasted = config.pastedCookies || [];
    for (let i = 0; i < pasted.length; i++) {
      const txt = String(pasted[i]).replace(/^\uFEFF/, '').trim();
      let arr;
      try { arr = JSON.parse(txt); if (!Array.isArray(arr)) throw new Error('not array'); }
      catch (e) { return { error: `第 ${i + 1} 个粘贴 Cookie 不是有效 JSON 数组` }; }
      const f = path.join(os.tmpdir(), `tiktok-cookie-${Date.now()}-${i}.json`);
      fs.writeFileSync(f, JSON.stringify(arr));
      cookieFiles.push(f);
    }
    if (!cookieFiles.length) return { error: '未收到 Cookie' };
    const cfg = {
      cookieFiles,
      mode: config.mode || 'auto',
      format: config.format || 'csv',
      outPath: config.outPath || './output',
      detail: !!config.detail,
      keywords: config.keywords && config.keywords.length ? config.keywords : require('./lib/exporter').DEFAULT_KEYWORDS,
      fields: config.fields && config.fields.length ? config.fields : null,
    };
    runner.start(cfg).catch(e => runner.log('内部错误: ' + e.message));
    return { ok: true, sessions: cookieFiles.length };
  } catch (e) {
    return { error: e.message };
  }
});

// IPC: status
ipcMain.handle('scrape-status', () => ({
  running: runner.running,
  logs: runner.logs,
  result: runner.result,
}));

// IPC: stop
ipcMain.handle('stop-scrape', () => { runner.stop(); return { ok: true }; });

// IPC: exit app
ipcMain.handle('exit-app', () => { app.quit(); return { ok: true }; });

// Single instance: only one copy of the app may run at a time
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    // second launch attempt: focus existing window
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(createWindow);
  app.on('window-all-closed', () => { app.quit(); });
}
