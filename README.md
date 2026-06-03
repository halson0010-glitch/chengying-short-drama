# 橙影短剧

一个桌面端优先、适配移动端的沉浸式短剧播放网站项目。当前已经升级为 monorepo：包含 H5 前台、后台管理、Node.js API、Prisma + SQLite 数据库与共享类型包。品牌、剧情、角色、海报表现均为原创演示内容。

## 启动项目

环境要求：Node.js 20.19+，推荐 Node.js 22 LTS。当前 Vite 版本要求 Node.js `^20.19.0` 或 `>=22.12.0`，低版本 Node 可能无法安装或构建。

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

开发服务器启动后：

- H5 前台：`http://localhost:5173/`
- 后台管理：`http://localhost:5174/`
- API 服务：`http://localhost:4000/`
- 默认后台账号：`admin / admin123`

也可以分别启动：

```bash
npm run dev:api
npm run dev:web
npm run dev:admin
```

生产构建检查：

```bash
npm run build
```

也可以分包构建：

```bash
npm run build:shared
npm run build:web
npm run build:admin
npm run build:api
```

`build:api` 会执行 `prisma generate`，首次运行可能需要下载 Prisma engine。CI 环境建议缓存 Prisma engines，或按网络环境配置 npm/Prisma 镜像，避免构建时因网络抖动失败。

## 环境变量

根目录 [.env.example](./.env.example) 只放前台和后台 Vite 变量，例如：

- `VITE_API_BASE_URL`：H5/API 请求地址。留空时使用前端 mock 数据。
- `VITE_ANALYTICS_ENDPOINT`：自有埋点回收地址，例如 `http://localhost:4000/api/analytics/collect`。
- `VITE_ENABLE_MOCK_FALLBACK`：设为 `false` 后，配置 API 地址时严格只显示 API 数据，生产环境建议关闭。
- `VITE_ANALYTICS_ENABLED`：设为 `false` 后关闭自有埋点队列和上报。
- `VITE_GA4_ENABLED`：设为 `false` 后不初始化 GA4，也不调用 `gtag`。

API 独立使用 [apps/api/.env.example](./apps/api/.env.example)。生产环境必须配置强 `JWT_SECRET`、非默认 `ADMIN_PASSWORD`，并填写 `CORS_ORIGINS`，例如：

```env
JWT_SECRET=replace-with-a-long-random-secret
ADMIN_PASSWORD=replace-with-a-strong-password
CORS_ORIGINS=https://your-h5-domain.com,https://your-admin-domain.com
```

如果 `NODE_ENV=production` 且仍使用默认密钥、默认密码或未配置 CORS 白名单，API 会拒绝启动。

## 双击打开与分享浏览

项目根目录提供了 [打开橙影短剧.cmd](./打开橙影短剧.cmd)。在 Windows 中双击该文件，会启动本地预览服务并自动用默认浏览器打开网站；浏览期间请保持弹出的终端窗口开启，关闭窗口即可停止服务。

如果需要同时体验后台、API 和健康检查，根目录还提供了这些一键入口：

- [启动API服务.cmd](./启动API服务.cmd)：启动 API 服务并打开 `http://localhost:4000/health`。
- [检查API健康.cmd](./检查API健康.cmd)：启动或复用 API 服务，并显示健康检查结果。
- [打开后台管理.cmd](./打开后台管理.cmd)：启动 API 与后台管理，打开 `http://localhost:5174/`。
- [一键启动橙影全套.cmd](./一键启动橙影全套.cmd)：启动 H5、后台管理与 API，并打开前台、后台和健康检查地址。
- 英文别名：`open-web.cmd`、`open-admin.cmd`、`start-api.cmd`、`check-api-health.cmd`、`start-all.cmd`，便于跨平台 zip 分发时减少中文文件名编码问题。

这些入口会在需要时自动安装依赖、初始化 SQLite 数据库，并打开独立服务终端窗口。使用期间请保持服务终端开启；需要停止服务时，关闭对应终端窗口或在窗口中按 `Ctrl+C`。

将网站文件夹发给他人本地浏览时，请保留 `apps/web/dist/` 目录和 `scripts/serve-local-preview.ps1` 文件。访客已有完整前台构建产物时无需安装 Node.js 或执行 npm 命令，只需双击 `打开橙影短剧.cmd`。

当源代码更新后，分享前应重新生成最新预览内容：

```bash
npm install
npm run build
```

该入口仅供对方在自己的电脑上浏览；如果希望通过一个网址让多人直接访问，需要将生产构建发布到 Web 托管服务。

## 已实现页面

