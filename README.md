<p align='center'>
<img src='./build/icon.ico' width="150" height="150" alt="TikTokShop Creator Scraper Icon" />
</p>

<h1 align="center">TikTokShop Creator Scraper</h1>

<p align="center">Open-source desktop app for TikTok Shop sellers to discover, analyze and export affiliate creator data — GMV, followers, engagement, bio, email, MCN info — to CSV/Excel.</p>

<p align="center">
  <a href="https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/stargazers"><img src="https://img.shields.io/github/stars/1Milkdeliver/tiktok-shop-creator-scraper" alt="Stars Badge"/></a>
  <a href="https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/network/members"><img src="https://img.shields.io/github/forks/1Milkdeliver/tiktok-shop-creator-scraper" alt="Forks Badge"/></a>
  <a href="https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/blob/main/LICENSE"><img src="https://img.shields.io/github/license/1Milkdeliver/tiktok-shop-creator-scraper" alt="License Badge"/></a>
  <a href="https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/releases/latest"><img src="https://img.shields.io/github/v/release/1Milkdeliver/tiktok-shop-creator-scraper" alt="Latest Release"/></a>
</p>

<div align="center">
  <a href="./README.zh.md">中文</a> / <a href="./README.md">English</a>
</div>

---

## 📑 Table of Contents

