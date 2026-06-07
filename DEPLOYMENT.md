# 橙影短剧部署说明

本文档用于把当前 monorepo 部署到生产环境：

- `apps/web`：H5 前台，建议 Vercel 静态部署。
- `apps/admin`：后台管理，建议 Vercel 静态部署，也可以构建后上传 OSS。
- `apps/api`：Express + Prisma API，建议阿里云 ECS 长驻服务。
- 数据库：阿里云 RDS PostgreSQL。
- 文件：阿里云 OSS + CDN。
- 支付：Stripe + PayPal。
- 监控：阿里云日志服务 SLS + 云监控。

不要把任何 Secret 写进前端变量、GitHub、README、日志或构建产物。前台和后台只应该配置 `VITE_API_BASE_URL` 等 `VITE_` 公开变量。

## 1. 构建命令

根目录已有以下命令：

```bash
npm run build:web
npm run build:admin
npm run build:api
npm run db:generate
npm run db:push
npm run check:prod-readiness
```

本地上线前建议执行：

```bash
npm install
npm run build:web
npm run build:admin
npm run build:api
npm run check:prod-readiness
```

## 2. Vercel 部署 apps/web 前台

推荐在 Vercel 新建一个项目，导入同一个 GitHub 仓库。

建议配置：

- Framework Preset：Vite
- Root Directory：仓库根目录 `.`
- Install Command：`npm install`
- Build Command：`npm run build:web`
- Output Directory：`apps/web/dist`

环境变量：

```env
VITE_API_BASE_URL=https://api.example.com
VITE_PUBLIC_BASE=/
VITE_ENABLE_ANALYTICS=true
```

可选：

```env
VITE_ANALYTICS_ENDPOINT=https://api.example.com/api/analytics/collect
VITE_GA4_MEASUREMENT_ID=
VITE_GA4_DEBUG=false
VITE_ENABLE_MOCK_FALLBACK=false
VITE_ENABLE_DEMO_ASSETS=true
VITE_ANALYTICS_ENABLED=true
VITE_GA4_ENABLED=true
```

说明：

- `VITE_API_BASE_URL` 指向 ECS API 的公网 HTTPS 域名。
- 生产环境建议 `VITE_ENABLE_MOCK_FALLBACK=false`，避免 API 失败时混入 mock 数据。
- 前端不要配置 `JWT_SECRET`、`STRIPE_SECRET_KEY`、`PAYPAL_CLIENT_SECRET`、阿里云 AccessKey 等 Secret。

## 3. Vercel 部署 apps/admin 后台

后台也是静态 Vite 应用，可以在 Vercel 新建第二个项目。

建议配置：

- Framework Preset：Vite
- Root Directory：仓库根目录 `.`
- Install Command：`npm install`
- Build Command：`npm run build:shared && npm run build:admin`
- Output Directory：`apps/admin/dist`

环境变量：

```env
VITE_API_BASE_URL=https://api.example.com
VITE_PUBLIC_BASE=/
```

说明：

- 后台登录鉴权由 API 完成，后台静态页面本身不保存 Secret。
- 后台域名必须加入 API 的 `CORS_ORIGINS`。
- 如果导入 Vercel 时看到 Root Directory 被误选为 `apps/api`，请改成仓库根目录，并使用上面的后台构建命令。

## 4. OSS 部署 apps/admin 后台

也可以把后台构建产物上传到 OSS 静态网站：

```bash
npm install
npm run build:shared
npm run build:admin
```

上传目录：

```text
apps/admin/dist/
```

OSS 静态站点设置：

- 默认首页：`index.html`
- 404 页面：`index.html`
- CDN 回源：指向后台 OSS Bucket
- HTTPS：在 CDN 上绑定证书

如后台部署在子路径，需要设置：

```env
VITE_PUBLIC_BASE=/admin/
```

## 5. 阿里云 ECS 部署 apps/api

生产 API 推荐部署在 ECS，不建议用 Vercel Express 模板跑长驻后端，因为本项目需要：

- Prisma 连接 RDS；
- 本地或云端上传适配；
- Webhook 稳定接收；
- 后台鉴权和日志监控；
- 长驻进程和进程守护。

ECS 基础步骤：

1. 购买 ECS，系统建议 Ubuntu LTS。
2. 安装 Node.js 20.19+，推荐 Node.js 22 LTS。
3. 安装 Git、Nginx、PM2。
4. 拉取仓库。
5. 在服务器根目录创建生产 `.env` 或 `apps/api/.env`。
6. 安装依赖并构建：

```bash
npm install
npm run build:shared
npm run build:api
npm run db:generate
npm run db:push
```

启动 API：

```bash
pm2 start apps/api/dist/src/server.js --name chengying-api
pm2 save
```

Nginx 反向代理示例：

```nginx
server {
  listen 80;
  server_name api.example.com;

  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

HTTPS 建议用阿里云证书服务或 Certbot 配置。

## 6. 阿里云 RDS PostgreSQL

创建 RDS PostgreSQL 后：

1. 创建数据库，例如 `chengying_prod`。
2. 创建最小权限账号。
3. 配置白名单，只允许 ECS 内网 IP 或指定安全组访问。
4. 使用内网地址连接 ECS 上的 API。

`DATABASE_URL` 示例格式：

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/chengying_prod?schema=public
```