- `/`：精选 Hero、热门网格、新剧及题材横向推荐流。
- `/category`：短剧/漫画频道切换、多维 chips 组合筛选、最新/最热排序。
- `/search?q=关键词`：全站搜索、搜索建议、热门搜索与最近搜索。
- `/detail/:id`：渐变封面详情、收藏状态、演员信息、剧集网格及相关推荐。
- `/watch/:id/:episode`：竖屏模拟播放器、可操作进度条、选集和上下集切换。
- 未匹配路由：原创样式 404 页面。

## 接入真实剧集

当前 H5 mock 数据仍位于 [mockDramas.ts](./apps/web/src/data/mockDramas.ts)。真实数据由 [dramaApi.ts](./apps/web/src/services/dramaApi.ts) 通过 `VITE_API_BASE_URL` 读取 API；后台数据模型已支持 `posterUrl`、`coverUrl`、`episodes`、`status` 与 `sourceType`。未填写这些字段时，会继续使用渐变海报和模拟播放器。

有合法使用权的封面和视频可按如下方式加入某条数据：

```ts
posterUrl: '/posters/ember-vow.jpg',
episodes: [
  {
    episode: 1,
    title: '初见',
    videoUrl: '/videos/ember-vow-01.mp4',
    duration: 156,
    isFree: true,
  },
],
```

- 前端本地测试可将封面放入 `apps/web/public/posters/`，填写 `posterUrl` 后优先显示图片；加载失败会回退到原有 CSS 渐变。
- 前端本地测试可将 MP4 放入 `apps/web/public/videos/`，并填写对应集的 `videoUrl`，播放页会切换为 HTML5 视频播放器。
- 后台上传的封面和视频会保存到 `apps/api/uploads`，并返回 `http://localhost:4000/uploads/...` 形式的可访问 URL。
- 可以填写 `hlsUrl` 预留 HLS 地址；Safari 等原生支持 HLS 的浏览器会直接播放，其他现代浏览器会通过 `hls.js` 加载。
- 未提供 `episodes` 或某一集尚未上传视频时，系统会自动生成虚拟集数并回退到 `PlayerMock` 演示效果。

本地 `public/videos` 与 API 的 local uploads 适合开发验证，不适合正式分发大体积视频。正式环境建议将授权视频上传至对象存储或专业视频点播服务，通过 CDN 分发，配合转码、鉴权、防盗链和带宽治理。大视频不应经过 Express API 服务器中转，建议使用预签名 URL、分片上传或 multipart upload。

## 替换封面图片

当前所有 mock 海报都由 [MockPoster.tsx](./apps/web/src/components/drama/MockPoster.tsx) 根据 `gradient` 字段绘制，没有加载任何外链图片或第三方图片素材。

接入拥有使用权的封面时，可填写 `posterUrl` 为本地 `public/posters/` 路径或自有 CDN 地址；`MockPoster` 已会优先渲染图片，并保留渐变作为加载失败回退。

## 新增短剧数据

在 [mockDramas.ts](./apps/web/src/data/mockDramas.ts) 的 `mockDramas` 数组增加对象即可。每条内容应包含：

- 唯一 `id`、原创标题与简介。
- `totalEpisodes`、`heat`、`updatedWithinDays`。
- 用于筛选的 `background`、`theme`、`setting` 与 `audience`。
- 用于显示的 `tags`、原创演员表与 CSS `gradient`。

首页推荐需要额外将目标 `id` 放入同文件中的 `heroDramaIds`。

## 搜索功能

- 顶栏桌面端直接提供搜索输入框，移动端点击搜索图标展开输入层；支持回车、搜索按钮和建议点击跳转。
- 搜索范围包括标题、副标题、简介、标签、分类、背景、主题、设定、受众、演员名与角色名。
- 搜索建议最多展示 6 条，输入后约 `250ms` 防抖更新。
- 最近搜索保存在 localStorage 的 `chengying_recent_searches` 中，最多保存 8 条，可在空搜索页清空。
- 热门搜索词定义在 `apps/web/src/lib/search.ts` 的 `hotSearches` 常量中，调整数组即可改变推荐词。

## 基础埋点

- 核心实现位于 `apps/web/src/lib/analytics.ts`，页面和滚动监听分别位于 `apps/web/src/hooks/usePageTracking.ts` 与 `apps/web/src/hooks/useScrollDepthTracking.ts`。
- 复制 `.env.example` 的配置并填写 `VITE_ANALYTICS_ENDPOINT` 后，可将队列通过 `sendBeacon` 或 `fetch keepalive` 上报到自有接口。
- 留空 `VITE_ANALYTICS_ENDPOINT` 时不会发送网络请求；开发环境可在浏览器控制台查看 `[chengying analytics]` 日志，事件同时暂存在 localStorage 的 `chengying_analytics_queue`。
- 当前支持页面访问、滚动深度、卡片点击、Hero 切换、播放按钮、播放/暂停/进度/完成、选集、筛选、搜索流程、收藏及下载弹层打开事件。
- 搜索词会在上报前合并空格、限制长度并脱敏邮箱和手机号；本演示不采集真实身份或联系方式。
- 如需关闭或替换埋点，可设置 `VITE_ANALYTICS_ENABLED=false`，或在 `apps/web/src/lib/analytics.ts` 中修改 `track`/`flushAnalyticsQueue`。

