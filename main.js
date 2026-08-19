// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
// main.js — Electron main process: native window, native folder picker, scrape orchestration
'use strict';

const { app, BrowserWindow, ipcMain, dialog, shell, clipboard } = require('electron');
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
      // validate remembered outDir: if it no longer exists (e.g. leftover path
      // from an old install), fall back to the default so export never ENOENTs
      try {
        fs.mkdirSync(appData.outDir, { recursive: true });
      } catch (e) {
        appData.outDir = OUT_DIR;
        try { fs.mkdirSync(OUT_DIR, { recursive: true }); } catch (e2) { }
      }
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

// IPC: open a history file with the system default app
ipcMain.handle('open-history-file', async (event, filePath) => {
  try {
    const abs = path.resolve(filePath || '');
    if (!fs.existsSync(abs)) return { ok: false, error: '文件不存在: ' + abs };
    const err = await shell.openPath(abs);
    return err ? { ok: false, error: err } : { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// IPC: copy a history file path to the clipboard
ipcMain.handle('copy-history-path', (event, filePath) => {
  try {
    const abs = path.resolve(filePath || '');
    clipboard.writeText(abs);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// IPC: open the folder containing a history file
ipcMain.handle('open-history-folder', (event, filePath) => {
  try {
    const abs = path.resolve(filePath || '');
    if (!fs.existsSync(abs)) return { ok: false, error: '文件不存在: ' + abs };
    shell.showItemInFolder(abs);
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// IPC: delete a history file (and remove the entry), then return the refreshed history
ipcMain.handle('delete-history-file', (event, filePath) => {
  try {
    const abs = path.resolve(filePath || '');
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
    appData.history = (appData.history || []).filter(h => path.resolve(h.outPath || '') !== abs);
    saveAppData();
    return { ok: true, history: appData.history || [] };
  } catch (e) { return { ok: false, error: e.message }; }
});
// IPC: current app version (lazy require to avoid ordering issues)
ipcMain.handle('get-version', () => ({ version: require('./package.json').version }));

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 860,
    title: 'TikTokShop达人抓取工具',
    icon: path.join(__dirname, 'icon-256.png'),
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

// ---- auto-update: electron-updater downloads & installs the new build in-app ----
const { autoUpdater } = require('electron-updater');
autoUpdater.autoDownload = false; // ask the user first, then download
autoUpdater.autoInstallOnAppQuit = true;

// update state shared with the renderer (polled by the UI)
let updateState = { phase: 'idle', percent: 0, message: '' };
function setUpdateState(patch) {
  updateState = { ...updateState, ...patch };
  if (mainWindow && !mainWindow.isDestroyed()) {
    try { mainWindow.webContents.send('update-state', updateState); } catch (e) { }
  }
}

// Manual check triggered by the UI button
ipcMain.handle('check-update', () => {
  checkForUpdates(true);
  return { ok: true };
});

async function checkForUpdates(manual) {
  if (!app.isPackaged) {
    if (manual && mainWindow) {
      dialog.showMessageBox(mainWindow, { type: 'info', title: '检查更新', message: '开发模式下不检查更新', detail: '请使用打包后的安装版。' });
    }
    return;
  }
  setUpdateState({ phase: 'checking', percent: 0, message: '' });
  writeLog(manual ? '手动检查更新…' : '正在检查更新…');
  try {
    const result = await autoUpdater.checkForUpdates();
    if (!result || !result.updateInfo) {
      setUpdateState({ phase: 'idle', message: '' });
      writeLog('已是最新版本');
      if (manual && mainWindow) {
        dialog.showMessageBox(mainWindow, { type: 'info', title: '检查更新', message: '已是最新版本', detail: `当前版本 v${CURRENT_VERSION}` });
      }
    }
  } catch (e) {
    setUpdateState({ phase: 'error', message: e.message });
    writeLog('自动更新检查失败: ' + e.message);
    if (manual && mainWindow) {
      dialog.showMessageBox(mainWindow, { type: 'error', title: '检查更新失败', message: '无法连接更新服务器', detail: String(e.message || e), buttons: ['前往下载页', '关闭'], defaultId: 0, cancelId: 1 })
        .then(({ response }) => { if (response === 0) shell.openExternal(RELEASE_URL); });
    } else {
      checkViaGitHubApi(); // silent fallback: open the release page
    }
  }
}

// Fallback: if electron-updater fails, at least offer the download page
async function checkViaGitHubApi() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': 'tiktok-shop-creator-scraper', 'Accept': 'application/vnd.github+json' },
      signal: AbortSignal.timeout(10000),
    });
    if (!res.ok) return;
    const rel = await res.json();
    const latestTag = (rel.tag_name || '').replace(/^v/i, '');
    if (!latestTag || !isNewer(latestTag, CURRENT_VERSION)) return;
    if (!mainWindow) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 v${latestTag}（自动更新不可用）`,
      detail: `当前版本：v${CURRENT_VERSION}\n\n请前往下载页获取新版安装包，覆盖安装即可保留原数据。`,
      buttons: ['前往下载', '稍后提醒'],
      defaultId: 0,
      cancelId: 1,
      icon: path.join(__dirname, 'icon-256.png'),
    });
    if (response === 0) shell.openExternal(RELEASE_URL);
  } catch (e) { writeLog('版本检查失败: ' + e.message); }
}

// wire autoUpdater events (called once at startup)
function setupAutoUpdaterEvents() {
  autoUpdater.on('checking-for-update', () => {
    setUpdateState({ phase: 'checking', percent: 0, message: '' });
    writeLog('正在检查更新…');
  });
  autoUpdater.on('update-available', async (info) => {
    const v = (info && info.version) || '';
    setUpdateState({ phase: 'available', percent: 0, message: `发现新版本 v${v}` });
    writeLog(`发现新版本 v${v}`);
    if (!mainWindow) return;
    // fetch release notes from GitHub to show what's new in the dialog
    let notes = '';
    try {
      const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
        headers: { 'User-Agent': 'tiktok-shop-creator-scraper', 'Accept': 'application/vnd.github+json' },
        signal: AbortSignal.timeout(10000),
      });
      if (res.ok) {
        const rel = await res.json();
        if (rel.body) {
          // strip markdown headers/links to keep the dialog readable
          notes = String(rel.body).replace(/^#+\s*/gm, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').replace(/\*\*/g, '').trim();
          if (notes.length > 900) notes = notes.slice(0, 900) + '\n…';
        }
      }
    } catch (e) { }
    const notesText = notes ? `\n\n── 更新内容 ──\n${notes}` : '';
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '发现新版本',
      message: `发现新版本 v${v}（当前 v${CURRENT_VERSION}）`,
      detail: `是否现在下载并安装？下载完成后会提示重启应用完成更新。${notesText}`,
      buttons: ['立即下载更新', '稍后'],
      defaultId: 0,
      cancelId: 1,
      icon: path.join(__dirname, 'icon-256.png'),
    });
    if (response === 0) {
      try {
        setUpdateState({ phase: 'downloading', percent: 0, message: '开始下载更新…' });
        await autoUpdater.downloadUpdate();
      } catch (e) {
        setUpdateState({ phase: 'error', message: '下载失败: ' + e.message });
        writeLog('下载更新失败: ' + e.message);
        if (mainWindow) {
          dialog.showMessageBox(mainWindow, {
            type: 'error',
            title: '下载更新失败',
            message: '更新下载失败',
            detail: String(e.message || e) + '\n\n可前往下载页手动下载最新安装包。',
            buttons: ['前往下载页', '关闭'],
            defaultId: 0,
            cancelId: 1,
            icon: path.join(__dirname, 'icon-256.png'),
          }).then((r) => { if (r.response === 0) shell.openExternal(RELEASE_URL); });
        }
      }
    }
  });
  autoUpdater.on('download-progress', (p) => {
    const pct = p && p.percent != null ? Math.round(p.percent) : 0;
    setUpdateState({ phase: 'downloading', percent: pct, message: `正在下载更新 ${pct}%` });
    writeLog(`正在下载更新… ${pct}%`);
  });
  autoUpdater.on('update-downloaded', async (info) => {
    const v = (info && info.version) || '';
    setUpdateState({ phase: 'downloaded', percent: 100, message: '更新已下载完成' });
    writeLog('更新下载完成');
    if (!mainWindow) return;
    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: '更新已就绪',
      message: `v${v} 更新下载完成（当前 v${CURRENT_VERSION}）`,
      detail: '重启后自动完成安装（通常需要1-2分钟）。',
      buttons: ['立即重启安装', '稍后'],
      defaultId: 0,
      cancelId: 1,
      icon: path.join(__dirname, 'icon-256.png'),
    });
    if (response === 0) {
      setUpdateState({ phase: 'installing', percent: 100, message: '正在静默安装更新…' });
      // Stop any running scrape + close browsers first so the app can exit cleanly
      // and the silent installer never hits "cannot be closed".
      try { runner.stop(); } catch (e) { }
      try {
        for (const s of runner.sessions || []) {
          if (s.browser) { try { await Promise.race([s.browser.close(), new Promise(r => setTimeout(r, 3000))]).catch(() => { }); } catch (e) { } }
        }
      } catch (e) { }
      // quitAndInstall(true) => silent NSIS update: no license/dir UI, just replace files
      setTimeout(() => autoUpdater.quitAndInstall(true, true), 800);
    }
  });
  autoUpdater.on('update-not-available', () => {
    setUpdateState({ phase: 'idle', message: '' });
    writeLog('已是最新版本');
  });
  autoUpdater.on('error', (e) => {
    setUpdateState({ phase: 'error', message: e && e.message || String(e) });
    writeLog('自动更新出错: ' + (e && e.message || e));
  });
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
      outPath: path.isAbsolute(config.outPath || '') ? config.outPath : path.join(APP_DIR, config.outPath || 'output'),
      detail: !!config.detail,
      headerLang: config.headerLang === 'en' ? 'en' : 'zh',
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
  stopping: !!(runner.running && runner.stopped),
  status: runner.status,
  currentInfo: runner.currentInfo || {},
  logs: runner.logs,
  result: runner.result,
  rateLimit: runner.rateLimit,
  update: updateState,
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
    // auto-update: wire events once, then check after window is ready
    setupAutoUpdaterEvents();
    setTimeout(() => checkForUpdates(), 5000);
  });
  app.on('window-all-closed', () => { app.quit(); });
}
