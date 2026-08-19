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
runner.onFileLog = (line) => writeLog(line);

// ---- app folders: logs/ and output/ next to the executable ----
const APP_DIR = path.dirname(process.execPath);
const LOG_DIR = path.join(APP_DIR, 'logs');
const OUT_DIR = path.join(APP_DIR, 'output');

function ensureDirs() {
  try {
    if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
    writeLog('目录就绪: ' + APP_DIR);
  } catch (e) {
    // if app dir is not writable (e.g. Program Files), fall back to userData
    try {
      const alt = path.join(app.getPath('userData'));
      const fallbackLog = path.join(alt, 'logs');
      const fallbackOut = path.join(alt, 'output');
      if (!fs.existsSync(fallbackLog)) fs.mkdirSync(fallbackLog, { recursive: true });
      if (!fs.existsSync(fallbackOut)) fs.mkdirSync(fallbackOut, { recursive: true });
      writeLog('安装目录不可写，使用用户目录: ' + alt);
    } catch (e2) { }
  }
}

// ---- rotating log writer (prevents oversized log files) ----
const MAX_LOG_SIZE = 2 * 1024 * 1024; // 2MB per file
const MAX_LOG_FILES = 5;
let logStream = null;

function openLogStream() {
  try {
    if (logStream) { try { logStream.end(); } catch (e) { } logStream = null; }
    // ensure dirs WITHOUT calling writeLog (avoid recursion)
    try {
      if (!fs.existsSync(LOG_DIR)) fs.mkdirSync(LOG_DIR, { recursive: true });
    } catch (e) { }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    const logFile = path.join(LOG_DIR, `app-${stamp}.log`);
    logStream = fs.createWriteStream(logFile, { flags: 'a' });
  } catch (e) {
    logStream = null;
  }
}

function rotateLogs() {
  try {
    if (!fs.existsSync(LOG_DIR)) return;
    const files = fs.readdirSync(LOG_DIR).filter(f => f.endsWith('.log')).sort();
    while (files.length > MAX_LOG_FILES) {
      const oldest = path.join(LOG_DIR, files.shift());
      fs.unlinkSync(oldest);
    }
  } catch (e) { }
}

function writeLog(msg) {
  try {
    const line = `[${new Date().toLocaleString()}] ${msg}\n`;
    if (!logStream) openLogStream();
    if (!logStream) {
      // fallback: write to userData logs if app dir not writable
      try {
        const altDir = path.join(app.getPath('userData'), 'logs');
        if (!fs.existsSync(altDir)) fs.mkdirSync(altDir, { recursive: true });
        fs.appendFileSync(path.join(altDir, 'app.log'), line);
      } catch (e) { }
      return;
    }
    // rotate if current file too big
    try {
      const size = fs.statSync(logStream.path).size;
      if (size > MAX_LOG_SIZE) openLogStream();
    } catch (e) { }
    if (logStream) logStream.write(line);
    rotateLogs();
  } catch (e) { }
}

// ---- persistent app data: remember last cookies + history ----
let appData = { cookies: [], history: [], shortcutAsked: false, outDir: OUT_DIR };
function dataFile() { return path.join(app.getPath('userData'), 'app-data.json'); }

