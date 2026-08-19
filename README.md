# TikTok Shop 达人抓取工具 | TikTok Shop Creator Scraper

**专为 TikTok Shop 卖家（Owner）打造的开源桌面工具**：一键抓取 TikTok Shop 联盟（Affiliate）达人广场数据，批量获取达人信息、筛选合作对象、分析带货数据，导出 CSV / Excel。

> Open-source desktop app for TikTok Shop sellers to scrape & analyze affiliate creators — find top creators, extract emails, MCN info, and export to CSV/Excel.

---

## 这个工具能做什么 | What It Does

- 🔍 **抓取达人广场数据**：从 TikTok Shop 联盟后台批量获取达人列表
- 📊 **带货数据**：GMV、销量、视频/直播表现、粉丝画像
- 📧 **达人联系方式**：简介、合作邮箱、MCN 机构
- 📁 **导出表格**：CSV / Excel，字段可自定义
- 👥 **多账号并发**：支持多 Cookie 同时抓取
- 🔄 **自动更新**：启动时检查新版本，一键更新

## 适合谁 | Who It's For

- **TikTok Shop 卖家**：找达人带货、筛选合作对象
- **联盟运营 / 商务**：批量整理达人信息、联系洽谈
- **选品团队**：按类目分析达人带货数据

## 可抓取的数据 | Data You Can Collect

| 类别 | 字段 |
|---|---|
| 基础信息 | 达人主页、昵称、达人ID、头像、地区、粉丝数 |
| 带货数据 | 总GMV、视频GMV、直播GMV、销量、类目 |
| 内容表现 | 平均观看、互动量、GPM、UV |
| 粉丝画像 | 年龄段、性别分布、PPS评分 |
| 详情（可选） | 简介、合作邮箱、MCN机构 |

## 安装 | Install

⬇️ **[TikTok-Creator-Scraper-Setup.exe](https://github.com/1Milkdeliver/tiktok-shop-creator-scraper/releases/latest)**（Windows 安装包）

- 双击运行安装向导，同意许可协议后安装
- 自动创建桌面快捷方式
- 输出文件默认在安装目录 `output/`，日志在 `logs/`

> Windows SmartScreen 提示时点"更多信息 → 仍要运行"（开源未签名程序正常提示）。

## 快速开始 | Quick Start

1. 登录 TikTok Shop 联盟后台，进入达人广场
2. 用 [Cookie-Editor](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm) 导出 Cookie
3. 打开工具 → 粘贴/拖入 Cookie → 选类目 → 开始抓取

## 技术特性 | Features

- Electron 桌面应用（Windows）
- 多 Cookie 并发抓取（错峰调度）
- 请求间隔自动随机化，稳定抓取
- 断点续抓、历史记录、Cookie 记忆
- 自动创建输出/日志目录，日志自动轮转

## 开发 | Development

```bash
npm install
npm start          # 运行
npm run build      # 打包安装程序
```

## 发布新版 | Release

内置自动检查更新：修改 `package.json` 版本号 → 打包 → 发布 GitHub Release，旧版用户自动收到更新提示。

## 使用提示

- 本工具用于卖家自身账号的数据查看
- Cookie 仅保存在本机，不会上传
- 数据仅供个人商业分析

## 许可证 | License

本项目采用 **GPL-3.0** 许可证，详见 [LICENSE](LICENSE)。

---

*Keywords: TikTok Shop affiliate creator scraper, 达人抓取, TikTok联盟达人, TikTok Shop 卖家工具, creator data export, TikTok influencer analytics, 达人数据采集*
