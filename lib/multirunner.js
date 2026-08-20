// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
'use strict';

const { tryConnect, launchRealWindow, launchHeadless, openLandingPage, setShopRegion } = require('./browser');
const { scrapeList, scrapeDetails, scrapeByInput, parseCreatorInput, extractDetailFields, flattenProfile } = require('./scraper');
const { exportCsv, exportXlsx, mergeRows, ensureDir } = require('./exporter');
const path = require('path');

// 字段 key → 中英文表头名（与 index.html 的 FIELDS 保持同步）
const FIELD_LABELS = {
  handle: { zh: '达人主页', en: 'Creator Page' },
  nickname: { zh: '昵称', en: 'Nickname' },
  creator_oecuid: { zh: '达人ID', en: 'Creator ID' },
  avatar: { zh: '头像', en: 'Avatar' },
  selection_region: { zh: '地区', en: 'Region' },
  follower_cnt: { zh: '粉丝数', en: 'Followers' },
  category: { zh: '类目', en: 'Category' },
  med_gmv_revenue: { zh: '总GMV', en: 'Total GMV' },
  med_gmv_revenue_range: { zh: 'GMV区间', en: 'GMV Range' },
  video_gmv: { zh: '视频GMV', en: 'Video GMV' },
  live_gmv: { zh: '直播GMV', en: 'Live GMV' },
  units_sold: { zh: '销量', en: 'Units Sold' },
  units_sold_range: { zh: '销量区间', en: 'Units Sold Range' },
  video_avg_view_cnt: { zh: '平均视频观看', en: 'Avg Video Views' },
  video_play_cnt_med: { zh: '视频中位观看', en: 'Median Video Views' },
  video_engagement: { zh: '视频互动量', en: 'Video Engagement' },
  ec_video_engagement: { zh: '电商视频互动', en: 'E-comm Video Engagement' },
  ec_video_gpm: { zh: '电商GPM', en: 'E-comm GPM' },
  ec_live_gpm: { zh: '直播GPM', en: 'Live GPM' },
  ec_live_avg_uv: { zh: '电商平均UV', en: 'E-comm Avg UV' },
  top_follower_ages: { zh: '粉丝年龄段', en: 'Audience Ages' },
  top_follower_gender: { zh: '粉丝性别分布', en: 'Audience Gender' },
  pps_score: { zh: 'PPS评分', en: 'PPS Score' },
  is_fast_growing: { zh: '快速增长', en: 'Fast Growing' },
  has_collaborated: { zh: '已合作', en: 'Collaborated' },
  creator_permission_tag: { zh: '达人类目权限', en: 'Category Permission' },
  is_live_auction: { zh: '直播拍卖', en: 'Live Auction' },
  // list (find) fields that slimCreator emits with english keys
  main_industry: { zh: '主营行业', en: 'Main Industry' },
  is_active_creator: { zh: '活跃达人', en: 'Active Creator' },
  is_quickly_response: { zh: '快速回复', en: 'Quick Response' },
  is_rising_star: { zh: '明星达人', en: 'Rising Star' },
  is_official_recommend: { zh: '官方推荐', en: 'Official Recommend' },
  is_ecom_authorized: { zh: '电商授权', en: 'E-com Authorized' },
  is_high_sample_dispatch_rate: { zh: '高样片发货率', en: 'High Sample Dispatch' },
  creator_bind_mcn_name: { zh: 'MCN机构', en: 'MCN Agency' },
  sample_fulfillment_rate: { zh: '样片履约率', en: 'Sample Fulfillment' },
  follower_state_location: { zh: '粉丝地域', en: 'Follower Location' },
  vertical_pro_category: { zh: '垂直类目', en: 'Vertical Category' },
  vat: { zh: 'VAT', en: 'VAT' },
  it_tax_regime: { zh: '税制', en: 'Tax Regime' },
  brand_safe_tag: { zh: '品牌安全', en: 'Brand Safe' },
  invoice_available: { zh: '可开发票', en: 'Invoice Available' },
  receipt_info_authorized: { zh: '收据授权', en: 'Receipt Authorized' },
  '简介': { zh: '简介', en: 'Bio' },
  '合作邮箱': { zh: '合作邮箱', en: 'Contact Email' },
  'MCN机构': { zh: 'MCN机构', en: 'MCN Agency' },
  // detail (profile) extra fields
  '平均佣金率': { zh: '平均佣金率', en: 'Avg Commission Rate' },
  '佣金率区间': { zh: '佣金率区间', en: 'Commission Rate Range' },
  '合作品牌数': { zh: '合作品牌数', en: 'Brands Collaborated' },
  '产品数': { zh: '产品数', en: 'Product Count' },
  '推广产品数': { zh: '推广产品数', en: 'Promotion Products' },
  '近30天视频数': { zh: '近30天视频数', en: 'Videos (30d)' },
  '近30天直播数': { zh: '近30天直播数', en: 'Lives (30d)' },
  '平均客单价': { zh: '平均客单价', en: 'Avg Order Value' },
  '客单价区间': { zh: '客单价区间', en: 'Order Value Range' },
  '明星达人': { zh: '明星达人', en: 'Rising Star' },
  '样片履约率': { zh: '样片履约率', en: 'Sample Fulfillment' },
  '粉丝地域': { zh: '粉丝地域', en: 'Follower Location' },
  '税制': { zh: '税制', en: 'Tax Regime' },
  '可开发票': { zh: '可开发票', en: 'Invoice Available' },
};
function fieldLabel(key, lang) {
  const m = FIELD_LABELS[key];
  return m ? (m[lang] || key) : key;
}

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
    this.rateLimit = null; // { at: timestamp, session: n, reason: string }
    this.detailStopped = false; // set by a 2nd stop click to abort the detail phase
  }

  // record a risk-control (captcha / code=10000) event for UI display
  markRateLimit(sessionIndex, reason) {
    this.rateLimit = { at: Date.now(), session: sessionIndex + 1, reason: reason || '验证码/风控' };
    this.log(`⚠️ 会话 #${sessionIndex + 1} 触发风控（${this.rateLimit.reason}），建议稍后重试`);
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
    this.detailStopped = false;
    this.paused = false;
    this.status = 'running';
    this.logs = [];
    this.result = null;

    const { cookieFiles, mode, keywords, format, outPath, detail, fields, testMode, shopRegion, dedupe, creatorInput } = config;
    // region used for the landing URL + find API params
    try { setShopRegion(shopRegion || 'US'); } catch (e) { }
    // dedupe: skip creators already scraped (stored in .scraped-ids.json next to output)
    const seenFile = path.join(path.dirname(outPath), '.scraped-ids.json');
    let scrapedIds = new Set();
    try {
      if (fs.existsSync(seenFile)) {
        const arr = JSON.parse(fs.readFileSync(seenFile, 'utf8'));
        if (Array.isArray(arr)) for (const id of arr) scrapedIds.add(String(id));
      }
    } catch (e) { }
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
      this.log(`Cookie 数: ${sessions.length} | 关键词: ${keywords.length} | 模式: ${mode} | 详情: ${detail ? '是' : '否'} | 站点: ${(shopRegion || 'US').toUpperCase()} | 查重: ${dedupe ? '开' : '关'}${creatorInput && creatorInput.length ? ' | 名单导入: ' + creatorInput.length + ' 条' : ''}${testMode ? ' | 测试模式' : ''}`);

      // Start sessions sequentially with staggered delay
      for (let i = 0; i < sessions.length; i++) {
        if (this.stopped) break;
        const s = sessions[i];
        try {
          s.browser = await this.openSession(mode, s.cookieFile, i);
          const lp = await openLandingPage(s.browser, s.cookieFile);
          s.page = lp.page;
          s.sellerId = lp.sellerId || '';
          if (s.sellerId) this.log(`会话 #${i + 1}: 店铺 ID ${s.sellerId}`);
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
          this.runSession(s, keywords, detail, outPath, testMode, dedupe, creatorInput, seenFile, scrapedIds).catch(e => this.log(`会话 #${i + 1} 错误: ${e.message}`));
        } catch (e) {
          this.log(`会话 #${i + 1} 启动失败: ${e.message}`);
        }
        // stagger between session starts
        if (i < sessions.length - 1) await this.sleep(30000 + Math.random() * 30000);
      }

      // Wait for all sessions to finish. A stop request does NOT skip this wait:
      // each session detects isStopped, breaks out of its loops, keeps the data
      // already scraped (s.creators), then marks done — only then do we export.
      // Safety cap: measure from the STOP request, not from run start, so a long
      // run never false-triggers "timeout" the moment the user clicks stop.
      let stopWaitStart = null;
      while (true) {
        const active = sessions.filter(s => !s.done);
        if (active.length === 0) break;
        if (this.stopped) {
          if (!stopWaitStart) stopWaitStart = Date.now();
          if (Date.now() - stopWaitStart > 120000) {
            this.log('⚠️ 等待会话结束超时，直接导出已抓取数据');
            break;
          }
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
      const lang = (config.headerLang === 'en') ? 'en' : 'zh';
      const pick = (Array.isArray(fields) && fields.length) ? fields : Object.keys(rows[0] || {});
      const filtered = rows.map(r => { const o = {}; for (const f of pick) if (f in r) o[fieldLabel(f, lang)] = r[f]; return o; });
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
      // close every browser (window + process) so no Chrome residue stays on screen.
      // Progress is preserved on disk via .resume-*.json, so a later run can continue.
      for (const s of sessions) {
        try {
          if (s.browser) {
            await Promise.race([
              s.browser.close(),
              new Promise(r => setTimeout(r, 5000)),
            ]).catch(() => { });
          }
        } catch (e) { }
      }
      this.log('已完成，浏览器窗口已关闭。已抓取进度已保存，可随时重新开始并自动续接。');
      // notify main immediately so history is recorded reliably (not via polling)
      if (this.onDone && this.result) {
        try { this.onDone(this.result); } catch (e) { }
      }
    }
  }

  async runSession(s, keywords, detail, outPath, testMode, dedupe, creatorInput, seenFile, scrapedIds) {
    const resumeList = path.join(path.dirname(outPath), `.resume-list-${s.index}.json`);
    const resumeDetail = path.join(path.dirname(outPath), `.resume-detail-${s.index}.json`);
    ensureDir(path.dirname(resumeList)); // make sure resume dir exists before writing
    try {
      this.log(`会话 #${s.index + 1}: 开始抓取...`);

      // details are fetched AFTER the list phase (batched), which is more
      // stable against TikTok's risk control than concurrent workers.
      let detailDoneIds = new Set();   // creators already fetched (dedupe)
      let detailResults = [];
      // load previously-fetched details from resume so we don't re-fetch them
      if (resumeDetail && fs.existsSync(resumeDetail)) {
        try {
          const prev = JSON.parse(fs.readFileSync(resumeDetail, 'utf8'));
          if (Array.isArray(prev)) {
            detailResults = prev;
            for (const d of prev) detailDoneIds.add(String(d.creator_oecuid));
          }
        } catch (e) { }
      }
      const xhrProfile = require('./browser').makeXhrFinder(s.page, PROFILE_API, s.sellerId);
      let detailCount = detailResults.length;

      const fetchOneDetail = async (c) => {
        const cid = c.creator_oecuid == null ? '' : String(c.creator_oecuid);
        if (!cid || detailDoneIds.has(cid)) return false;

        // profile_types must be called SEPARATELY — combining [1,2,3,5] only
        // returns type1. We call type1 (bio + basics) then type2 (sales/commission).
        let mergedProfile = {};
        let anyOk = false;

        for (const ptypes of [[1], [2]]) {
          let ok = false;
          // code=100000 is intermittent throttling (~40% success) → retry up to 3×
          for (let attempt = 0; attempt < 3 && !ok; attempt++) {
            const raw = await xhrProfile({ creator_oec_id: cid, profile_types: ptypes });
            let j;
            try { j = JSON.parse(raw); } catch (e) { break; }
            if (j.err || j.code !== 0) {
              const code = j.code || j.err;
              if (code === 16901008) return false;      // creator removed/banned → skip
              if (code === 16901007) {                    // rate limited → slow down
                await this.sleep(15000);
                continue;
              }
              if (code === 100000) {                      // intermittent throttle → retry
                await this.sleep(6000 + Math.random() * 6000);
                continue;
              }
              return false;                               // other errors → skip creator
            }
            ok = true;
            anyOk = true;
            const p = j.creator_profile || {};
            mergedProfile = { ...mergedProfile, ...p };
          }
          if (!ok) break; // type1 or type2 failed after retries → move on
        }
        if (!anyOk) return false;

        const flat = flattenProfile(mergedProfile);
        detailResults.push({ creator_oecuid: cid, handle: c.handle || '', ...extractDetailFields(flat) });
        detailDoneIds.add(cid);
        detailCount++;
        // record scraped id for future dedupe (if enabled)
        if (dedupe && scrapedIds) {
          scrapedIds.add(cid);
          try { fs.writeFileSync(seenFile, JSON.stringify([...scrapedIds])); } catch (e) { }
        }
        if (detailCount % 20 === 0 && resumeDetail) {
          try { fs.writeFileSync(resumeDetail, JSON.stringify(detailResults)); } catch (e) { }
        }
        this.log(`  会话#${s.index + 1} 详情 ${detailCount} 条`);
        return true;
      };

      // Shared progress handler
      const progressCb = (m) => {
        this.log(`  会话#${s.index + 1} ${m}`);
        const kwMatch = m.match(/===\s*([^ ]+)\s*from page (\d+)/);
        if (kwMatch) { this.currentInfo.keyword = kwMatch[1]; this.currentInfo.page = parseInt(kwMatch[2]) || 0; }
        const totalMatch = m.match(/total (\d+)/);
        if (totalMatch) this.currentInfo.total = parseInt(totalMatch[1]) || 0;
        if (/code=10000|风控|验证码|captcha|rate.?limit/i.test(m)) {
          this.markRateLimit(s.index, m);
          if (this.running && !this.paused && !this.stopped) {
            this.paused = true;
            this.status = 'paused';
            this.log(`⚠️ 会话 #${s.index + 1} 遇到验证码/风控，已自动暂停。请在浏览器窗口中完成滑块验证，然后点击「▶ 继续」恢复抓取。`);
          }
        }
      };

      // ── collect phase: keyword list OR user-imported creator list ──
      let res;
      if (creatorInput && creatorInput.length) {
        // 名单模式：跳过关键词，直接按 ID/handle 解析达人
        const inputs = parseCreatorInput(creatorInput);
        res = await scrapeByInput(s.page, inputs, {
          isStopped: () => this.stopped,
          isPaused: () => this.paused,
          fast: !detail, // list-only mode → faster pacing
          onNewCreators: async (newOnes) => {
            if (!detail) return;
            // 即时串行补详情（模拟人类节奏）
            for (const c of newOnes) {
              if (this.detailStopped) break;
              while (this.paused && !this.detailStopped && this.running) await this.sleep(700);
              try { await fetchOneDetail(c); } catch (e) { }
              await this.sleep(6000 + Math.random() * 9000); // human-like pacing
            }
          },
          onProgress: progressCb,
        });
      } else {
        res = await scrapeList(s.page, keywords, {
          resumeState: resumeList,
          isStopped: () => this.stopped,
          isPaused: () => this.paused,
          maxPages: testMode ? 1 : Infinity,
          sellerId: s.sellerId,
          fast: !detail, // list-only mode → faster pacing
          onNewCreators: async (newOnes) => {
            if (!detail) return;
            // 即时串行补详情：每页新达人人逐个抓，模拟人类操作，再翻下一页
            let skipped = 0;
            for (const c of newOnes) {
              if (this.detailStopped) break;
              while (this.paused && !this.detailStopped && this.running) await this.sleep(700);
              const cid = c.creator_oecuid == null ? '' : String(c.creator_oecuid);
              // dedupe: skip creators already scraped
              if (dedupe && cid && scrapedIds.has(cid)) { skipped++; continue; }
              try { await fetchOneDetail(c); } catch (e) { }
              await this.sleep(6000 + Math.random() * 9000); // human-like pacing
            }
            if (skipped) this.log(`  会话#${s.index + 1} 查重跳过 ${skipped} 位已抓达人`);
          },
          onProgress: progressCb,
        });
      }
      s.creators = res.creators;
      this.log(`会话 #${s.index + 1}: 列表 ${s.creators.length} 条`);

      // ── tail: fetch any remaining details (e.g. creators loaded from resume) ──
      if (detail && s.creators.length) {
        const remaining = s.creators.filter(c => !detailDoneIds.has(c == null ? '' : String(c.creator_oecuid)));
        if (remaining.length) {
          this.log(`会话 #${s.index + 1}: 补充 ${remaining.length} 位达人详情...`);
          for (const c of remaining) {
            if (this.detailStopped) break;
            while (this.paused && !this.detailStopped && this.running) await this.sleep(700);
            const cid = c.creator_oecuid == null ? '' : String(c.creator_oecuid);
            if (dedupe && cid && scrapedIds.has(cid)) continue;
            try { await fetchOneDetail(c); } catch (e) { }
            await this.sleep(6000 + Math.random() * 9000);
          }
        }
      }
      s.details = detailResults;
      if (resumeDetail) {
        try { fs.writeFileSync(resumeDetail, JSON.stringify(detailResults)); } catch (e) { }
      }
      this.log(`会话 #${s.index + 1}: 详情 ${s.details.length} 条`);
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
      if (this.stopped) {
        // 2nd click while details are being scraped → abort the detail phase too
        this.detailStopped = true;
        this.log('收到中止请求，正在结束详情补抓并导出已抓取数据...');
      } else {
        this.stopped = true;
        // If paused, un-pause so list/details can finish and the data can export.
        // (Otherwise a paused session sits in the pause gate forever and export
        // would either timeout with 0 rows or block indefinitely.)
        if (this.paused) {
          this.paused = false;
          this.status = 'running';
        }
        this.log('收到结束请求，完成当前请求后保存已抓取数据并导出...');
      }
    }
  }
}

module.exports = { MultiRunner };