## 后端 API 接入

- `VITE_API_BASE_URL` 留空时，`apps/web/src/services/dramaApi.ts` 从本地 mock 数据提供内容；填写 `http://localhost:4000` 后，页面与搜索建议会请求本地 API。
- `VITE_ENABLE_MOCK_FALLBACK=false` 时，前台不会在 API 失败或 API 数据较少时混入 mock，生产环境建议这样配置。
- 前端期望 `GET /api/dramas` 返回短剧数组，`GET /api/dramas/:id` 返回单条短剧，`GET /api/search?q=关键词` 返回匹配数组；也兼容 `{ data: ... }` 包装格式。
- mock 模式适合 UI 开发和离线演示；remote 模式适合接入内容后台、数据库、发布状态与真实媒体 URL。
- 后端输出的单条短剧字段应符合 `apps/web/src/types/drama.ts` 或 `packages/shared/src/index.ts` 的 `Drama` 类型，媒体集数通过 `episodes` 数组提供。

## 后台管理与 API

API 位于 [apps/api](./apps/api)，后台位于 [apps/admin](./apps/admin)。本地数据库使用 SQLite，Prisma schema 位于 [schema.prisma](./apps/api/prisma/schema.prisma)。

SQLite 只适合本地开发、演示和小规模单机验证。正式环境建议迁移到 PostgreSQL 或 MySQL，并为上传、播放、埋点写入分别设计更清晰的数据和存储策略。

数据库初始化：

```bash
npm run db:push
npm run db:seed
```

默认登录账号：

```text
admin / admin123
```

公开接口：

- `GET /api/dramas`
- `GET /api/dramas/:id`
- `GET /api/search?q=关键词`

后台接口：

- `POST /api/admin/login`
- `GET /api/admin/dramas`
- `POST /api/admin/dramas`
- `PUT /api/admin/dramas/:id`
- `DELETE /api/admin/dramas/:id`
- `POST /api/admin/dramas/:id/publish`
- `POST /api/admin/dramas/:id/offline`

剧集、上传与埋点接口：

- `GET /api/admin/dramas/:id/episodes`
- `POST /api/admin/dramas/:id/episodes`
- `PUT /api/admin/episodes/:episodeId`
- `DELETE /api/admin/episodes/:episodeId`
- `POST /api/admin/upload/poster`
- `POST /api/admin/upload/video`
- `POST /api/analytics/collect`
- `GET /api/admin/analytics/overview`
- `GET /api/admin/analytics/events`
- `GET /api/admin/analytics/search-keywords`
- `GET /api/admin/analytics/drama-clicks`
- `GET /api/admin/analytics/play-funnel`

后台仪表盘接口：

- `GET /api/admin/dashboard/overview?range=7d`
- `GET /api/admin/dashboard/trends?range=7d`
- `GET /api/admin/dashboard/funnel?range=7d`
- `GET /api/admin/dashboard/top-dramas?range=7d`
- `GET /api/admin/dashboard/search-keywords?range=7d`
- `GET /api/admin/dashboard/filter-preferences?range=7d`
- `GET /api/admin/dashboard/recent-events?range=7d&limit=50&offset=0`

上传文件默认保存到 `apps/api/uploads`。当前 local storage 只适合本地演示；正式环境应使用对象存储 + CDN，不建议把大视频直接传到 Express 服务器。对象存储配置已预留：`STORAGE_PROVIDER`、`S3_ENDPOINT`、`S3_BUCKET`、`S3_ACCESS_KEY`、`S3_SECRET_KEY`。

## GA4 接入

1. 将 `.env.example` 复制为 `.env.local`，配置 `VITE_GA4_MEASUREMENT_ID=G-XXXXXXXXXX`。
2. 开发验证时设置 `VITE_GA4_DEBUG=true`，或直接使用开发服务；事件会带 `debug_mode: true`，可在 GA4 的 DebugView 中检查。
3. 重新运行 `npm run dev` 或重新构建，配置的测量 ID 才会生效。

