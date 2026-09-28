# 康途新语文章站

React 前台与管理后台通过 Node API 访问 Supabase PostgreSQL。管理账号使用 Supabase Auth 邮箱密码登录，文章表不会直接暴露给浏览器。

## 环境要求

- Node.js 22.12+
- pnpm 10+
- 一个 Supabase 项目

## 1. 初始化 Supabase

1. 在 Supabase Dashboard 打开 SQL Editor。
2. 执行 `supabase/migrations/202609280001_create_articles.sql`，创建文章表、RLS、更新时间触发器和原子计数函数。
3. 执行 `supabase/seed.sql`，幂等导入项目原有的 5 篇示例文章。
4. 在 Authentication > Users 中创建至少一个邮箱密码用户。
5. 在 Project Settings > API 中取得 Project URL、anon key 和 service role key。

`service role key` 只能配置在 Node 服务端，不能使用 `VITE_` 前缀，也不能提交到代码仓库。

## 2. 配置环境变量

从 `.env.example` 创建本地 `.env`：

```dotenv
PORT=3001
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAILS=admin@example.com,editor@example.com

VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

`ADMIN_EMAILS` 是允许进入管理后台的 Supabase 用户邮箱白名单，多个邮箱用英文逗号分隔。邮箱比较不区分大小写。

## 3. 本地开发

```bash
pnpm install
pnpm dev
```

- 前端：http://localhost:4000
- Node API：http://localhost:3001
- 管理后台：http://localhost:4000/admin
- 健康检查：http://localhost:3001/api/health

Vite 会将 `/api` 请求代理到 Node 服务。

也可以分别启动：

```bash
pnpm dev:web
pnpm dev:api
```

## 4. 构建和生产运行

```bash
pnpm build
pnpm start
```

构建会生成：

- `dist/`：前端静态资源
- `dist-server/`：Node 服务

生产启动后，Node 在 `PORT` 指定的端口同时提供前端页面与 `/api`，无需单独配置跨域。

## API

公开接口：

```text
GET  /api/health
GET  /api/articles
GET  /api/articles/:id
POST /api/articles/:id/view
POST /api/articles/:id/share
```

管理接口需要 `Authorization: Bearer <Supabase access token>`，并通过 `ADMIN_EMAILS` 白名单校验：

```text
GET    /api/admin/articles
POST   /api/admin/articles
PATCH  /api/admin/articles/:id
DELETE /api/admin/articles/:id
GET    /api/admin/dashboard
```

## 质量检查

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

没有有效 Supabase 配置时，Node 服务会拒绝启动并指出缺失的环境变量；自动化 API 测试使用内存仓储，不需要真实云端凭据。
