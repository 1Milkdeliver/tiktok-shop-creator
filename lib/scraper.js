// TikTok Shop Creator Scraper — 专为 TikTok Shop 卖家打造
'use strict';

const fs = require('fs');

const FIND_API = '/api/v1/oec/affiliate/creator/marketplace/find';
const PROFILE_API = '/api/v1/oec/affiliate/creator/marketplace/profile';
const PAGE_SIZE = 12;
// random delay range (ms) to mimic human-like browsing rhythm
const DELAY_MIN = 6000;
const DELAY_MAX = 15000;
const MAX_FAILS = 5;
const STALL_PAGES = 40;

function humanDelay() {
  // random between DELAY_MIN..DELAY_MAX, sometimes a longer "pause"
  let d = DELAY_MIN + Math.random() * (DELAY_MAX - DELAY_MIN);
  if (Math.random() < 0.15) d += 8000 + Math.random() * 15000; // 15% chance of a longer pause
  return d;
}

// extract slim fields from a find-list creator
function slimCreator(c) {
  const g = (k, d) => { const f = c[k]; if (f === null || f === undefined) return d; if (typeof f === 'object' && 'is_authorized' in f) return f.value === undefined ? d : f.value; return f; };
  const avatar = g('avatar');
  const avatarUrl = avatar && typeof avatar === 'object' ? (avatar.url_list || avatar.thumb_url_list || [])[0] || '' : '';
  return {
    creator_oecuid: g('creator_oecuid'), handle: g('handle'), nickname: g('nickname'), avatar: avatarUrl,
    selection_region: g('selection_region'), follower_cnt: g('follower_cnt'), main_industry: g('main_industry'),
    category: g('category'), video_avg_view_cnt: g('video_avg_view_cnt'), video_play_cnt_med: g('video_play_cnt_med'),
    video_engagement: g('video_engagement'), ec_video_engagement: g('ec_video_engagement'),
    video_gmv: g('video_gmv'), live_gmv: g('live_gmv'), med_gmv_revenue: g('med_gmv_revenue'),
    med_gmv_revenue_range: g('med_gmv_revenue_range'), units_sold: g('units_sold'), units_sold_range: g('units_sold_range'),
    ec_video_gpm: g('ec_video_gpm'), ec_live_gpm: g('ec_live_gpm'), ec_live_avg_uv: g('ec_live_avg_uv'),
    top_follower_ages: g('top_follower_ages'), top_follower_gender: g('top_follower_gender'),
    pps_score: g('pps_score'), is_fast_growing: g('is_fast_growing'), is_active_creator: g('is_active_creator'),
    is_quickly_response: g('is_quickly_response'), has_collaborated: g('has_collaborated'),
    is_rising_star: g('is_rising_star'), is_official_recommend: g('is_official_recommend'),
    is_ecom_authorized: g('is_ecom_authorized'), is_high_sample_dispatch_rate: g('is_high_sample_dispatch_rate'),
    sorted_creator_labels: g('sorted_creator_labels'), creator_bind_mcn_name: g('creator_bind_mcn_name'),
    sample_fulfillment_rate: g('sample_fulfillment_rate'), follower_state_location: g('follower_state_location'),
    vertical_pro_category: g('vertical_pro_category'), vat: g('vat'), it_tax_regime: g('it_tax_regime'),
    brand_safe_tag: g('brand_safe_tag'), invoice_available: g('invoice_available'),
    receipt_info_authorized: g('receipt_info_authorized'), creator_permission_tag: g('creator_permission_tag'),
    is_live_auction: g('is_live_auction'),
  };
}

// flatten detail profile object
function flattenProfile(profile) {
  const out = {};
  for (const k of Object.keys(profile || {})) {
    const v = profile[k];
    if (v && typeof v === 'object' && 'is_authorized' in v) {
      const val = v.value;
      if (val === undefined || val === null) continue;
      out[k] = typeof val === 'object' ? JSON.stringify(val) : String(val);
    } else if (v !== undefined && v !== null) {
      out[k] = typeof v === 'object' ? JSON.stringify(v) : String(v);
    }
  }
  return out;
}

