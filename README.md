# 橙影短剧

橙影短剧是一个短剧 H5 前台 + 后台管理 + Express API + Prisma/SQLite 的 monorepo 演示项目。当前已经支持 mock 内容预览、真实剧目接入、后台上传、支付链路骨架、埋点回收、Dashboard、CSV 导出、OpenAI demo 素材生成和 GitHub Pages 前台发布。

> Node.js 要求：Node.js 20.19+，推荐 Node.js 22 LTS。当前 Vite 版本要求 Node.js `^20.19.0` 或 `>=22.12.0`。

## 项目结构

```text
apps/
  web/      H5 前台，React + Vite + Tailwind
  admin/    后台管理，React + Vite + Tailwind
  api/      Express + Prisma + SQLite API
packages/
  shared/   共享类型
scripts/    本地启动、检查、素材生成脚本
```

## 本地启动

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

默认地址：

- H5 前台：http://localhost:5173/
- 后台管理：http://localhost:5174/
- API：http://localhost:4000/
- API 健康检查：http://localhost:4000/api/health
- 默认后台账号：`admin / admin123`

分开启动：

```bash
npm run dev:api
npm run dev:web
npm run dev:admin
```

构建检查：

```bash
npm run build:shared
npm run build:api
npm run build:admin
npm run build:web
```

## 环境变量

根目录 `.env.example` 只放前台/后台 Vite 变量：

```env
VITE_API_BASE_URL=
VITE_ANALYTICS_ENDPOINT=
VITE_GA4_MEASUREMENT_ID=
VITE_GA4_DEBUG=false
VITE_ENABLE_MOCK_FALLBACK=true
VITE_ANALYTICS_ENABLED=true
VITE_GA4_ENABLED=true
```

`apps/api/.env.example` 只放 API 变量：

```env
DATABASE_URL="file:./dev.db"
PORT=4000
PUBLIC_BASE_URL=http://localhost:4000
JWT_SECRET=change-me-in-production
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin123
CORS_ORIGINS=http://localhost:5173,http://localhost:5174
STORAGE_PROVIDER=local
S3_ENDPOINT=
S3_BUCKET=
S3_ACCESS_KEY=
S3_SECRET_KEY=
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
ALIYUN_OSS_REGION=
ALIYUN_OSS_BUCKET=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
```

生产环境必须配置强 `JWT_SECRET`、非默认 `ADMIN_PASSWORD` 和 `CORS_ORIGINS`。如果 `NODE_ENV=production` 且这些配置不安全，API 会拒绝启动。

## Mock 与真实 API

H5 前台通过 `apps/web/src/services/dramaApi.ts` 读取数据：

- `VITE_API_BASE_URL` 为空：使用 `apps/web/src/data/mockDramas.ts`。
- `VITE_API_BASE_URL` 不为空且 `VITE_ENABLE_MOCK_FALLBACK=true`：API 失败时允许回退 mock，首页可混入 mock。
- `VITE_API_BASE_URL` 不为空且 `VITE_ENABLE_MOCK_FALLBACK=false`：严格只展示 API 返回数据，生产建议这样配置。

前台期望 API：

```text
GET /api/dramas
GET /api/dramas/:id
GET /api/search?q=关键词
```

## 接入真实剧集

后台可以创建剧目、上传封面、上传视频、管理剧集并发布/下架。数据库模型已经支持：

- `posterUrl`：竖版封面
- `coverUrl`：Hero / 横版宣传图
- `episodes[].videoUrl`：MP4 视频地址
- `episodes[].hlsUrl`：HLS 地址
- `status`：`draft | published | offline`

本地测试可以把视频放到 `apps/web/public/videos`，然后在剧集里填：

```ts
episodes: [
  {
    episode: 1,
    title: '第一集',
    videoUrl: '/videos/demo-01.mp4',
    duration: 180,
    isFree: true,
  },
]
```

没有 `videoUrl` / `hlsUrl` 时，播放页会自动回退到 `PlayerMock`。有 `videoUrl` 时使用 HTML5 `<video>`，有 `hlsUrl` 时 Safari 原生播放，其他浏览器通过 `hls.js` 播放。

