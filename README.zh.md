<p align='center'>
<img src='./build/icon.ico' width="150" height="150" alt="TikTokShop达人抓取 图标" />
</p>

<h1 align="center">TikTokShop达人抓取</h1>

<p align="center">专为 TikTok Shop 卖家打造的开源桌面工具：一键抓取联盟达人广场数据、分析带货表现、获取达人邮箱与 MCN 信息，导出 CSV / Excel。</p>

<p align="center">
  <a href="https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/stargazers"><img src="https://img.shields.io/github/stars/1Milkdeliver/tiktok-shop-creator-scraper" alt="Stars"/></a>
  <a href="https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/network/members"><img src="https://img.shields.io/github/forks/1Milkdeliver/tiktok-shop-creator-scraper" alt="Forks"/></a>
  <a href="https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/blob/main/LICENSE"><img src="https://img.shields.io/github/license/1Milkdeliver/tiktok-shop-creator-scraper" alt="License"/></a>
  <a href="https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/releases/latest"><img src="https://img.shields.io/github/v/release/1Milkdeliver/tiktok-shop-creator-scraper" alt="最新版本"/></a>
</p>

<div align="center">
  <a href="./README.zh.md">中文</a> / <a href="./README.md">English</a>
</div>

---

## 📑 目录

- [🚀 项目介绍](#-项目介绍)
- [🎯 适合谁用](#-适合谁用)
- [✨ 功能特性](#-功能特性)
- [📊 可抓取的数据](#-可抓取的数据)
- [📦 安装](#-安装)
- [🚀 快速开始](#-快速开始)
- [❓ 常见问题](#-常见问题)
- [💻 开发](#-开发)
- [📤 发布新版](#-发布新版)
- [📄 许可证](#-许可证)

---

## 🚀 项目介绍

**TikTokShop达人抓取** 是专为 **TikTok Shop 卖家（Owner）** 打造的桌面应用：

- 抓取 TikTok Shop 联盟达人广场数据
- 分析达人带货表现（GMV、销量、互动、粉丝画像）
- 提取达人联系方式（简介、合作邮箱、MCN 机构）
- 导出 **CSV / Excel**，字段可自定义

> 开源 · GPL-3.0 · Windows 桌面应用 · 支持多账号

## 🎯 适合谁用

- **TikTok Shop 卖家**：找达人带货、筛选合作对象
- **联盟运营 / 商务**：批量整理达人信息、联系洽谈
- **选品团队**：按类目分析达人带货数据

## ✨ 功能特性

| 功能 | 说明 |
|---|---|
| 🔍 达人抓取 | 批量抓取联盟达人广场数据 |
| 📊 带货数据 | GMV、销量、视频/直播表现、粉丝画像 |
| 📧 联系方式 | 简介、合作邮箱（自动提取）、MCN 机构 |
| 📁 数据导出 | CSV / Excel，字段可自定义 |
| 👥 多账号并发 | 多个 Cookie 同时抓取 |
| 🌐 中英双语 | 界面一键切换中英文 |
| 🔄 自动更新 | 启动时检查新版本，一键更新 |
| 💾 数据记忆 | 记住 Cookie、历史输出、断点续抓 |
| 🖥️ 桌面集成 | 桌面快捷方式、自定义图标、自动创建输出/日志目录 |
| 🛡️ 安装检测 | 检测已安装版本，防止重复安装 |

## 📊 可抓取的数据

| 类别 | 字段 |
|---|---|
| 基础信息 | 达人主页、昵称、达人ID、头像、地区、粉丝数 |
| 带货数据 | 总GMV、视频GMV、直播GMV、销量、类目 |
| 内容表现 | 平均观看、互动量、GPM、UV |
| 粉丝画像 | 年龄段、性别分布、PPS评分 |
| 详情（可选） | 简介、合作邮箱、MCN机构 |

## 📦 安装

⬇️ **[TikTok-Creator-Scraper-Setup.exe](https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/releases/latest)**（Windows 安装包）

- 双击运行安装向导，同意许可协议后安装
- 自动创建桌面快捷方式
- 输出文件默认在安装目录 `output/` 文件夹，日志在 `logs/` 文件夹
- 已安装时自动检测，提示覆盖而非重复安装

> Windows SmartScreen 提示时点"更多信息 → 仍要运行"（开源未签名程序正常提示）。

## 🚀 快速开始

### 第一步：导出 Cookie（必做，约 2 分钟）

工具需要你的 TikTok Shop 联盟**登录 Cookie** 才能查看达人数据。导出步骤：

1. **打开 Chrome 浏览器**（Edge 也可以），访问 TikTok Shop 联盟后台：
   **`https://affiliate.tiktokshopglobalselling.com`**
2. **登录你的卖家账号**，进入**达人广场**页面
3. **安装 Cookie-Editor 扩展**：
   点这里 → [**Cookie-Editor**](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)
   → 点"添加至 Chrome"→ 弹窗确认
   > 已安装的跳过这步。（其他同类扩展：EditThisCookie 等也可用）
4. **打开扩展**：点 Chrome 右上角的拼图 🧩 图标（扩展程序）→ 点 **Cookie-Editor**
5. 点扩展面板里的 **Export（导出）** 按钮 —— Cookie 会以 JSON 文本复制到剪贴板
6. **粘贴或保存**：
   - **方式 A（粘贴）**：打开工具，点 Cookie 输入框，按 Ctrl+V 粘贴 —— 完成
   - **方式 B（文件）**：把内容粘贴到记事本，保存为 `cookies.json`，再拖进工具或点"浏览文件…"

> 💡 **Cookie 是什么？** 它是浏览器在登录后保存的一串"通行证"。工具只用它在你的账号下查看数据，**不会上传或分享**。

### 第二步：配置并开始

1. **浏览器模式**：保持"自动（推荐）"——优先连接你的 Chrome，没有则自动开屏幕外窗口
2. **选择类目**：勾选要抓取的达人类目（支持全选/清空、中英文切换）
3. **导出设置**：选 CSV 或 Excel、选输出文件夹、可选勾选导出字段
   - 需要简介/邮箱/MCN 时勾选"同时抓取详情"（速度慢 2-3 倍）
4. 点 **▶ 开始抓取** —— 下方日志区实时显示进度
5. 完成后文件保存到你选的文件夹：`达人数据-日期-时间.csv` / `.xlsx`

> 🆕 **第一次用？** 先点 **🔍 测试连接** 验证环境（隔离环境抓 1 页试跑，不占正式流程）。

## ❓ 常见问题

**Q：提示"页面未正常加载"？**  
A：Cookie 可能失效（TikTok 登录态约 3 天有效），重新导出 Cookie 即可。

**Q：抓取速度慢？**  
A：为保证稳定性，请求间隔会随机化（约 6-15 秒）。抓详情（简介/邮箱）时更慢（每个达人单独请求）。

**Q：多账号怎么用？**  
A：在 Cookie 区点"＋ 添加账号"，粘贴多个账号 Cookie，工具自动并发抓取（错峰启动）。

**Q：中途断了怎么办？**  
A：再次启动并开始抓取，会自动从上次位置继续（断点续抓）。

## 💻 开发

```bash
npm install
npm start          # 运行（开发模式）
npm run build      # 打包安装程序 → dist/TikTokShop达人抓取安装程序-<版本>.exe
```

> 打包时设置 `CSC_IDENTITY_AUTO_DISCOVERY=false` 跳过代码签名（Windows 符号链接权限的已知问题）。

## 📤 发布新版

应用内置自动检查更新。发布新版只需 4 步：

```bash
# 1. 更新 package.json 版本号（如 1.1.1 → 1.2.0）
# 2. 打包
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run build
# 3. 发布
Copy-Item "dist\TikTokShop达人抓取安装程序-1.2.0.exe" "dist\TikTok-Creator-Scraper-Setup.exe"
gh release create v1.2.0 "dist\TikTok-Creator-Scraper-Setup.exe" --repo 1Milkdeliver/tiktok-shop-creator-scraper --title "v1.2.0" --notes "版本说明"
# 4. 旧版用户启动时自动提示更新 → 同一目录覆盖安装（数据保留）
```

> 版本比较规则：三位版本号，任一更高即提示更新。Release 只留最新版，下载链接自动指向最新。

## 📄 许可证

本项目采用 **GPL-3.0** 许可证，详见 [LICENSE](LICENSE) 文件。

---

*关键词：TikTok Shop 达人抓取、TikTok联盟达人、达人数据采集、TikTok 卖家工具、达人导出 CSV Excel、TikTok 网红数据分析*