// Extract useful detail fields (bio, email, MCN, sales, collab) from a flattened profile
const EMAIL_RE = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
function extractDetailFields(profile) {
  const out = {};
  const bio = profile.bio || '';
  if (bio) out['简介'] = String(bio).slice(0, 1000);
  const emails = String(bio).match(EMAIL_RE) || [];
  if (emails.length) out['合作邮箱'] = [...new Set(emails)].join(', ');
  const mcn = profile.creator_bind_mcn_name;
  if (mcn) out['MCN机构'] = String(mcn).slice(0, 200);
  const cat = profile.category;
  if (cat) {
    try { const arr = JSON.parse(cat); if (Array.isArray(arr)) out['类目'] = arr.map(x => x.name || '').filter(Boolean).join(' | '); }
    catch (e) { out['类目'] = cat; }
  }
  // ── type2 sales / collab fields (from separate profile_types calls) ──
  if (profile.med_commission_rate != null) out['平均佣金率'] = String(profile.med_commission_rate);
  if (profile.med_commission_rate_range != null) out['佣金率区间'] = String(profile.med_commission_rate_range);
  if (profile.collaborated_brands_num != null) out['合作品牌数'] = String(profile.collaborated_brands_num);
  if (profile.product_cnt != null) out['产品数'] = String(profile.product_cnt);
  if (profile.promotion_product_cnt != null) out['推广产品数'] = String(profile.promotion_product_cnt);
  if (profile.video_cnt_last_30_days != null) out['近30天视频数'] = String(profile.video_cnt_last_30_days);
  if (profile.live_cnt_last_30_days != null) out['近30天直播数'] = String(profile.live_cnt_last_30_days);
  if (profile.video_play_med_last_30_days != null) out['视频中位观看30天'] = String(profile.video_play_med_last_30_days);
  if (profile.average_order_value != null) out['平均客单价'] = String(profile.average_order_value);
  if (profile.average_order_value_range != null) out['客单价区间'] = String(profile.average_order_value_range);
  // ── type3 collab / tax fields ──
  if (profile.is_rising_star != null) out['明星达人'] = String(profile.is_rising_star);
  if (profile.sample_fulfillment_rate != null) out['样片履约率'] = String(profile.sample_fulfillment_rate);
  if (profile.follower_state_location != null) out['粉丝地域'] = String(profile.follower_state_location);
  if (profile.vat != null) out['VAT'] = String(profile.vat);
  if (profile.it_tax_regime != null) out['税制'] = String(profile.it_tax_regime);
  if (profile.brand_safe_tag != null) out['品牌安全'] = String(profile.brand_safe_tag);
  if (profile.invoice_available != null) out['可开发票'] = String(profile.invoice_available);
  return out;
}

// scrapes all keywords' pools; returns { creators, rateLimited }
async function scrapeList(page, keywords, { onProgress, resumeState, isStopped, isPaused, maxPages, onNewCreators, sellerId }) {
  const xhrFind = require('./browser').makeXhrFinder(page, FIND_API, sellerId);
  const creators = [];
  const seen = new Set();

  let state = { dims: {} };
  if (resumeState && fs.existsSync(resumeState)) {
    try { state = JSON.parse(fs.readFileSync(resumeState, 'utf8')); } catch (e) { }
  }
  if (state.creators && Array.isArray(state.creators)) {
    for (const c of state.creators) {
      const id = c && c.creator_oecuid;
      const key = id == null ? '' : String(id);
      if (key && !seen.has(key)) { seen.add(key); creators.push(c); }
    }
  }

  const saveState = () => {
    if (resumeState) {
      try { fs.writeFileSync(resumeState, JSON.stringify({ dims: state.dims, creators })); } catch (e) { }
    }
  };

  let fails = 0;
  for (const kw of keywords) {
    if (isStopped && isStopped()) break;
    let st = state.dims[kw];
    if (!st) { st = { page: 0, searchKey: '', cursor: 0, hasMore: true, stall: 0, totalNew: 0 }; state.dims[kw] = st; }
    if (!st.hasMore) { onProgress && onProgress(`[${kw}] done (${st.totalNew} new)`); continue; }
    onProgress && onProgress(`=== ${kw} from page ${st.page} ===`);
    while (st.hasMore) {
      if (isStopped && isStopped()) { saveState(); onProgress && onProgress('已停止'); break; }
      if (isPaused && isPaused()) {
        saveState(); // persist progress immediately on pause so nothing is lost
        onProgress && onProgress('⏸ 已暂停，等待继续...');
        while (isPaused() && !(isStopped && isStopped())) {
          await new Promise(r => setTimeout(r, 500));
        }
        onProgress && onProgress('▶ 继续');
        if (isStopped && isStopped()) break;
      }
      if (maxPages && st.page >= maxPages) { onProgress && onProgress(`[${kw}] 测试模式仅抓 ${maxPages} 页`); st.hasMore = false; break; }
      const body = { query: kw, pagination: { page: st.page, size: PAGE_SIZE, search_key: st.searchKey || '', next_item_cursor: st.cursor || 0 }, algorithm: 1, filter_params: {} };
      const raw = await xhrFind(body);
      let j;
      try { j = JSON.parse(raw); } catch (e) { fails++; onProgress && onProgress(`[${kw}] p${st.page}: parse fail`); if (fails >= MAX_FAILS) break; await new Promise(r => setTimeout(r, 15000)); continue; }
      if (j.err || j.code !== 0) {
        fails++;
        onProgress && onProgress(`[${kw}] p${st.page}: code=${j.code || j.err} (fails=${fails})`);
        if (fails >= MAX_FAILS) break;
        await new Promise(r => setTimeout(r, 15000));
        continue;
      }
      fails = 0;
      const list = j.creator_profile_list || [];
      let added = 0;
      const newOnes = []; // newly added creators this page (for immediate detail queue)
      for (const c of list) {
        const id = c.creator_oecuid && c.creator_oecuid.value;
        if (id && !seen.has(id)) {
          const slim = slimCreator(c);
          seen.add(id); creators.push(slim); added++;
          newOnes.push(slim);
        }
      }
      if (newOnes.length && onNewCreators) {
        try { onNewCreators(newOnes); } catch (e) { }
      }
      const np = j.next_pagination || {};
      st.hasMore = !!np.has_more;
      st.page = np.next_page != null ? np.next_page : st.page + 1;
      st.searchKey = np.search_key || st.searchKey;
      st.cursor = np.next_item_cursor != null ? np.next_item_cursor : st.cursor;
      st.stall = added < 5 ? (st.stall || 0) + 1 : 0;
      st.totalNew = (st.totalNew || 0) + added;
      if (creators.length % 30 < 12) saveState();
      onProgress && onProgress(`[${kw}] p${st.page - 1}: +${added} (total ${creators.length})`);
      if (!st.hasMore) { onProgress && onProgress(`[${kw}] DONE`); break; }
      if ((st.stall || 0) >= STALL_PAGES) { onProgress && onProgress(`[${kw}] stalled`); st.hasMore = false; break; }
      await new Promise(r => setTimeout(r, humanDelay()));
    }
    saveState();
    if (fails >= MAX_FAILS) {
      onProgress && onProgress('连续失败（可能被限流/风控），停止本阶段等待自动恢复');
      saveState();
      return { creators, rateLimited: true };
    }
  }
  saveState();
  return { creators, rateLimited: false };
}

