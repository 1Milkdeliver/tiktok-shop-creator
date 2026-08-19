# TikTok Shop 达人抓取工具（桌面版）

**专为 TikTok Shop 卖家（Owner）打造**：一键抓取联盟达人数据，快速筛选适合合作的达人，导出本地表格。

基于 Electron 的桌面程序，抓取 TikTok Shop 联盟达人广场数据，导出本地表格。

> ⭐ **GitHub 项目主页**：https://github.com/1Milkdeliver/tiktok-creator-scraper
> 👤 **作者**：1Milkdeliver（https://github.com/1Milkdeliver）

## 适合谁用

- **TikTok Shop 卖家**：找达人带货、筛选合作对象、挖掘潜力达人
- **运营/商务**：批量获取达人联系方式（简介邮箱）、MCN 机构信息
- **选品团队**：按类目批量抓取达人数据做市场分析

## 两种安装包

在 `dist/` 目录：

| 文件 | 说明 |
|---|---|
| `TikTok达人抓取-便携版.exe` | **免安装**，双击即用（推荐） |
| `TikTok达人抓取-安装版-1.0.0.exe` | 安装程序，可选安装目录、创建桌面快捷方式 |

## 功能

- **原生桌面窗口**（非网页版），支持原生文件夹选择对话框
- 粘贴/选择 Cookie（支持多个账号并发）
- 浏览器模式：自动 / 真实窗口 / Headless
- 类目选择（10 大类 129 关键词）
- 导出字段选择（中文显示，按重要度排序）
- CSV / Excel 导出
- 随机间隔（6-15s）模拟真实用户
- 风控自动修复（重启浏览器 + 冷却退避）
- 实时进度日志、可停止

## 开发

```bash
npm install
npm start          # 运行
npm run build      # 打包便携版 → dist/TikTok达人抓取-便携版.exe
npm run build-installer  # 打包安装版 → dist/TikTok达人抓取-安装版-1.0.0.exe
```

> 打包需要设置环境变量 `CSC_IDENTITY_AUTO_DISCOVERY=false` 跳过代码签名（Windows 无权限创建符号链接的已知问题）。