- [🚀 Introduction](#-introduction)
- [🎯 Who It's For](#-who-its-for)
- [✨ Features](#-features)
- [📊 Data You Can Collect](#-data-you-can-collect)
- [📦 Install](#-install)
- [🚀 Quick Start](#-quick-start)
- [❓ FAQ](#-faq)
- [💻 Development](#-development)
- [📤 Release / Update](#-release--update)
- [📄 License](#-license)

---

## 🚀 Introduction

**TikTokShop Creator Scraper** is a desktop application built for **TikTok Shop sellers** to:

- Scrape creator data from the TikTok Shop Affiliate (联盟) marketplace
- Analyze creator performance (GMV, sales, engagement, follower demographics)
- Extract creator contact info (bio, email, MCN agency)
- Export everything to **CSV / Excel** with selectable fields

> Open-source · GPL-3.0 · Windows desktop app · Multi-account support

## 🎯 Who It's For

- **TikTok Shop Sellers** — find creators to collaborate with, screen potential partners
- **Affiliate Ops / Business Dev** — batch-organize creator info, reach out for collaboration
- **Product Selection Teams** — analyze creator data by category

## ✨ Features

| Feature | Description |
|---|---|
| 🔍 Creator scraping | Batch-scrape the affiliate creator marketplace |
| 📊 Performance data | GMV, sales, video/live performance, follower profile |
| 📧 Contact info | Bio, collaboration email (extracted), MCN agency |
| 📁 Export | CSV / Excel with customizable fields |
| 👥 Multi-account | Multiple cookies for concurrent scraping |
| 🌐 Bilingual UI | Chinese / English interface with one-click switch |
| 🔄 Auto-update | Checks for new versions on startup, one-click update |
| 💾 Data memory | Remembers cookies, output history, resume from breakpoints |
| 🖥️ Desktop integration | Desktop shortcut, custom icon, auto output/log folders |
| 🛡️ Install guard | Detects existing install, prevents duplicate installation |

## 📊 Data You Can Collect

| Category | Fields |
|---|---|
| Basic Info | handle, nickname, creator ID, avatar, region, follower count |
| Sales Data | total GMV, video GMV, live GMV, units sold, category |
| Content Performance | avg views, engagement, GPM, UV |
| Follower Profile | age distribution, gender split, PPS score |
| Details (optional) | bio, collaboration email, MCN agency |

## 📦 Install

⬇️ **[TikTok-Creator-Scraper-Setup.exe](https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/releases/latest)** (Windows installer)

- Run the installer wizard, accept the license agreement
- Desktop shortcut created automatically
- Output files go to `output/` folder, logs to `logs/` folder in the install directory

> If Windows SmartScreen warns, click "More info → Run anyway" (normal for unsigned open-source apps).

## 🚀 Quick Start

### Step 1 — Export your Cookie (required)

The app needs your TikTok Shop Affiliate **login cookie** to access creator data. Exporting it takes ~2 minutes:

1. **Open Chrome** (or Edge) and go to the TikTok Shop Affiliate backend:
   **`https://affiliate.tiktokshopglobalselling.com`**
2. **Log in** to your seller account and open the **Creator Marketplace** (达人广场) page
3. **Install the Cookie-Editor extension**:
   [**Cookie-Editor**](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)
   → click "Add to Chrome" → confirm in the popup
   > If you already have it, skip this step. (Other compatible extensions: EditThisCookie, Cookie-Editor, etc.)
4. **Open the extension** — click the puzzle 🧩 icon (Extensions) in Chrome's top-right, then click **Cookie-Editor**
5. Click the **Export** button (bottom of the Cookie-Editor panel) — your cookies are now copied to the clipboard as a JSON text
6. **Paste or save it**:
   - **Option A (paste)**: open the app, click in the cookie box, paste (Ctrl+V) — done
   - **Option B (file)**: paste into a text file, save as `cookies.json`, then drag it into the app or click "Browse…"

> 💡 **What is a cookie?** It's a small token your browser stores after login. The app uses it only to view data under your own account — it never uploads or shares it.

### Step 2 — Configure & Start

1. **Browser mode**: keep "Auto (Recommended)" — it connects to your Chrome if possible, otherwise opens an off-screen window
2. **Select categories**: check the creator categories you want (select all / clear, 中/EN switch available)
3. **Export settings**: choose CSV or Excel, pick an output folder, optionally select which fields to export
   - Check "Also scrape details" if you need bio / email / MCN (slower)
4. Click **▶ Start Scraping** — progress shows in the log below
5. When done, the file is saved to your chosen folder: `达人数据-日期-时间.csv` / `.xlsx`

> 🆕 **First time?** Click **🔍 Test** first to verify everything works with a 1-page trial scrape (isolated environment, no full run).

## ❓ FAQ

**Q: "Page did not load properly"?**  
A: Your cookie may have expired (TikTok sessions last ~3 days). Re-export a fresh cookie.

**Q: Scraping is slow?**  
A: Request intervals are randomized (~6-15s) for stability. Enabling details (bio/email) is slower as each creator is queried individually.

**Q: How do I use multiple accounts?**  
A: Click "＋ Add Account" in the cookie area and paste multiple account cookies. The app scrapes concurrently with staggered starts.

**Q: Interrupted mid-scrape?**  
A: Restart the app and scrape again — it resumes automatically from the last checkpoint.

## 💻 Development

```bash
npm install
npm start          # run in dev mode
npm run build      # build installer → dist/TikTokShop达人抓取安装程序-<version>.exe
```

> Set `CSC_IDENTITY_AUTO_DISCOVERY=false` when packaging to skip code signing (known Windows symlink permission issue).

## 📤 Release / Update

The app checks GitHub for new versions on startup. To publish a new version:

```bash
# 1. Bump version in package.json (e.g. 1.1.1 → 1.2.0)
# 2. Build installer
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run build
# 3. Publish release
Copy-Item "dist\TikTokShop达人抓取安装程序-1.2.0.exe" "dist\TikTok-Creator-Scraper-Setup.exe"
gh release create v1.2.0 "dist\TikTok-Creator-Scraper-Setup.exe" --repo 1Milkdeliver/tiktok-shop-creator-scraper --title "v1.2.0" --notes "release notes"
# 4. Old-version users get update prompt on startup → install over same directory (data preserved)
```

> Version comparison: three-part version (major.minor.patch). Keep only the latest release — README download link auto-points to `/releases/latest`.

## 📄 License

This project is licensed under the **GPL-3.0** License — see the [LICENSE](LICENSE) file.

---

*Keywords: TikTok Shop affiliate creator scraper, TikTok creator data, TikTok Shop seller tool, creator export CSV Excel, TikTok influencer analytics, TikTok达人抓取, TikTok联盟达人*