GA4 由 [ga4.ts](./apps/web/src/lib/ga4.ts) 初始化，现有 `track()` 事件会同时发送 `page_view`、`search_submit`、`drama_card_click`、`play_start`、`play_pause`、`play_progress`、`play_complete`、`episode_click`、`filter_change` 等事件。为保护隐私并控制基数，发送 GA4 前会过滤身份、会话和剧目 ID 等字段，搜索词也沿用脱敏处理。GA4 只发送低基数字段，例如 `module`、`position`、`source`、`episode`、`category`、`theme`、`background`、`audience`、`result_count`、`search_term`、`progress`。

GA4 与自有埋点是两套能力：GA4 用于通用产品分析和广告生态，自有埋点会进入自己的 API、数据库或日志系统，适合做内容热度、播放漏斗和后台运营报表。两者可以同时开启，也可以分别通过 `VITE_GA4_ENABLED`、`VITE_ANALYTICS_ENABLED` 关闭。

事件参数若要出现在 GA4 标准报表或探索中，需要在 GA4 管理界面将相应参数注册为自定义维度或指标。不要将 `anonymousId` 或 `sessionId` 注册为 GA4 自定义维度：它们会造成高基数，也不适合用于前端分析维度。

## 自有埋点回收

- `VITE_ANALYTICS_ENDPOINT` 用于设置自有埋点接收地址，例如 `http://localhost:4000/api/analytics/collect`；它与 GA4 可同时开启，互不替代。
- 未配置接收地址时，事件会写入 localStorage 键 `chengying_analytics_queue`，开发模式也会在浏览器控制台打印 `[chengying analytics]` 日志。
- 后端应实现 `POST /api/analytics/collect`，接收 `{ events: AnalyticsEvent[] }` JSON 请求。
- 收到事件后，后端可以写入数据库、日志管道或数据仓库，再用于留存、转化和内容热度分析。
- 当前 collect 接口包含基础校验、100 条批量上限、payload 深度和大小限制、timestamp 校准，以及内存级 IP rate limit。生产环境可替换为 Redis/网关限流。

## 后台仪表盘

登录后台后默认进入 `/dashboard`，也可以从左侧导航点击“仪表盘”。Dashboard 使用后台深色风格，支持“今日 / 昨日 / 最近 7 天 / 最近 30 天”范围切换；自定义日期范围目前保留入口，后续可接 `startDate` 和 `endDate`。

Dashboard 依赖 H5 前台和播放器埋点，核心事件包括：

- `page_view`：页面浏览量 PV；UV 基于 `anonymousId` 去重。
- `drama_card_click`、`play_button_click`、`play_start`、`play_progress`、`play_complete`：用于热门短剧排行和播放漏斗。
- `search_submit`、`search_no_result`：用于搜索次数、无结果搜索和搜索词排行。
- `filter_change`：用于分类筛选偏好。
- `download_popover_open`：用于下载 App 弹层打开次数。

核心指标卡会展示当前范围值和上一周期对比；上一周期没有数据时显示 `--`。趋势图展示 `page_view`、`play_start`、`search_submit` 的按日变化；播放漏斗展示访问、短剧点击、播放点击、播放开始、播放 50%、完播的转化；排行表展示 Top 10 短剧与搜索词；分类偏好展示 Top 20 筛选项；最近事件展示最近 50 条事件的安全 payload 摘要。

本地没有真实用户时，仪表盘可能为空。可以通过以下操作产生测试数据：

1. 打开 H5 前台访问首页、分类页、搜索页。
2. 搜索关键词，例如“样片”“甜宠”。
3. 点击短剧卡片进入详情页。
4. 点击“播放正片”，在播放页点击播放、暂停并等待进度。
5. 打开下载 App 弹层或切换分类筛选。

最近事件模块不会展示完整 `anonymousId`、`sessionId`、JWT、密码、数据库连接等敏感内容；payload 中的手机号、邮箱、身份证等也会脱敏。当前 Dashboard 聚合在 Node.js 中读取时间范围内事件后计算，适合本地演示和初期运营验证。数据量变大后，应改为数据库 `groupBy`、ClickHouse、BigQuery 或专门的数据仓库/OLAP 服务。

## CSV 数据导出

后台 Dashboard 顶部提供“导出 CSV”按钮，可按当前时间范围导出数据。Analytics 页面顶部也提供“导出原始事件 CSV”入口，默认导出最近 7 天原始事件。

支持的导出类型：

- `raw_events`：原始埋点事件，默认最多导出 10000 条，支持 `limit` 与 `offset`。
- `overview`：核心指标，包括 PV、UV、播放点击、播放开始、完播、搜索、无结果搜索、下载弹层打开。
- `trends`：按日趋势，包含 `page_view`、`play_start`、`search_submit`。
- `funnel`：播放漏斗，包含访问、短剧点击、播放点击、播放开始、播放 50%、完播。
- `top_dramas`：热门短剧排行。
- `search_keywords`：搜索词排行。
- `filter_preferences`：分类筛选偏好。

