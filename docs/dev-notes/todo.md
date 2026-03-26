# BridgeStay (SafeLanding) — Project TODO

> Last cleaned: 2026-03-26

---

## ✅ 已完成功能 (Completed — 25 Tasks)

| 阶段 | 内容 | 状态 |
|------|------|------|
| Phase 1–10 | 主题配置、导航、数据库 Schema、房源列表、搜索、用户认证、申请系统、Stripe 支付、S3 文档存储、动效打磨、测试交付 | ✅ 全部完成 |
| Task 2–6 | Hero 重设计、AI 聊天界面、高级设计优化、暖色 Airbnb 风格、BridgeStay 品牌重塑 | ✅ 全部完成 |
| Task 7–12 | 精选房源、双语支持、Admin 仪表盘、编辑功能、SLC 双语升级、全页面本地化、社会证明本地化 | ✅ 全部完成 |
| Task 13–18 | AI 房源生成器（截图→JSON）、移动端优化、API Key 自动加载、一键发布、精选房源收费化、多图上传+轮播 | ✅ 全部完成 |
| Task 19 | S3 存储、多图上传 UI、审核工作流（pending/approved/rejected） | ✅ 已完成（通知除外） |
| Task 20 | 通知表+API、通知铃铛 UI、搜索筛选器、Stripe 付费推广模态框和计划 | ✅ 已完成（Stripe Checkout + 通知触发除外） |
| Task 21–22 | 转为纯 Admin 模式、简化导航、UI 中文化 | ✅ 全部完成 |
| Task 23–24 | Supabase 集成、图片 URL + 来源链接支持 | ✅ 全部完成 |
| Task 25 | 隐藏 Admin 模式（?admin=true）、删除功能、来源链接按钮 | ✅ 全部完成 |
| Task 26 | UEC 2026 参赛包：市场调研、商业计划书、投资人页面、2分钟视频脚本 | ✅ 全部完成 |

---

## 🚧 待完成 (Pending — 3 Items)

### 1. 审核通知触发（后端）
- [ ] 当房源被 approve/reject 时，自动触发通知写入数据库
  _位置: `server/routers.ts` → apartments.approve / apartments.reject_

### 2. 邮件通知（可选增强）
- [ ] 接入 SendGrid 或 Resend，在通知触发时同步发邮件给房东
  _优先级：低（可选，非 MVP 必须）_

### 3. Stripe Checkout 正式对接
- [ ] 将 PromotionModal 的付款按钮接入真实 Stripe Checkout Session
  _位置: `server/stripe/` + `client/src/components/PromotionModal.tsx`_
  _需要: Stripe 账号激活 + `STRIPE_SECRET_KEY` 环境变量_

---

## 📦 压缩包备份
- `Building SafeLanding Platform with Next.zip` — 项目关键文件快照（58个文件），包含所有核心组件和文档，可作归档用途

---

## 🗂️ 数据管道（Pipeline）
- `bridge_stay_pipeline.py` — V5.0 版，用 Selenium 爬取小红书 + GPT-4o 提取房源信息 + 写入 Supabase
- `pipeline.py` — V1.0 版，纯文本输入版本（stdin → GPT-4o → Supabase）
- `links.txt` — 10 条目标小红书帖子链接
- `ChromeData/` — Chrome 登录态缓存（pipeline 运行时自动创建/使用）
