// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
'use strict';

const { tryConnect, launchRealWindow, launchHeadless, openLandingPage } = require('./browser');
const { scrapeList, scrapeDetails } = require('./scraper');
const { exportCsv, exportXlsx, mergeRows, ensureDir } = require('./exporter');
const path = require('path');

class MultiRunner {
  constructor() {
    this.running = false;
    this.stopped = false;
    this.paused = false;
    this.status = 'idle'; // idle | running | paused | done | error
    this.currentInfo = { keyword: '', page: 0, total: 0 };
    this.logs = [];
    this.result = null;
    this.sessions = [];
  }

  // pause: finish current page then hold; resume: continue
  pause() { if (this.running && !this.paused) { this.paused = true; this.status = 'paused'; this.log('⏸ 已暂停（完成当前请求后挂起）'); } }
  resume() { if (this.paused) { this.paused = false; this.status = 'running'; this.log('▶ 继续抓取'); } }

  // returns a promise that resolves immediately if not paused, or waits until resumed
  async pauseGate() {
    while (this.paused && !this.stopped) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  log(msg) {
    const line = `[${new Date().toLocaleTimeString()}] ${msg}`;
    this.logs.push(line);
    if (this.logs.length > 1000) this.logs.shift();
    console.log(msg);
    // external file-log hook (set by main process)
    if (this.onFileLog) { try { this.onFileLog(line); } catch (e) { } }
  }

  async start(config) {
    if (this.running) throw new Error('已在运行中');
    this.running = true;
    this.stopped = false;
    this.paused = false;
    this.status = 'running';
    this.logs = [];
    this.result = null;

    const { cookieFiles, mode, keywords, format, outPath, detail, fields, testMode } = config;
    const sessions = cookieFiles.map((f, i) => ({
      index: i,
      cookieFile: f,
      browser: null,
      page: null,
      creators: [],
      details: [],
      rateLimited: false,
      done: false,
    }));
    this.sessions = sessions;

    try {
      this.log(`══════ 多账号并发抓取 ══════`);
      this.log(`Cookie 数: ${sessions.length} | 关键词: ${keywords.length} | 模式: ${mode} | 详情: ${detail ? '是' : '否'}${testMode ? ' | 测试模式' : ''}`);

      // Start sessions sequentially with staggered delay
      for (let i = 0; i < sessions.length; i++) {
        if (this.stopped) break;
        const s = sessions[i];
        try {
          s.browser = await this.openSession(mode, s.cookieFile, i);
          s.page = await openLandingPage(s.browser, s.cookieFile);
          const st = await s.page.evaluate(() => ({
            bodyLen: document.body ? document.body.innerText.length : 0,
            hasLogin: !!document.querySelector('input[type=password]'),
          }));
          this.log(`会话 #${i + 1}: 内容 ${st.bodyLen} | 登录框: ${st.hasLogin}`);
          if (st.hasLogin || st.bodyLen < 200) {
            this.log(`⚠️ 会话 #${i + 1} 页面异常（Cookie 可能失效），跳过`);
            continue;
          }
          // stagger: run this session's scrape in background
          this.runSession(s, keywords, detail, outPath, testMode).catch(e => this.log(`会话 #${i + 1} 错误: ${e.message}`));
        } catch (e) {
          this.log(`会话 #${i + 1} 启动失败: ${e.message}`);
        }
        // stagger between session starts
        if (i < sessions.length - 1) await this.sleep(30000 + Math.random() * 30000);
      }

      // Wait for all sessions to finish. A stop request does NOT skip this wait:
      // each session detects isStopped, breaks out of its loops, keeps the data
      // already scraped (s.creators), then marks done — only then do we export.
      const waitStart = Date.now();
      while (true) {
        const active = sessions.filter(s => !s.done);
        if (active.length === 0) break;
        // safety cap: if stopping, do not block export forever on a stuck session
        if (this.stopped && Date.now() - waitStart > 120000) {
          this.log('⚠️ 等待会话结束超时，直接导出已抓取数据');
          break;
        }
        await this.sleep(5000);
      }

      // merge + export
      const allCreators = [];
      const seen = new Set();
      for (const s of sessions) {
        for (const c of s.creators) {
          const id = c && c.creator_oecuid;
          const key = id == null ? '' : String(id);
          if (key && !seen.has(key)) { seen.add(key); allCreators.push(c); }
        }
      }
      const allDetails = [];
      for (const s of sessions) allDetails.push(...s.details);
      const rows = mergeRows(allCreators, allDetails);
      // optional field filter
      const pick = (Array.isArray(fields) && fields.length) ? fields : Object.keys(rows[0] || {});
      const filtered = rows.map(r => { const o = {}; for (const f of pick) if (f in r) o[f] = r[f]; return o; });
      const headers = Object.keys(filtered[0] || {});
      if (testMode) {
        // test mode: no file output, just report counts
        this.log(`\n── 测试完成：抓取 ${filtered.length} 行（未导出文件）`);
        this.result = { ok: true, rows: filtered.length, outPath: '', creators: allCreators.length, details: allDetails.length, sessions: sessions.length, testMode: true };
      } else {
        // if outPath is a directory (no extension), generate a timestamped filename inside it
        let finalPath = outPath;
        if (!/\.(csv|xlsx)$/i.test(outPath)) {
          const ts = new Date();
          const pad = (n) => String(n).padStart(2, '0');
          const stamp = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}-${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
          finalPath = path.join(outPath, `达人数据-${stamp}.${format}`);
        }
        ensureDir(path.dirname(finalPath));
        this.log(`\n── 导出 ${filtered.length} 行 × ${headers.length} 字段 → ${finalPath}`);
        if (format === 'xlsx') await exportXlsx(finalPath, filtered, headers);
        else await exportCsv(finalPath, filtered, headers);
        this.log('✅ 导出完成！');
        this.result = { ok: true, rows: filtered.length, outPath: finalPath, creators: allCreators.length, details: allDetails.length, sessions: sessions.length };
      }
    } catch (e) {
      this.log('❌ 错误: ' + e.message);
      this.status = 'error';
      this.result = { ok: false, error: e.message };
    } finally {
      this.running = false;
      if (this.status !== 'error') this.status = this.stopped ? 'done' : 'done';
      for (const s of sessions) { try { if (s.browser) s.browser.disconnect(); } catch (e) { } }
    }
  }

  async runSession(s, keywords, detail, outPath, testMode) {
    const resumeList = path.join(path.dirname(outPath), `.resume-list-${s.index}.json`);
    const resumeDetail = path.join(path.dirname(outPath), `.resume-detail-${s.index}.json`);
    try {
      this.log(`会话 #${s.index + 1}: 开始抓取...`);
      // list
      const res = await scrapeList(s.page, keywords, {
        resumeState: resumeList,
        isStopped: () => this.stopped,
        isPaused: () => this.paused,
        maxPages: testMode ? 1 : Infinity,
        onProgress: (m) => {
          this.log(`  会话#${s.index + 1} ${m}`);
          // track current keyword for status display
          const kwMatch = m.match(/===\s*([^ ]+)\s*from page (\d+)/);
          if (kwMatch) { this.currentInfo.keyword = kwMatch[1]; this.currentInfo.page = parseInt(kwMatch[2]) || 0; }
          const totalMatch = m.match(/total (\d+)/);
          if (totalMatch) this.currentInfo.total = parseInt(totalMatch[1]) || 0;
        },
      });
      s.creators = res.creators;
      this.log(`会话 #${s.index + 1}: 列表 ${s.creators.length} 条`);
      // detail
      if (detail && s.creators.length) {
        const dr = await scrapeDetails(s.page, s.creators, {
          resumeFile: resumeDetail,
          isStopped: () => this.stopped,
          isPaused: () => this.paused,
          onProgress: (m) => this.log(`  会话#${s.index + 1} ${m}`),
        });
        s.details = dr.details;
        this.log(`会话 #${s.index + 1}: 详情 ${s.details.length} 条`);
      }
    } catch (e) {
      this.log(`会话 #${s.index + 1} 抓取错误: ${e.message}`);
    } finally {
      s.done = true;
    }
  }

  async openSession(mode, cookieFile, index) {
    if (mode === 'headless') {
      const l = await launchHeadless(cookieFile);
      return l.browser;
    } else if (mode === 'real') {
      const l = await launchRealWindow(cookieFile);
      return l.browser;
    }
    const b = await tryConnect();
    if (b) return b;
    const l = await launchRealWindow(cookieFile);
    return l.browser;
  }

  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  stop() {
    if (this.running) {
      this.stopped = true;
      this.log('收到停止请求，完成当前请求后保存已抓取数据并导出...');
    }
  }
}

module.exports = { MultiRunner };