导出接口为 `GET /api/admin/dashboard/export.csv`，必须带后台登录 token。时间参数支持 `range=today|yesterday|7d|30d`，也支持 `startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`；如果两者同时传入，自定义日期范围优先生效。

CSV 字段说明：

- `raw_events`：`createdAt,event,path,device,viewportWidth,viewportHeight,anonymousIdHash,sessionIdHash,dramaId,dramaTitle,episode,keyword,resultCount,source,module,position,filterKey,filterValue,progress,payloadJson`
- `overview`：`metric,value,previous,changePercent,range,startDate,endDate`
- `trends`：`date,page_view,play_start,search_submit`
- `funnel`：`stepKey,stepLabel,value,stepRate,totalRate`
- `top_dramas`：`rank,dramaId,dramaTitle,cardClicks,playButtonClicks,playStarts,playCompletes,completionRate`
- `search_keywords`：`rank,keyword,count,avgResultCount,noResultCount,noResultRate`
- `filter_preferences`：`rank,filterKey,filterValue,count`

导出的 CSV 使用 UTF-8 BOM，Excel 直接打开中文不易乱码。所有字段都会做 CSV 转义，双引号会转为两个双引号；包含逗号、换行或双引号的字段会自动包裹。为避免 CSV 注入，字段如果以 `=`、`+`、`-`、`@` 开头，会自动在前面加单引号。

出于隐私和安全考虑，CSV 不导出完整 `anonymousId`、`sessionId`，只导出 8 位短 hash；也不会导出 JWT、密码、token、数据库连接等敏感内容。`payloadJson` 会安全解析并脱敏手机号、邮箱、身份证等信息；如果历史脏数据 JSON 解析失败，会导出空对象，不会导致接口 500。

CSV 可以用 Excel、Google Sheets 直接打开；也可以用 Python / Pandas 分析：

```python
import pandas as pd

df = pd.read_csv("chengying-raw_events-7d.csv", encoding="utf-8-sig")
print(df.head())
```

当前导出适合本地和初期运营分析。数据量变大后，建议改为异步导出任务，或将 AnalyticsEvent 同步到 ClickHouse / BigQuery / 数据仓库，由后端生成离线文件再下载。

## 上线前检查清单

- 使用 Node.js 20.19+ 或 Node.js 22 LTS。
- 根目录 `.env.local` 与 `apps/api/.env` 分开配置，不要把生产密钥提交到仓库。
- 生产环境设置 `VITE_ENABLE_MOCK_FALLBACK=false`。
- 生产环境设置强 `JWT_SECRET`，并修改默认后台密码。
- 正确配置 `CORS_ORIGINS`，只允许 H5 和后台域名。
- 执行 `npm run build:shared && npm run build:web && npm run build:admin && npm run build:api`。
- 执行 `npm run db:push`，确认数据库 schema 已同步。
- 将 SQLite 替换为生产数据库，或至少做好备份和单机限制说明。
- 视频上传改为对象存储/CDN/预签名 URL，不让大文件经过 Express。
- 确认 GA4 与自有埋点开关符合上线策略。

## 目录结构

```text
apps/
  web/              H5 前台，React + Vite + Tailwind
  admin/            后台管理系统，React + Vite + Tailwind
  api/              Express + Prisma + SQLite API 服务
    prisma/         数据库 schema 与 seed
    uploads/        本地上传目录
packages/
  shared/           前后台共享类型
```

## 素材说明

项目不包含真实短剧平台的名称、Logo、剧名、文案、截图或海报，也不使用外部图片 URL。下载弹层中的图案为 CSS 方块组成的模拟二维码，仅作界面演示使用。
## 首页视觉升级与 Demo 资产

首页重点做的是可运行、可验收、视觉效果接近真实短剧平台的实现：

- 开屏 Hero 固定展示 5 部精选短剧，顺序来自 `mockDramas.ts` 中的 `featured` / `featuredOrder` 字段。
- Hero 会自动轮播，也支持点击右侧/下方 5 张竖版卡片手动切换。
- 切换时背景铺满宽屏区域，文案区保留深色遮罩保证可读性。
- 下滑内容区使用 `IntersectionObserver` 做分区渐进呈现，卡片按顺序轻微上浮淡入。
- 手机端 Hero 改为单列布局，5 部推荐横向滑动，导航和搜索入口不会互相挤压。
- 首页保留热门短剧，并补充“最新上架 / 女频热播 / 男频热播 / 甜宠热榜 / 逆袭爽剧 / 古风精选 / 悬疑脑洞 / 猜你喜欢”等横向分区，方便一次性展示 20+ 张封面。