正式环境建议：视频和封面走对象存储 + CDN。大视频不应经过 Express API 服务器，应使用预签名 URL、STS 临时凭证、multipart upload 或专业点播服务。

## 支付闭环

当前支付 provider 为 Stripe 骨架。

前台入口：

- `/account`
- 点击“开通会员 ¥9.90”
- 创建 checkout 时触发 `payment_checkout_start`
- 创建成功触发 `payment_checkout_created`
- 跳转 Stripe 前触发 `payment_checkout_redirect`
- `/account?payment=success` 只表示浏览器回跳，不等于最终支付成功
- 最终状态以后端 webhook 更新的 `PaymentRecord` 为准

后端接口：

```text
POST /api/payments/stripe/checkout
POST /api/payments/stripe/webhook
GET /api/payments/me
```

Stripe webhook 使用 raw body 签名校验，并支持幂等处理。当前处理事件：

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

支付成功后会创建 30 天会员权益：

```text
UserEntitlement:
  userId
  type=membership
  status=active
  startsAt
  endsAt
  sourcePaymentId
```

支付表字段包括：

```text
PaymentRecord:
  paidAt
  failedAt
  canceledAt
  paymentMethod
  providerCustomerEmail
  providerCustomerId
  providerPaymentStatus
  failureCode
  failureMessage
  checkoutUrl
  rawWebhookEventId
  rawWebhookType
```

Webhook 原始事件会写入：

```text
PaymentEvent:
  paymentRecordId
  provider
  eventType
  eventId
  status
  payloadJson
```

后台新增“支付流水”页面：

- 路径：`/payments`
- API：
  - `GET /api/admin/payments`
  - `GET /api/admin/payments/:id`
  - `GET /api/admin/payments/:id/events`

## 阿里云 OSS 骨架

当前支持 `STORAGE_PROVIDER=local|aliyun-oss`。

本地上传仍保存到：

```text
apps/api/uploads
```

OSS 状态与 STS 占位接口：

```text
GET /api/cloud/aliyun/status
GET /api/cloud/aliyun/oss/sts
POST /api/cloud/aliyun/oss/presign-placeholder
```

`/api/cloud/aliyun/oss/sts` 当前不会暴露长期 AccessKey。如果 `STORAGE_PROVIDER` 不是 `aliyun-oss` 或配置不完整，会返回清晰的 `501 not configured`。真正上线前需要在 API 侧接入阿里云 STS AssumeRole，并配置：

- OSS Bucket CORS
- OSS + CDN 域名
- 上传路径隔离
- 大文件 multipart upload
- HLS 转码或点播服务

## 埋点、GA4 与 Dashboard

自有埋点文件：

```text
apps/web/src/lib/analytics.ts
apps/web/src/hooks/usePageTracking.ts
apps/web/src/hooks/useScrollDepthTracking.ts
```

配置 `VITE_ANALYTICS_ENDPOINT=http://localhost:4000/api/analytics/collect` 后，前台事件会回传 API。未配置时，开发环境会 console 输出并暂存 localStorage。

GA4 配置：

```env
VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX
VITE_GA4_DEBUG=true
```

`VITE_GA4_ENABLED=false` 可关闭 GA4。GA4 不发送 `anonymousId`、`sessionId`、手机号、邮箱、身份证等敏感或高基数字段。若要在 GA4 报表中查看自定义参数，需要在 GA4 管理后台注册自定义维度/指标。

Dashboard 路径：

```text
后台 /dashboard
```

Dashboard 依赖事件：

- `page_view`
- `drama_card_click`
- `play_button_click`
- `play_start`
- `play_progress`
- `play_complete`
- `search_submit`
- `search_no_result`
- `filter_change`
- `download_popover_open`

Dashboard API：