// scrape full profiles; returns { details, rateLimited }
async function scrapeDetails(page, creators, { onProgress, resumeFile, isStopped, isPaused }) {
  const xhrProfile = require('./browser').makeXhrFinder(page, PROFILE_API);
  const doneMap = new Set();
  if (resumeFile && fs.existsSync(resumeFile)) {
    try {
      const prev = JSON.parse(fs.readFileSync(resumeFile, 'utf8'));
      if (Array.isArray(prev)) for (const d of prev) doneMap.add(String(d.creator_oecuid));
    } catch (e) { }
  }
  const results = [];
  if (resumeFile && fs.existsSync(resumeFile)) {
    try { const prev = JSON.parse(fs.readFileSync(resumeFile, 'utf8')); if (Array.isArray(prev)) results.push(...prev); } catch (e) { }
  }

  let fails = 0;
  const saveResults = () => {
    if (resumeFile) {
      try { fs.writeFileSync(resumeFile, JSON.stringify(results)); } catch (e) { }
    }
  };
  for (const c of creators) {
    if (isStopped && isStopped()) { saveResults(); onProgress && onProgress('已停止'); break; }
    if (isPaused && isPaused()) {
      saveResults(); // persist details immediately on pause
      onProgress && onProgress('⏸ 已暂停，等待继续...');
      while (isPaused() && !(isStopped && isStopped())) {
        await new Promise(r => setTimeout(r, 500));
      }
      if (isStopped && isStopped()) { saveResults(); break; }
    }
    const cid = c.creator_oecuid == null ? '' : String(c.creator_oecuid);
    if (!cid || doneMap.has(cid)) continue;
    const raw = await xhrProfile({ creator_oec_id: cid, profile_types: [1, 2, 3, 5] });
    let j;
    try { j = JSON.parse(raw); } catch (e) { fails++; if (fails >= MAX_FAILS) break; await new Promise(r => setTimeout(r, 12000)); continue; }
    if (j.err || j.code !== 0) {
      fails++;
      onProgress && onProgress(`${cid}: code=${j.code || j.err} (fails=${fails})`);
      if (fails >= MAX_FAILS) break;
      await new Promise(r => setTimeout(r, 12000));
      continue;
    }
    fails = 0;
    const profile = j.creator_profile || {};
    const flat = flattenProfile(profile);
    results.push({ creator_oecuid: cid, handle: c.handle || '', ...extractDetailFields(flat) });
    if (results.length % 20 === 0 && resumeFile) {
      try { fs.writeFileSync(resumeFile, JSON.stringify(results)); } catch (e) { }
    }
    onProgress && onProgress(`detail ${results.length}/${creators.length}`);
    await new Promise(r => setTimeout(r, humanDelay()));
  }
  if (resumeFile) {
    try { fs.writeFileSync(resumeFile, JSON.stringify(results)); } catch (e) { }
  }
  return { details: results, rateLimited: fails >= MAX_FAILS };
}

module.exports = { scrapeList, scrapeDetails, slimCreator, extractDetailFields, flattenProfile, FIND_API, PROFILE_API };
