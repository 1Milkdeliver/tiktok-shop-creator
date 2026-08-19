// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
'use strict';

const puppeteer = require('puppeteer-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { toPuppeteerCookies } = require('./cookies');

const CHROME_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  '/usr/bin/google-chrome',
  '/usr/bin/chromium-browser',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
];
const DEBUG_PORT = 9222;
// Generic landing URL — shop_id is omitted; it is derived from the logged-in account's cookies at runtime
const LANDING_URL = 'https://affiliate.tiktokshopglobalselling.com/affiliate/creator?source_from=seller_affiliate_landing&shop_region=US&route_migration=1';

function findChrome() {
  for (const p of CHROME_PATHS) {
    try { if (fs.existsSync(p)) return p; } catch (e) { }
  }
  return null;
}

// Try to connect to an already-running Chrome with --remote-debugging-port
async function tryConnect(port = DEBUG_PORT) {
  try {
    const browser = await puppeteer.connect({
      browserURL: `http://127.0.0.1:${port}`,
      defaultViewport: null,
      protocolTimeout: 15000,
    });
    return browser;
  } catch (e) {
    return null;
  }
}

// Launch a NEW real-window Chrome with a fresh profile
// Window is kept visible so the user can manually solve captcha/slider challenges.
async function launchRealWindow(cookieFile) {
  const chrome = findChrome();
  if (!chrome) throw new Error('未找到 Chrome，请先安装 Google Chrome');
  // use a temp profile dir so we don't disturb the user's default Chrome
  const profileDir = path.join(os.tmpdir(), 'tiktok-pack-profile-' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: false,
    userDataDir: profileDir,
    args: [
      '--no-first-run', '--no-default-browser-check',
      '--window-size=1400,900',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
    protocolTimeout: 30000,
  });
  return { browser, profileDir };
}

// Launch headless Chrome (may not be supported in all environments)
async function launchHeadless(cookieFile) {
  const chrome = findChrome();
  if (!chrome) throw new Error('未找到 Chrome，请先安装 Google Chrome');
  const profileDir = path.join(os.tmpdir(), 'tiktok-pack-headless-' + Date.now());
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: 'new',
    userDataDir: profileDir,
    args: [
      '--no-first-run', '--no-default-browser-check',
      '--window-size=1400,900',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation'],
    protocolTimeout: 30000,
  });
  return { browser, profileDir };
}

// Open the landing page in a page, import cookies, wait for SPA
async function openLandingPage(browser, cookieFile) {
  const page = await browser.newPage();
  const cookies = toPuppeteerCookies(require('./cookies').loadCookies(cookieFile));
  if (cookies.length) {
    await page.setCookie(...cookies).catch(e => { throw new Error('Cookie 导入失败: ' + e.message); });
  }
  await page.goto(LANDING_URL, { waitUntil: 'domcontentloaded', timeout: 120000 });
  // wait for SPA / SDK to settle
  await new Promise(r => setTimeout(r, 90000));
  return page;
}

// In-page XHR to the find API (page's own SDK auto-signs requests)
function makeXhrFinder(page, apiPath) {
  return async (body) => {
    return await page.evaluate(async (apiPath, body) => {
      const qs = 'user_language=zh-CN&aid=6556&app_name=i18n_ecom_alliance&device_id=0&device_platform=web&shop_region=US';
      return await new Promise((resolve) => {
        const xhr = new XMLHttpRequest();
        const timer = setTimeout(() => { xhr.abort(); resolve(JSON.stringify({ err: 'xhr-timeout' })); }, 40000);
        xhr.open('POST', apiPath + '?' + qs, true);
        xhr.setRequestHeader('Content-Type', 'application/json');
        xhr.withCredentials = true;
        xhr.onreadystatechange = () => {
          if (xhr.readyState === 4) {
            clearTimeout(timer);
            resolve(xhr.responseText || '');
          }
        };
        xhr.onerror = () => { clearTimeout(timer); resolve(JSON.stringify({ err: 'xhr-error' })); };
        xhr.send(JSON.stringify(body));
      });
    }, apiPath, body);
  };
}

module.exports = { tryConnect, launchRealWindow, launchHeadless, openLandingPage, makeXhrFinder, findChrome, LANDING_URL, DEBUG_PORT };
