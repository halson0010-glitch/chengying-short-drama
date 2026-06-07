# 橙影短剧 Vercel 临时部署

本文只说明后台静态站和临时 API 的 Vercel 部署。前台 `apps/web` 已经手动部署成功，本轮不重复配置前台部署。

Vercel API 只作为临时公网测试方案；正式商业生产后端仍建议部署到阿里云 ECS。不要把真实 secret 写入代码、文档、脚本或日志。

## 后台 Admin 静态部署

Project Name:

```text
chengying-short-drama-admin
```

Vercel 手动配置：

```text
Framework Preset: Vite
Root Directory: .
Install Command: npm install
Build Command: npm run build:shared && npm run build:admin
Output Directory: apps/admin/dist
```

Environment Variables:

```env
VITE_API_BASE_URL=https://你的API域名
VITE_PUBLIC_BASE=/
```

如果暂时没有 API，可以先不添加 `VITE_API_BASE_URL`。后台静态页面仍可打开，但登录、数据看板、上传和支付流水都需要 API 才能真实工作。

接近一键部署脚本：

```bash
npm run deploy:vercel:admin
```

脚本会检查 Vercel CLI 和登录状态，执行：

```bash
npm run build:shared
npm run build:admin
vercel deploy --prod
```

脚本不会写死 token、orgId 或 projectId。首次部署时如果 Vercel CLI 要求选择项目，请按上面的后台项目配置选择。

## 临时 API 部署

Project Name:

```text
chengying-short-drama-api
```

Vercel 手动配置：

```text
Root Directory: .
Build Command: npm run build:shared && npm run build:api
```

Environment Variables:

```env
NODE_ENV=production
DATABASE_URL=
JWT_SECRET=
PASSWORD_HASH_ROUNDS=12
CORS_ORIGINS=https://前台域名,https://后台域名
PUBLIC_API_BASE_URL=https://API域名
PUBLIC_WEB_BASE_URL=https://前台域名
PUBLIC_ADMIN_BASE_URL=https://后台域名
```

注意：

- `DATABASE_URL` 必须是云数据库，不能是本地 SQLite。
- Vercel API 只用于临时测试。
- 文件上传不应依赖 Vercel 本地文件系统。
- Stripe / PayPal Webhook 可以临时测试，但生产建议迁移 ECS。

API 入口适配：

- `apps/api/src/app.ts`：创建 Express app、注册中间件和所有路由、`export default app`，不调用 `listen`。
- `apps/api/src/server.ts`：本地 / ECS 入口，只在非 Vercel 环境调用 `app.listen(config.port)`。
- `apps/api/api/index.ts`：Vercel Serverless 入口，导出同一个 Express app。

临时 API 使用 [vercel.api.json](vercel.api.json) 把 `/api/*` 转给 `apps/api/api/index.ts`。为了不影响已经部署成功的前台项目，仓库没有新增根级 `vercel.json`。

接近一键部署脚本：

```bash
npm run deploy:vercel:api
```

脚本会检查 Vercel CLI 和登录状态，提示先配置 API 环境变量，然后执行：

```bash
npm run build:shared
npm run build:api
vercel deploy --prod --local-config vercel.api.json
```

脚本不会写死 token、orgId 或 projectId。首次部署时如果 Vercel CLI 要求选择项目，请选择 `chengying-short-drama-api`。

验收接口：

```bash
GET https://你的API域名/api/health
```

连上云数据库后应返回 JSON。没有云数据库时，函数可能能启动，但健康检查会显示数据库不可用。

## API 检查脚本

```bash
npm run check:vercel-api -- https://你的API域名
npm run check:vercel-api -- --api-base-url=https://你的API域名
API_BASE_URL=https://你的API域名 npm run check:vercel-api
```

检查内容：

- 请求 `GET ${API_BASE_URL}/api/health`。
- 检查本地环境是否存在 `DATABASE_URL`、`JWT_SECRET`、`CORS_ORIGINS`。
- 不打印任何真实 secret。