function loadAppData() {
  try {
    if (fs.existsSync(dataFile())) {
      appData = JSON.parse(fs.readFileSync(dataFile(), 'utf8'));
      if (!Array.isArray(appData.cookies)) appData.cookies = [];
      if (!Array.isArray(appData.history)) appData.history = [];
      if (!appData.outDir) appData.outDir = OUT_DIR;
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

// IPC: remembered cookies + history + default out dir
ipcMain.handle('get-app-data', () => ({ cookies: appData.cookies || [], history: appData.history || [], defaultOutDir: appData.outDir || OUT_DIR }));
ipcMain.handle('clear-cookies', () => { appData.cookies = []; saveAppData(); return { ok: true }; });
// IPC: current app version (lazy require to avoid ordering issues)
ipcMain.handle('get-version', () => ({ version: require('./package.json').version }));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 860,
    title: 'TikTokShop达人抓取工具',
    icon: path.join(__dirname, 'build', 'icon-256.png'),
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

// ---- version check: query GitHub releases for the latest version ----
const CURRENT_VERSION = require('./package.json').version;
const REPO = '1Milkdeliver/tiktok-shop-creator-scraper';
const RELEASE_URL = `https://github.com/${REPO}/releases/latest`;

function parseVersion(v) {
  const m = String(v).replace(/^v/i, '').match(/(\d+)\.(\d+)\.(\d+)/);
  if (!m) return [0, 0, 0];
  return [parseInt(m[1]), parseInt(m[2]), parseInt(m[3])];
}
function isNewer(latest, cur) {
  const a = parseVersion(latest);
  const b = parseVersion(cur);
  return a[0] > b[0] || (a[0] === b[0] && a[1] > b[1]) || (a[0] === b[0] && a[1] === b[1] && a[2] > b[2]);
}

async function checkForUpdates() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': 'tiktok-shop-creator-scraper', 'Accept': 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;
    const rel = await res.json();
    const latestTag = (rel.tag_name || '').replace(/^v/i, '');
    if (!latestTag) return;
    if (isNewer(latestTag, CURRENT_VERSION)) {
      writeLog(`发现新版本 v${latestTag}（当前 v${CURRENT_VERSION}）`);
      if (!mainWindow) return;
      const { response } = await dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '发现新版本',
        message: `发现新版本 v${latestTag}`,
        detail: `当前版本：v${CURRENT_VERSION}\n\n新版本包含功能改进与修复。\n\n下载新安装包后，运行安装程序并选择同一安装目录即可自动覆盖更新，原数据（Cookie、历史记录、输出文件）都会保留。`,
        buttons: ['前往下载', '稍后提醒'],
        defaultId: 0,
        cancelId: 1,
        icon: path.join(__dirname, 'build', 'icon-256.png'),
      });
      if (response === 0) shell.openExternal(RELEASE_URL);
    } else {
      writeLog('已是最新版本');
    }
  } catch (e) {
    writeLog('版本检查失败: ' + e.message);
  }
}

// ---- desktop shortcut (default: create on first run) ----
function createDesktopShortcut() {
  try {
    const exePath = process.execPath;
    const desktop = path.join(os.homedir(), 'Desktop');
    const lnk = path.join(desktop, 'TikTokShop达人抓取.lnk');
    if (fs.existsSync(lnk)) return; // already exists
    if (!fs.existsSync(desktop)) return;
    const ps = `$ws = New-Object -ComObject WScript.Shell; $s = $ws.CreateShortcut('${lnk.replace(/'/g, "''")}'); $s.TargetPath = '${exePath.replace(/'/g, "''")}'; $s.WorkingDirectory = '${path.dirname(exePath).replace(/'/g, "''")}'; $s.IconLocation = '${exePath.replace(/'/g, "''")},0'; $s.Description = 'TikTokShop达人抓取工具'; $s.Save()`;
    require('child_process').execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', ps], { windowsHide: true }, () => { });
    writeLog('已在桌面创建快捷方式');
  } catch (e) { writeLog('创建快捷方式失败: ' + e.message); }
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
      outPath: config.outPath || OUT_DIR,
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
      outPath: config.outPath || OUT_DIR,
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
  paused: runner.paused,
  status: runner.status,
  currentInfo: runner.currentInfo || {},
  logs: runner.logs,
  result: runner.result,
}));

// IPC: pause
ipcMain.handle('pause-scrape', () => { runner.pause(); return { ok: true }; });

// IPC: resume
ipcMain.handle('resume-scrape', () => { runner.resume(); return { ok: true }; });

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
  app.whenReady().then(() => {
    loadAppData();
    // always ensure dirs + shortcut on every launch (idempotent)
    ensureDirs();
    openLogStream();
    writeLog('应用启动: ' + APP_DIR);
    createWindow();
    createDesktopShortcut(); // skips if shortcut already exists
    // check for updates after window is ready (delay so it doesn't interrupt startup)
    setTimeout(() => checkForUpdates(), 5000);
  });
  app.on('window-all-closed', () => { app.quit(); });
}