不要把真实账号密码提交到仓库。

初始化数据库：

```bash
npm run db:generate
npm run db:push
```

SQLite 只适合本地开发，不适合作为生产数据库。

## 7. 阿里云 OSS + CDN

OSS 用于图片、封面、视频等文件存储；CDN 用于公网分发。

建议配置：

- Bucket ACL：私有或公共读按业务决定。
- 正式大视频：建议私有 Bucket + CDN 鉴权 URL 或预签名 URL。
- 小图封面：可走公共读 CDN。
- CDN 域名：例如 `assets.example.com`。
- API 环境变量：

```env
STORAGE_PROVIDER=aliyun-oss
ALIYUN_OSS_REGION=
ALIYUN_OSS_BUCKET=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
ALIYUN_STS_ROLE_ARN=
ALIYUN_OSS_PUBLIC_BASE_URL=https://assets.example.com
```

OSS CORS 建议：

- Allowed Origins：前台域名、后台域名、API 域名。
- Allowed Methods：`GET,HEAD,PUT,POST,OPTIONS`
- Allowed Headers：`*`
- Expose Headers：`ETag,x-oss-request-id`
- Max Age：`600`

正式环境建议使用 STS / RAM 子账号，不要使用主账号 AccessKey。

## 8. Stripe 配置

API 环境变量：

```env
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_SUCCESS_URL=https://www.example.com/payment/success
STRIPE_CANCEL_URL=https://www.example.com/payment/cancel
```

Stripe Dashboard 中配置 Webhook：

```text
https://api.example.com/api/payments/stripe/webhook
```

建议监听：

- `checkout.session.completed`
- `checkout.session.expired`
- `payment_intent.succeeded`
- `payment_intent.payment_failed`
- `charge.refunded`
- `charge.dispute.created`

Secret 只放 API 环境变量，不放前端。

## 9. PayPal 配置

API 环境变量：

```env
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
PAYPAL_WEBHOOK_ID=
PAYPAL_ENV=sandbox
PAYPAL_SUCCESS_URL=https://www.example.com/payment/success
PAYPAL_CANCEL_URL=https://www.example.com/payment/cancel
```

上线时将：

```env
PAYPAL_ENV=live
```

PayPal Webhook 建议指向：

```text
https://api.example.com/api/payments/paypal/webhook
```

如果当前代码尚未实现 PayPal 交易创建和 Webhook 处理，应先保留变量，后续补齐接口后再开放入口。

## 10. 阿里云日志服务 / 云监控

推荐：

- PM2 日志落盘到 `/var/log/chengying-api/`。
- ECS 安装阿里云 Logtail，采集 API stdout/stderr 和 Nginx access/error log。
- SLS 创建 Logstore：
  - `chengying-api-app`
  - `chengying-nginx-access`
  - `chengying-nginx-error`
- 云监控告警：
  - ECS CPU / 内存 / 磁盘；
  - RDS CPU / 连接数 / 慢查询；
  - CDN 4xx / 5xx；
  - API 健康检查 `/api/health`；
  - 支付 Webhook 5xx。

API 健康检查：

```text
https://api.example.com/api/health
```

## 11. 生产环境变量清单

API 至少配置：

```env
NODE_ENV=production
PORT=4000
DATABASE_URL=
JWT_SECRET=
ADMIN_PASSWORD=
CORS_ORIGINS=https://www.example.com,https://admin.example.com
PUBLIC_API_BASE_URL=https://api.example.com
PUBLIC_WEB_BASE_URL=https://www.example.com
PUBLIC_ADMIN_BASE_URL=https://admin.example.com
STORAGE_PROVIDER=aliyun-oss
ALIYUN_OSS_REGION=
ALIYUN_OSS_BUCKET=
ALIYUN_ACCESS_KEY_ID=
ALIYUN_ACCESS_KEY_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
PAYPAL_CLIENT_ID=
PAYPAL_CLIENT_SECRET=
```

前台 / 后台只配置：

```env
VITE_API_BASE_URL=https://api.example.com
VITE_PUBLIC_BASE=/
```

## 12. 上线验收清单

前台：

- 首页、分类、搜索、详情、播放页可访问。
- `VITE_API_BASE_URL` 指向生产 API。
- 生产环境没有混入 mock 数据。
- 支付入口能创建 Stripe checkout。
- 埋点能回传到 `/api/analytics/collect`。

后台：

- 后台登录成功。
- 剧目新增、编辑、发布、下架正常。
- 上传封面 / 视频返回 OSS 或 CDN URL。
- Dashboard、CSV 导出正常。

API：

- `/api/health` 返回 `ok: true`。
- RDS 连接正常。
- CORS 只允许前台和后台域名。
- `JWT_SECRET` 和 `ADMIN_PASSWORD` 不是默认值。
- Stripe Webhook 验签成功。
- PayPal 配置已准备，正式开放前确认接口实现状态。

阿里云：

- RDS 白名单只允许 ECS。
- OSS CORS 配置正确。
- CDN HTTPS 正常。
- SLS 和云监控能看到 API 日志和告警。

最后执行：

```bash
npm run check:prod-readiness
```