Demo 素材输出目录：

```text
apps/web/public/demo-assets/hero/{dramaId}.png
apps/web/public/demo-assets/posters/{dramaId}.png
apps/web/public/demo-assets/generated-assets.json
```

这些素材都用于本地演示，不依赖外链图片，也不包含真实平台、真实剧集、真实演员或第三方版权素材。若希望临时关闭这些 demo 资产，可在 `.env` 中设置：

```env
VITE_ENABLE_DEMO_ASSETS=false
```

批量生成素材：

```bash
npm run generate:demo-assets -- --all --force
```

常用参数：

- `--force`：即使已有图片也重新生成。
- `--posters=30`：控制 poster 目标数量，默认 30。
- `--featured=5`：控制 Hero 背景数量，默认 5。
- `--all`：覆盖全部 mock 剧目；如果 mock 少于 30，会额外生成备用 poster，保证素材库达到 30 张。
- `--fallback-only`：不调用 OpenAI，只生成本地 PNG fallback 素材。

没有配置 `OPENAI_API_KEY` 时，脚本不会空跑或退出，会自动生成本地 PNG fallback：

```bash
npm run generate:demo-assets -- --fallback-only --all --force
```

配置 `OPENAI_API_KEY` 后，推荐执行：

```bash
# PowerShell
$env:OPENAI_API_KEY="你的 Key"
npm run generate:demo-assets -- --all --force
```

单张 OpenAI 生图失败不会中断整批任务，脚本会记录失败项，并给该剧目生成 fallback PNG。生成完成后会写入 `generated-assets.json`，其中包含生成时间、poster 数量、hero 数量、是否 fallback-only、失败列表和每个剧目的素材路径。

上线前仍建议把真实可商用封面上传到后台或对象存储/CDN，并通过 `posterUrl` / `coverUrl` / `posterImage` / `heroBackgroundImage` 字段接入。

## 首页视觉管理与 AI 生图

本次已打通 `web / admin / api / prisma / shared` 的首页视觉配置链路：

- 数据库 `Drama` 新增 `coverUrl`、`featured`、`featuredOrder`、`visualTone`、`aiPosterPrompt`、`aiHeroPrompt`。
- 后台“新增/编辑剧目”页面可以配置封面 URL、首页 Hero 背景 URL、首页推荐开关、推荐顺序和 AI 提示词。
- 后台“上传文件”页面支持上传竖版封面、首页 Hero 背景和视频。
- 后台新增“视觉素材 / AI 生图”页面，可选择剧目并生成封面、Hero 背景或两者同时生成。
- API 新增 `POST /api/admin/ai/generate-drama-visuals`，只在服务端读取 `OPENAI_API_KEY`，不会把 Key 暴露给前端。
- 生成成功后图片会保存到 `apps/api/uploads/posters` 或 `apps/api/uploads/hero`，并自动回写 `posterUrl` / `coverUrl`。

API 环境变量位于 `apps/api/.env.example`：

```env
OPENAI_API_KEY=
OPENAI_IMAGE_MODEL=gpt-image-2
```

如果 `OPENAI_API_KEY` 留空，后台 AI 生图页面会显示明确错误提示，并提示使用本地批量命令生成 fallback PNG。后台“Demo 素材状态”页面可以查看当前 hero/poster 数量、生成时间、fallback-only 状态、素材路径和缺失项。

首页 Hero 素材优先级：

- 背景图：`generated-assets.json` 中的 hero > `/demo-assets/hero/{id}.png` > `coverUrl` > `heroBackgroundImage` SVG > `gradient`
- 缩略封面：`generated-assets.json` 中的 poster > `/demo-assets/posters/{id}.png` > `posterUrl` > `posterImage` SVG > `gradient`

`npm run generate:demo-assets` 会为首页演示生成或准备素材映射：

- 有 `OPENAI_API_KEY`：批量生成真实 demo 图，默认至少 5 张 Hero 背景和 30 张 poster。
- 无 `OPENAI_API_KEY`：自动生成本地 PNG fallback，默认至少 5 张 Hero 背景和 30 张 poster。

## OpenAI 生图失败排查

如果批量生图时看到 “OpenAI failed ... Fallback will be used”，请先运行独立测试命令确认图片 API 是否可用：

```powershell
$env:OPENAI_API_KEY="你的 key"
$env:OPENAI_IMAGE_MODEL="gpt-image-2"
npm run test:openai-image
```

测试成功时会输出：