```text
GET /api/admin/dashboard/overview
GET /api/admin/dashboard/trends
GET /api/admin/dashboard/funnel
GET /api/admin/dashboard/top-dramas
GET /api/admin/dashboard/search-keywords
GET /api/admin/dashboard/filter-preferences
GET /api/admin/dashboard/recent-events
GET /api/admin/dashboard/export.csv
```

所有后台 Dashboard API 都需要登录 token。数据量大后建议把聚合迁移到数据库 groupBy、ClickHouse、BigQuery 或数据仓库。

## CSV 数据导出

后台 Dashboard 和 Analytics 页面可以导出 CSV。

支持类型：

- `raw_events`
- `overview`
- `trends`
- `funnel`
- `top_dramas`
- `search_keywords`
- `filter_preferences`

示例：

```text
GET /api/admin/dashboard/export.csv?type=raw_events&range=7d
GET /api/admin/dashboard/export.csv?type=search_keywords&range=30d
```

CSV 使用 UTF-8 BOM，Excel 打开中文不乱码。字段会做 CSV 转义和 CSV 注入防护。`anonymousId` / `sessionId` 默认只导出短 hash，不导出原始值。手机号、邮箱会脱敏。`raw_events` 默认最多导出 10000 条，大数据量建议后续改成异步导出任务。

## OpenAI Demo 素材

测试 OpenAI 图片 API：

```powershell
$env:OPENAI_API_KEY="你的 key"
$env:OPENAI_IMAGE_MODEL="gpt-image-2"
npm run test:openai-image
```

批量生成：

```powershell
$env:OPENAI_API_KEY="你的 key"
$env:OPENAI_IMAGE_MODEL="gpt-image-2"
npm run generate:demo-assets -- --all --force --quality=low
```

无 Key 时只生成本地 fallback：

```bash
npm run generate:demo-assets -- --fallback-only --all --force
```

导入本地 5 部推荐剧图片：

```powershell
npm run import:featured-assets -- --src "C:\Users\杨俊熙\Documents\红果短剧网页端复刻\pics"
```

首页素材优先级：

- Hero：`generated-assets.json.hero` > `/demo-assets/hero/{id}.png` > `coverUrl` > `heroBackgroundImage` > SVG fallback > gradient
- Poster：`generated-assets.json.poster` > `/demo-assets/posters/{id}.png` > `posterUrl` > `posterImage` > SVG fallback > gradient

## 首页视觉

桌面端首页已升级为近全屏沉浸式 Hero：

- 开屏展示 5 部推荐短剧
- 背景图铺满首屏
- 文案位于左下阅读区
- 5 张竖版推荐卡位于右下
- 支持自动切换和手动切换
- 开场使用轻量 blur/scale/fade
- 下滑内容区使用分区渐进呈现
- 移动端保持单列、横向滑动推荐和可触控按钮

## 上线前检查

运行：

```bash
npm run check:prod-readiness
```

脚本只打印 configured / missing / unsafe，不输出密钥。它会检查：

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGINS`
- `VITE_API_BASE_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `ALIYUN_OSS_BUCKET`
- `STORAGE_PROVIDER`
- `ADMIN_PASSWORD`
- demo auth fallback 状态

上线前建议：

- 关闭生产 mock fallback：`VITE_ENABLE_MOCK_FALLBACK=false`
- 配置强 `JWT_SECRET`
- 修改默认后台密码
- 配置生产 `CORS_ORIGINS`
- SQLite 仅用于本地开发，生产建议 PostgreSQL/MySQL
- 上传视频走对象存储 + CDN
- 不提交 `.env`、Stripe Secret、OpenAI Key、阿里云 AccessKey
- Prisma build 首次可能下载 engine，CI 建议缓存 Prisma engines 或配置镜像

## GitHub Pages 前台部署

本项目 GitHub Pages 只部署 `apps/web` 前台，不部署 admin/api。

常用命令：

```bash
npm run build:shared
npm run build:web
npm run prepare:pages
```

如果仓库名不是默认值，请设置：

```powershell
$env:VITE_PUBLIC_BASE="/你的仓库名/"
npm run build:web
```

GitHub Pages 需要在仓库 Settings → Pages 中选择 GitHub Actions。
