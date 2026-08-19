// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
// main.js — Electron main process: native window, native folder picker, scrape orchestration
'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { MultiRunner } = require('./lib/multirunner');

let mainWindow = null;
const runner = new MultiRunner();

// ---- persistent app data: remember last cookies + history ----
let appData = { cookies: [], history: [] };
function dataFile() { return path.join(app.getPath('userData'), 'app-data.json'); }

function loadAppData() {
  try {
    if (fs.existsSync(dataFile())) {
      appData = JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
      if (!Array.isArray(appData.cookies)) appData.cookies = [];
      if (!Array.isArray(appData.history)) appData.history = [];
    }
  } catch (e) { }
}
function saveAppData() {
  try { fs.writeFileSync(dataFile(), JSON.stringify(appData)); } catch (e) { }
}
function recordHistory(entry) {
  if (!entry || !entry.outPath) return;
  appData.history.unshift({
    outPath: entry.outPath,
    rows: entry.rows || 0,
    creators: entry.creators || 0,
    details: entry.details || 0,
    time: new Date().toLocaleString(),
  });
  if (appData.history.length > 100) appData.history = appData.history.slice(0, 100);
  saveAppData();
}

// IPC: remembered cookies + history
ipcMain.handle('get-app-data', () => ({ cookies: appData.cookies || [], history: appData.history || [] }));
ipcMain.handle('clear-cookies', () => { appData.cookies = []; saveAppData(); return { ok: true }; });

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 860,
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
  // Open external links in the system browser, not this window
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  mainWindow.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file://')) { e.preventDefault(); if (/^https?:/i.test(url)) shell.openExternal(url); }
  });
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

// helper: save pasted cookie strings to temp files, return array of paths
function saveCookiesToFiles(pasted) {
  const cookieFiles = [];
  for (let i = 0; i < pasted.length; i++) {
    const txt = String(pasted[i]).replace(/^\uFEFF/, '').trim();
    let arr;
    try { arr = JSON.parse(txt); if (!Array.isArray(arr)) throw new Error('not array'); }
    catch (e) { return { error: `第 ${i + 1} 个粘贴 Cookie 不是有效 JSON 数组` }; }
    const f = path.join(os.tmpdir(), `tiktok-cookie-${Date.now()}-${i}.json`);
    fs.writeFileSync(f, JSON.stringify(arr));
    cookieFiles.push(f);
  }
  return { cookieFiles };
}

// IPC: test scrape with isolated environment (1 keyword, 1 page) to verify everything works
ipcMain.handle('test-scrape', async (event, config) => {
  if (runner.running) return { error: '抓取进行中，请稍后再试' };
  try {
    const pasted = config.pastedCookies || [];
    const { cookieFiles, error } = saveCookiesToFiles(pasted);
    if (error) return { error };
    if (!cookieFiles.length) return { error: '未收到 Cookie' };
    // isolated test: 1 cookie session, 1 keyword, page 0 only
    const cfg = {
      cookieFiles: cookieFiles.slice(0, 1),
      mode: config.mode || 'auto',
      format: config.format || 'csv',
      outPath: config.outPath || './output',
      detail: false,
      keywords: ['phone case'],
      fields: ['handle', 'nickname'],
      testMode: true, // multirunner will stop after 1 page
    };
    const prevResult = runner.result;
    runner.start(cfg).catch(e => runner.log('测试错误: ' + e.message));
    // wait for result
    for (let i = 0; i < 40; i++) { // up to ~3 min
      await new Promise(r => setTimeout(r, 5000));
      if (runner.result !== prevResult && runner.result) break;
    }
    const res = runner.result;
    if (res && res.ok) return { ok: true, rows: res.rows, creators: res.creators, log: runner.logs.slice(-8) };
    if (res && !res.ok) return { error: res.error, log: runner.logs.slice(-8) };
    return { error: '测试超时', log: runner.logs.slice(-8) };
  } catch (e) {
    return { error: e.message };
  }
});

// IPC: start scrape (cookies as array of JSON strings)
ipcMain.handle('start-scrape', async (event, config) => {
  if (runner.running) return { error: '已在运行中' };
  try {
    const pasted = config.pastedCookies || [];
    const { cookieFiles, error } = saveCookiesToFiles(pasted);
    if (error) return { error };
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
    // remember cookies for next launch
    appData.cookies = pasted.slice();
    saveAppData();
    const prevResult = runner.result;
    runner.start(cfg).catch(e => runner.log('内部错误: ' + e.message));
    // record history when done
    (async () => {
      for (let i = 0; i < 720; i++) { // up to ~60min
        await new Promise(r => setTimeout(r, 5000));
        if (runner.result !== prevResult && runner.result) {
          if (runner.result.ok) recordHistory(runner.result);
          break;
        }
      }
    })();
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
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
  app.whenReady().then(() => { loadAppData(); createWindow(); });
  app.on('window-all-closed', () => { app.quit(); });
}