- `OpenAI image generation OK`
- 实际使用的模型
- 输出路径：`apps/web/public/demo-assets/test-openai-image.png`

批量生成推荐命令：

```powershell
$env:OPENAI_API_KEY="你的 key"
$env:OPENAI_IMAGE_MODEL="gpt-image-2"
npm run generate:demo-assets -- --all --force --quality=low
```

支持的质量参数：

- `--quality=low`：默认，成本更低，适合批量演示素材。
- `--quality=medium`：质量和成本折中。
- `--quality=high`：更高质量，但成本更高，不建议默认批量使用。

脚本会优先使用 `OPENAI_IMAGE_MODEL`，未设置时默认 `gpt-image-2`。如果 `gpt-image-2` 返回 `403`、`404`，或 `400` 且错误码/错误信息显示 `model_not_found`、`model_not_supported` 等模型不可用问题，会自动尝试 `gpt-image-1`。如果两个模型都失败，则继续生成本地 fallback，不会中断整批任务。`generated-assets.json` 会记录每张图的来源，例如 `openai:gpt-image-2`、`openai:gpt-image-1` 或 `local-fallback`。

失败诊断会打印：

- HTTP status / statusText
- OpenAI error message / type / code / param
- 当前 model、dramaId、poster/hero、size、quality
- 是否检测到 `OPENAI_API_KEY`
- mask 后的 key，例如 `sk-proj-****abcd`
- 非敏感请求参数摘要

常见错误含义：

- `401`：API Key 可能无效、已删除、复制错误，或没有在当前终端正确设置环境变量。
- `403`：可能是项目/组织权限、模型权限不足，或组织验证未完成。
- `429`：可能是额度不足、限速、usage tier 不足，或当前项目没有足够配额。
- `400`：可能是 `model`、`size`、`quality`、`prompt` 参数不兼容。请查看日志里的 request 摘要和 OpenAI error code。
- 网络错误：日志会打印 `error.name` / `error.message`，通常需要检查代理、防火墙、DNS 或 OpenAI API 访问。

没有 API Key 或暂时不想调用 OpenAI 时，仍可一键生成本地演示素材：

```bash
npm run generate:demo-assets -- --fallback-only --all --force
```

## 部署到 GitHub Pages

本轮只部署前台 H5：`apps/web`。后台 `apps/admin` 和 API `apps/api` 不会部署到 GitHub Pages。

默认仓库名假设为：

```text
chengying-short-drama
```

默认访问地址：

```text
https://halson0010-glitch.github.io/chengying-short-drama/
```

### Vite Base

[apps/web/vite.config.ts](./apps/web/vite.config.ts) 已配置 GitHub Pages 子路径：

```ts
base: command === 'serve' ? '/' : process.env.VITE_PUBLIC_BASE || '/chengying-short-drama/'
```

本地 `npm run dev:web` 不受影响，仍使用 `/`。生产构建默认使用 `/chengying-short-drama/`。如果仓库名不同，需要设置环境变量或修改默认值：

```powershell
$env:VITE_PUBLIC_BASE="/你的仓库名/"
npm run build:web
```

前台 public 资源通过 `toPublicPath()` 转换，例如 `/demo-assets/posters/xxx.png` 在 GitHub Pages 下会变成 `/chengying-short-drama/demo-assets/posters/xxx.png`，避免 JS/CSS 正常但图片 404。

### 本地构建测试

```bash
npm run generate:demo-assets -- --fallback-only --all --force
npm run build:shared
npm run build:web
npm run prepare:pages
```

`npm run prepare:pages` 会：

- 检查 `apps/web/dist/index.html`
- 复制为 `apps/web/dist/404.html`，用于 React Router SPA 刷新 fallback
- 创建 `apps/web/dist/.nojekyll`
- 输出 dist 目录文件列表

构建后请确认：

- `apps/web/dist/index.html`
- `apps/web/dist/404.html`
- `apps/web/dist/.nojekyll`
- `apps/web/dist/assets`
- `apps/web/dist/demo-assets`

### GitHub Actions 自动部署

已新增 workflow：

```text
.github/workflows/deploy-web.yml
```

触发方式：

- push 到 `main`
- 在 GitHub Actions 页面手动 `workflow_dispatch`

workflow 会在仓库根目录执行：

```bash
npm ci
npm run generate:demo-assets -- --fallback-only --all --force
npm run build:shared
npm run build:web
npm run prepare:pages
```

随后上传 `apps/web/dist` 到 GitHub Pages。CI 不会使用 OpenAI API Key，也不会构建 admin/api，避免 Prisma 或服务端依赖影响 Pages 部署。

### 推送到 GitHub

