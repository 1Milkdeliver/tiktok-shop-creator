# TikTok Shop 达人抓取工具（桌面版）

**专为 TikTok Shop 卖家（Owner）打造**：抓取联盟达人广场数据，筛选适合合作的达人，导出本地表格。

## 📥 下载

**⬇️ [TikTok-Creator-Scraper-Setup.exe](https://github.com/1Milkdeliver/tiktok-shop-creator/releases/latest)**

- Windows 安装包，双击运行安装向导，阅读并同意许可协议后一键安装
- 安装完成后自动创建桌面快捷方式
- 输出文件默认保存在安装目录的 `output/` 文件夹，日志在 `logs/` 文件夹

> 若浏览器提示"已阻止不安全的下载"或 SmartScreen 警告，点击"保留/仍要保留"即可（开源未签名程序的正常提示）。

## 适合谁用

- **TikTok Shop 卖家**：查看联盟达人数据、筛选合作对象
- **运营/商务**：批量整理达人信息（简介、联系方式、MCN 机构）
- **选品团队**：按类目整理达人数据做分析

## 可抓取的信息

### 达人基础信息
| 字段 | 说明 |
|---|---|
| 达人主页 (handle) | TikTok 主页用户名 |
| 昵称 (nickname) | 达人昵称 |
| 达人ID (creator_oecuid) | 平台内部唯一 ID |
| 头像 (avatar) | 头像图片链接 |
| 地区 (selection_region) | 达人所在地区 |
| 粉丝数 (follower_cnt) | 粉丝数量 |

### 带货数据
| 字段 | 说明 |
|---|---|
| 总GMV / GMV区间 | 达人累计带货销售额 |
| 视频GMV / 直播GMV | 视频/直播带货销售额 |
| 销量 / 销量区间 | 带货商品销量 |
| 类目 (category) | 达人擅长类目 |

### 内容表现
| 字段 | 说明 |
|---|---|
| 平均视频观看 / 视频中位观看 | 视频播放量 |
| 视频互动量 / 电商视频互动 | 互动数据 |
| 电商GPM / 直播GPM | 千次曝光成交额 |
| 电商平均UV | 直播观看用户数 |

### 粉丝画像
| 字段 | 说明 |
|---|---|
| 粉丝年龄段 | 粉丝年龄分布 |
| 粉丝性别分布 | 粉丝性别比例 |
| PPS评分 | 达人综合评分 |

### 详情字段（可选开启）
| 字段 | 说明 |
|---|---|
| 简介 (bio) | 达人主页简介 |
| 合作邮箱 | 从简介中提取的联系邮箱 |
| MCN机构 | 达人所属机构 |

## 安装说明

- 从上方下载链接获取安装程序
- 双击运行 → 阅读并同意许可协议 → 选择安装目录 → 完成安装
- 安装后自动在桌面和开始菜单创建快捷方式

## 功能

- **原生桌面窗口**（非网页版），原生文件夹选择对话框
- 粘贴/选择 Cookie（支持多个账号并发）
- 浏览器模式：自动 / 真实窗口 / Headless
- 类目选择（10 大类 129 关键词，支持中/英文切换）
- 导出字段选择（中文显示，按重要度排序）
- CSV / Excel 导出
- 请求间隔自动随机化
- 自动处理平台限流（冷却后重试）
- 实时进度日志、可停止
- 单实例运行（防止多开）

## 使用说明（详细教程）

### 第一步：导出 Cookie

1. 在 Chrome 浏览器中打开 TikTok Shop 联盟后台（`affiliate.tiktokshopglobalselling.com`），确认已登录并进入**达人广场**
2. 安装 Cookie 导出扩展：[**Cookie-Editor**](https://chromewebstore.google.com/detail/cookie-editor/hlkenndednhfkekhgcdicdfddnkalmdm)（Chrome 应用商店官方扩展）
   > 或使用其他同类扩展：EditThisCookie、Cookie-Editor 等均可
3. 在达人广场页面上，点击浏览器右上角的 **Cookie-Editor 图标**
4. 点击扩展面板中的 **Export（导出）** 按钮，Cookie 会以 JSON 格式复制到剪贴板
5. 把复制的内容**粘贴到工具里**，或点"浏览文件"选择一个 `.json` 文件（也可直接拖拽文件到输入区）

> 💡 **只导出达人广场域的 Cookie**：Cookie-Editor 默认导出当前站点（`affiliate.tiktokshopglobalselling.com`）的 Cookie，直接使用即可。如果是手动复制的 JSON，请确认包含 `sessionid`、`sid_guard`、`user_oec_info` 等关键字段。

### 第二步：配置抓取

1. **浏览器模式**（推荐"自动"）：
   - 自动：优先连接常驻调试 Chrome，没有则自动开屏幕外真实窗口
   - 真实窗口：直接打开一个浏览器窗口进行抓取
   - Headless：后台无窗口模式（兼容性有限，不建议）
2. **选择类目**：勾选需要抓取的达人类目（可全选/清空，支持中/英文切换）
3. **导出设置**：
   - 格式：CSV（Excel 可直接打开）或 Excel (.xlsx)
   - 输出位置：点"📁 选择"用系统对话框选目录
   - 导出字段：勾选需要的字段（不勾选则全部导出）
   - 详情：需要简介/邮箱/MCN 时勾选（速度慢 2-3 倍）

### 第三步：开始抓取

1. 点击 **▶ 开始抓取**
2. 下方日志区实时显示抓取进度（每页新增人数、总数）
3. 如需停止点击 **■ 停止**
4. 完成后自动保存到所选目录，文件名为 `达人数据-日期-时间.csv/xlsx`

### 常见问题

**Q：提示"页面未正常加载"？**
A：Cookie 可能失效（TikTok 登录态约 3 天有效），重新导出 Cookie 即可。

**Q：抓取速度慢？**
A：为保证稳定性，请求间隔会随机化（约 6-15 秒）。需要简介/邮箱时会更慢（每个达人单独请求）。

**Q：多账号怎么用？**
A：在 Cookie 输入区点"＋ 添加账号"，粘贴多个账号的 Cookie，工具会自动并发抓取（错峰启动避免冲突）。

**Q：中途断了怎么办？**
A：再次启动工具并开始抓取，会自动从上次位置继续（断点续抓）。

## 使用提示

- 本工具用于**卖家自身账号**查看联盟达人数据
- 请求频率已做合理控制
- Cookie 仅保存在本机，不会上传或共享
- 数据仅供个人商业分析使用

## 开发

```bash
npm install
npm start          # 运行
npm run build      # 打包安装程序 → dist/TikTok达人抓取安装程序-<版本>.exe
```

> 打包需要设置环境变量 `CSC_IDENTITY_AUTO_DISCOVERY=false` 跳过代码签名（Windows 无权限创建符号链接的已知问题）。

## 发布新版（版本更新流程）

应用内置**启动时自动检查更新**功能，发现 GitHub 有新版本会提示用户下载。发布新版只需 4 步：

```bash
# 1. 更新版本号（package.json 中 version 字段）
#    例如 1.1.0 → 1.2.0，用户启动旧版时会看到更新提示

# 2. 打包安装程序
$env:CSC_IDENTITY_AUTO_DISCOVERY='false'
npm run build

# 3. 发布到 GitHub Release（文件名用英文避免编码问题）
Copy-Item "dist\TikTok达人抓取安装程序-1.2.0.exe" "dist\TikTok-Creator-Scraper-Setup.exe"
gh release create v1.2.0 "dist\TikTok-Creator-Scraper-Setup.exe" --repo 1Milkdeliver/tiktok-shop-creator --title "TikTok达人抓取 v1.2.0" --notes "版本更新说明"

# 4. 旧版用户启动时自动提示更新 → 下载新安装包 → 选择同一安装目录即可覆盖更新（Cookie、历史记录、输出文件均保留）
```

> 版本比较规则：三位版本号（主.次.修订），任一更高即提示更新。保持 Release 只留最新版本，README 下载链接（`/releases/latest`）自动指向最新。

## 许可证

本项目采用 **GPL-3.0**（GNU General Public License v3.0）。

- 允许自由使用、修改、分发本软件
- 基于本软件的衍生作品必须同样以 GPL-3.0 开源
- 完整协议见 [LICENSE](LICENSE) 文件