首次推送：

```bash
git init
git add .
git commit -m "deploy web to github pages"
git branch -M main
git remote add origin https://github.com/halson0010-glitch/chengying-short-drama.git
git push -u origin main
```

如果 remote 已存在：

```bash
git remote set-url origin https://github.com/halson0010-glitch/chengying-short-drama.git
git push -u origin main
```

GitHub 仓库设置：

1. 打开仓库 `Settings`
2. 进入 `Pages`
3. `Build and deployment`
4. `Source` 选择 `GitHub Actions`
5. 等待 Actions 完成后访问：

```text
https://halson0010-glitch.github.io/chengying-short-drama/
```

### Demo 素材发布

`apps/web/public/demo-assets/` 会被 Vite 自动复制到 `apps/web/dist/demo-assets/`。GitHub Actions 构建前会运行 fallback-only 生成，确保 Pages 发布版本包含 5 张 Hero 和 30 张 Poster 演示素材。

如果要使用 OpenAI 生成真实 demo 图，请只在本地运行：

```powershell
$env:OPENAI_API_KEY="你的 key"
npm run generate:demo-assets -- --all --force --quality=low
```

生成后再决定是否提交图片。不要提交 API Key，不要提交 `.env` 或 `.env.local`，也不要把任何 `sk-` 开头的 key 写进 README、workflow、代码或日志。

### 白屏排查

如果 GitHub Pages 打开白屏，优先检查：

- `apps/web/vite.config.ts` 的 base 是否等于 `/<仓库名>/`
- Actions 中 `VITE_PUBLIC_BASE` 是否和仓库名一致
- `apps/web/dist/index.html` 里的 JS/CSS 路径是否以 `/<仓库名>/assets/` 开头
- `apps/web/dist/demo-assets` 是否存在
- `apps/web/dist/404.html` 是否存在
- GitHub Pages Source 是否选择 `GitHub Actions`
- Actions 是否成功完成部署

Prisma schema 已增加字段，本地需要执行：

```bash
npm run db:push
```

正式环境建议使用 Prisma migration，而不是直接 `db push`。
# 本轮新增：上线前业务接入骨架

## 首页 Hero 与 Demo 素材

- 首页开屏固定取 5 部 featured 短剧，优先读取 `apps/web/public/demo-assets/generated-assets.json` 中的 `hero` / `poster`。
- manifest 会记录每张图来源：`openai:gpt-image-2`、`openai:gpt-image-1` 或 `local-fallback`。
- 如果你要把五部开屏素材换成真实 AI 图，在本地配置 OpenAI Key 后运行：

```powershell
$env:OPENAI_API_KEY="你的 key"
$env:OPENAI_IMAGE_MODEL="gpt-image-2"
npm run generate:demo-assets -- --featured=5 --force --quality=low
```

- 没有 OpenAI Key 时仍可用 fallback 图：

```bash
npm run generate:demo-assets -- --fallback-only --all --force
```

## 用户邮箱注册 / 登录

后端新增：

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

前端新增：

- `/login`
- `/register`
- `/account`

本地 API 模式下，注册数据会写入 Prisma `User` 表。纯前端预览且未配置 `VITE_API_BASE_URL` 时，会进入 localStorage 演示模式，仅用于静态页面验收。

## Stripe 支付骨架

后端新增：

- `POST /api/payments/stripe/checkout`
- `POST /api/payments/stripe/webhook`
- `GET /api/payments/me`

需要在 `apps/api/.env` 配置：

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
```

未配置 `STRIPE_SECRET_KEY` 时，接口会返回 “Stripe is not configured”，不会影响项目启动。配置后会尝试创建 Stripe Checkout Session，并把记录写入 `PaymentRecord` 表。

## 阿里云服务骨架

本轮只预留阿里云服务适配，不把阿里云和支付宝混为一体：

- 阿里云 OSS：对象存储服务骨架。
- 阿里云 SMS：短信服务配置状态预留。
- 支付宝：未来作为单独 payment provider 接入。

后端新增：

- `GET /api/cloud/aliyun/status`
- `POST /api/cloud/aliyun/oss/presign-placeholder`

需要在 `apps/api/.env` 配置：

```env
ALIYUN_OSS_REGION=
ALIYUN_OSS_BUCKET=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_SMS_SIGN_NAME=
ALIYUN_SMS_TEMPLATE_CODE=
```

当前占位接口不会返回密钥。正式上传大视频仍建议使用对象存储 + CDN + 预签名 URL，不建议让 Express API 直接承载大视频流量。

## 本地数据库更新

本轮新增 `User` 和 `PaymentRecord` 表。更新后请执行：

```bash
npm run db:push
```
