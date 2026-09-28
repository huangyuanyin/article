# Supabase Node 服务实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 为现有文章站增加使用 Supabase PostgreSQL 和 Supabase Auth 的 Node API，并将前台与管理后台从 `localStorage` 切换到真实接口。

**架构：** Express 应用通过可注入的文章仓储和管理员认证函数提供公开、统计及管理接口；生产仓储使用 Supabase service role，浏览器仅用 Supabase 匿名密钥登录。Vite 开发服务器代理 `/api`，生产 Node 同源托管 API 与前端构建产物。

**技术栈：** Node.js 22、TypeScript、Express 5、Zod、Supabase JS、React 19、Vite 8、Vitest、Supertest

**执行约束：** 当前目录不是 Git 仓库，且项目指令禁止 `git commit`；各任务以针对性测试和全量质量门禁作为检查点，不执行提交操作。

---

## 文件结构

- `shared/article.ts`：前后端共用的文章 DTO、输入和仪表盘类型。
- `server/config.ts`：读取并验证服务端环境变量。
- `server/http-error.ts`：统一携带 HTTP 状态、错误码和字段错误的服务端异常。
- `server/article-schema.ts`：Zod 请求校验及字段规范化。
- `server/article-repository.ts`：仓储接口、Supabase 行映射和生产实现。
- `server/auth.ts`：Bearer Token 校验与管理员邮箱授权。
- `server/app.ts`：Express 应用、公开路由、管理路由和统一错误响应。
- `server/index.ts`：装配生产依赖、监听端口及托管 `dist`。
- `server/test/fakes.ts`、`server/app.public.test.ts`、`server/app.admin.test.ts`：内存仓储、认证替身和 API 合约测试。
- `supabase/migrations/202609280001_create_articles.sql`：表、约束、RLS、触发器和原子计数函数。
- `supabase/seed.sql`：现有 5 篇文章的幂等种子数据。
- `src/lib/api.ts`、`src/lib/articlesApi.ts`：浏览器请求封装、错误类型和文章 API。
- `src/lib/supabase.ts`：仅负责 Supabase Auth 客户端。
- `src/components/AdminRoute.tsx`、`src/pages/AdminLogin/index.tsx`：后台登录保护与登录页。
- `src/pages/Home/index.tsx`、`src/pages/ArticleDetail/index.tsx`、`src/pages/Admin/index.tsx`：替换同步本地存储调用并增加异步状态。
- `.env.example`、`README.md`：环境变量、Supabase 初始化和运行说明。

### 任务 1：建立前后端共享类型、服务端构建与测试工具链

**文件：**
- 创建：`shared/article.ts`
- 创建：`tsconfig.server.json`
- 修改：`tsconfig.json`
- 修改：`tsconfig.app.json`
- 修改：`eslint.config.js`
- 修改：`package.json`
- 修改：`vite.config.ts`

- [x] **步骤 1：安装运行和测试依赖**

运行：

```bash
pnpm add express zod dotenv
pnpm add -D @types/express concurrently supertest @types/supertest tsx vitest
```

预期：`package.json` 和 `pnpm-lock.yaml` 更新，安装过程无错误。

- [x] **步骤 2：定义共用 DTO**

创建 `shared/article.ts`，导出：

```ts
export type ArticleStatus = 'published' | 'draft';

export interface ArticleSummary {
  id: string;
  title: string;
  summary: string;
  coverImage: string | null;
  publishDate: string;
  views: number;
  shares: number;
  status: ArticleStatus;
  category: string | null;
  author: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Article extends ArticleSummary {
  content: string;
}

export interface ArticleInput {
  title: string;
  summary: string;
  content: string;
  coverImage: string | null;
  publishDate: string;
  views: number;
  shares: number;
  status: ArticleStatus;
  category: string | null;
  author: string | null;
}

export interface DashboardStats {
  totalArticles: number;
  publishedArticles: number;
  draftArticles: number;
  totalViews: number;
  totalShares: number;
  publishRate: number;
  recentlyUpdated: ArticleSummary[];
}
```

- [x] **步骤 3：配置服务端编译和非重写式质量命令**

创建 `tsconfig.server.json`，使用 `module`/`moduleResolution: NodeNext`、`rootDir: .`、`outDir: dist-server`、`strict: true`，包含 `server/**/*.ts` 与 `shared/**/*.ts`，并从生产编译中排除 `server/**/*.test.ts` 和 `server/test/**`。将 `shared` 加入 `tsconfig.app.json` 的 `include`。

更新脚本为：

```json
{
  "dev": "concurrently -k -n web,api \"pnpm dev:web\" \"pnpm dev:api\"",
  "dev:web": "vite",
  "dev:api": "tsx watch server/index.ts",
  "build": "pnpm build:web && pnpm build:server",
  "build:web": "tsc --noEmit -p tsconfig.app.json && vite build",
  "build:server": "tsc -p tsconfig.server.json",
  "start": "node dist-server/server/index.js",
  "test": "vitest run",
  "lint": "eslint . --ext ts,tsx --quiet && postcss src/index.css -o /dev/null",
  "typecheck": "tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.server.json"
}
```

为 ESLint 增加 `server/**/*.ts` 的 `globals.node` 配置；将 `shared` 与服务端文件排除出 React Refresh 规则。Vite `server.proxy['/api']` 指向 `http://localhost:3001`。

- [x] **步骤 4：运行基础质量门禁**

运行：

```bash
pnpm run typecheck
pnpm run lint
```

预期：两条命令均以退出码 0 完成；尚未创建服务端入口也不会产生缺失文件错误。

### 任务 2：建立 API 客户端的错误契约

**文件：**
- 创建：`src/lib/api.ts`
- 创建：`src/lib/articlesApi.ts`
- 创建：`src/lib/api.test.ts`
- 修改：`src/lib/supabase.ts`

- [x] **步骤 1：先编写失败的 API 客户端测试**

测试覆盖以下行为：

```ts
it('unwraps the data envelope', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ data: [{ id: 'art-001' }] }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )));
  await expect(apiRequest('/api/articles')).resolves.toEqual([{ id: 'art-001' }]);
});

it('throws ApiError from the error envelope', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(
    JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: '标题不能为空' } }),
    { status: 400, headers: { 'Content-Type': 'application/json' } },
  )));
  await expect(apiRequest('/api/admin/articles')).rejects.toMatchObject({
    status: 400,
    code: 'VALIDATION_ERROR',
    message: '标题不能为空',
  });
});
```

- [x] **步骤 2：运行测试并确认失败**

运行：`pnpm vitest run src/lib/api.test.ts`

预期：FAIL，原因是 `apiRequest` 和 `ApiError` 尚未定义。

- [x] **步骤 3：实现请求封装和文章 API**

`apiRequest<T>` 接收路径、`RequestInit` 和可选 access token；自动写入 JSON 请求头、解析 `{ data }`，并将非 2xx `{ error }` 转成含 `status`、`code`、`fieldErrors` 的 `ApiError`。204 响应返回 `undefined`。

`articlesApi.ts` 精确导出：

```ts
export const listPublishedArticles = () => apiRequest<ArticleSummary[]>('/api/articles');
export const getPublishedArticle = (id: string) => apiRequest<Article>(`/api/articles/${encodeURIComponent(id)}`);
export const recordArticleView = (id: string) => apiRequest<Pick<Article, 'views' | 'shares'>>(`/api/articles/${encodeURIComponent(id)}/view`, { method: 'POST' });
export const recordArticleShare = (id: string) => apiRequest<Pick<Article, 'views' | 'shares'>>(`/api/articles/${encodeURIComponent(id)}/share`, { method: 'POST' });
export const listAdminArticles = (token: string) => apiRequest<Article[]>('/api/admin/articles', {}, token);
export const createArticle = (input: ArticleInput, token: string) => apiRequest<Article>('/api/admin/articles', { method: 'POST', body: JSON.stringify(input) }, token);
export const updateArticle = (id: string, input: Partial<ArticleInput>, token: string) => apiRequest<Article>(`/api/admin/articles/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) }, token);
export const deleteArticle = (id: string, token: string) => apiRequest<void>(`/api/admin/articles/${encodeURIComponent(id)}`, { method: 'DELETE' }, token);
export const getDashboard = (token: string) => apiRequest<DashboardStats>('/api/admin/dashboard', {}, token);
```

保留 `src/lib/supabase.ts`，但将空配置时报错改为仅在调用登录功能时给出明确错误，数据库读写不从该文件发起。

- [x] **步骤 4：运行客户端测试**

运行：`pnpm vitest run src/lib/api.test.ts`

预期：全部 PASS。

### 任务 3：创建 Supabase 数据库迁移和种子数据

**文件：**
- 创建：`supabase/migrations/202609280001_create_articles.sql`
- 创建：`supabase/seed.sql`

- [x] **步骤 1：编写文章表和安全边界**

迁移必须创建 `public.articles`，包含规格中的全部字段与约束；开启 RLS 且不创建 anon/authenticated 策略。新增 `set_updated_at()` 触发器函数，并在每次更新时写入 `updated_at`。

核心约束：

```sql
status text not null check (status in ('published', 'draft')),
views bigint not null default 0 check (views >= 0),
shares bigint not null default 0 check (shares >= 0)
```

- [x] **步骤 2：编写原子计数函数**

创建 `increment_article_views(p_article_id text)` 和 `increment_article_shares(p_article_id text)`，使用单条 `UPDATE ... SET views = views + 1 ... RETURNING views, shares`，且仅更新 `status = 'published'` 的文章。函数使用 `SECURITY DEFINER SET search_path = public`，撤销 `PUBLIC`、`anon`、`authenticated` 的执行权限，只授权 `service_role`。

- [x] **步骤 3：写入幂等种子数据**

将 `src/lib/articlesStore.ts` 中 5 篇文章逐字段转换为 SQL，日期转换为带 `+08:00` 时区的时间戳，使用：

```sql
insert into public.articles (...) values (...)
on conflict (id) do nothing;
```

- [x] **步骤 4：静态检查 SQL**

运行：

```bash
rg -n "enable row level security|revoke execute|grant execute|on conflict|increment_article_views|increment_article_shares" supabase
```

预期：每个安全与幂等关键词均出现在对应 SQL 中；在获得真实 Supabase 项目后，再通过 SQL Editor 或 Supabase CLI 执行迁移和种子。

### 任务 4：实现服务端仓储、认证和公开 API

**文件：**
- 创建：`server/config.ts`
- 创建：`server/http-error.ts`
- 创建：`server/article-schema.ts`
- 创建：`server/article-repository.ts`
- 创建：`server/auth.ts`
- 创建：`server/app.ts`
- 创建：`server/test/fakes.ts`
- 创建：`server/app.public.test.ts`

- [x] **步骤 1：编写公开 API 失败测试**

使用 `createApp({ articleRepository, authenticateAdmin })` 注入内存仓储。覆盖：

```ts
it('returns summaries for published articles only');
it('returns a published article body by id');
it('returns 404 for a draft through the public route');
it('increments views and shares through repository methods');
it('returns 400 for an article id outside the allowed format');
```

断言列表不含 `content`，所有响应遵循 `{ data }` 或 `{ error }`。

- [x] **步骤 2：运行公开 API 测试并确认失败**

运行：`pnpm vitest run server/app.public.test.ts`

预期：FAIL，原因是应用、仓储接口和替身尚未实现。

- [x] **步骤 3：定义仓储接口和 Supabase 映射**

接口必须包含：

```ts
export interface ArticleRepository {
  healthcheck(): Promise<void>;
  listPublished(): Promise<ArticleSummary[]>;
  findPublishedById(id: string): Promise<Article | null>;
  listAll(): Promise<Article[]>;
  create(input: ArticleInput): Promise<Article>;
  update(id: string, input: Partial<ArticleInput>): Promise<Article | null>;
  delete(id: string): Promise<boolean>;
  incrementViews(id: string): Promise<Pick<Article, 'views' | 'shares'> | null>;
  incrementShares(id: string): Promise<Pick<Article, 'views' | 'shares'> | null>;
  getDashboard(): Promise<DashboardStats>;
}
```

`SupabaseArticleRepository` 将 snake_case 数据行统一映射为共享 camelCase DTO；Supabase 返回错误时抛出内部错误，不把 service role、SQL 或完整响应暴露给客户端。

- [x] **步骤 4：实现认证和请求校验**

`HttpError` 统一保存 `status`、`code`、`message` 和可选 `fieldErrors`。`createAdminAuthenticator` 的签名为 `(request: Request) => Promise<void>`：从 Bearer 头取 token，调用 `supabase.auth.getUser(token)`，无有效用户抛出 401；将规范化为小写的用户邮箱与 `ADMIN_EMAILS` 集合比较，非白名单抛出 403。`article-schema.ts` 用 Zod 限制 ID 为 1-128 位字母、数字、下划线或连字符，标题 1-200 字，封面仅接受 `http`/`https` URL，并验证 ISO 日期、非负整数与状态枚举。

- [x] **步骤 5：实现 Express 应用和公开路由**

应用启用 `express.json({ limit: '1mb' })`，注册健康检查、公开列表、详情、浏览和分享路由。统一错误处理只记录服务端错误摘要，对外返回：

```json
{ "error": { "code": "INTERNAL_ERROR", "message": "服务暂时不可用，请稍后重试" } }
```

- [x] **步骤 6：运行公开 API 测试和类型检查**

运行：

```bash
pnpm vitest run server/app.public.test.ts
pnpm run typecheck
```

预期：全部 PASS，TypeScript 无错误。

### 任务 5：实现管理 API 和仪表盘

**文件：**
- 创建：`server/app.admin.test.ts`
- 修改：`server/app.ts`
- 修改：`server/article-repository.ts`
- 修改：`server/test/fakes.ts`

- [x] **步骤 1：编写管理 API 失败测试**

覆盖：

```ts
it('returns 401 without a bearer token');
it('returns 403 for an authenticated non-admin');
it('lists drafts for an administrator');
it('creates an article with server-owned id and timestamps');
it('returns field errors for an invalid article payload');
it('updates only supplied editable fields');
it('returns 404 when updating or deleting an unknown id');
it('deletes an article with a 204 response');
it('returns aggregated dashboard statistics and recent articles');
```

- [x] **步骤 2：运行管理 API 测试并确认失败**

运行：`pnpm vitest run server/app.admin.test.ts`

预期：FAIL，原因是管理路由尚未注册。

- [x] **步骤 3：实现受保护管理路由**

对 `/api/admin` 路由组先运行管理员认证，再注册列表、创建、局部更新、删除和仪表盘接口。禁止客户端修改 `id`、`createdAt`、`updatedAt`；创建时若未传计数则使用 0，删除成功返回空 body 和 204。

- [x] **步骤 4：实现统计聚合**

仓储从全部文章计算：

```ts
const publishRate = totalArticles === 0
  ? 0
  : Math.round((publishedArticles / totalArticles) * 1000) / 10;
```

`recentlyUpdated` 按 `updatedAt` 倒序取 4 篇，返回摘要而非正文。

- [x] **步骤 5：运行全部服务端测试**

运行：`pnpm vitest run server`

预期：公开和管理 API 测试全部 PASS。

### 任务 6：接入首页和文章详情公开接口

**文件：**
- 修改：`src/pages/Home/index.tsx`
- 修改：`src/pages/ArticleDetail/index.tsx`
- 删除：`src/lib/articlesStore.ts`

- [x] **步骤 1：将首页改为异步公开列表**

挂载时调用 `listPublishedArticles()`，维护 `loading | success | error` 状态。加载时保持稳定高度并显示“文章加载中”；错误时显示重试按钮；空列表显示“暂无已发布文章”。精选与列表继续复用现有布局，不再在浏览器二次过滤草稿。

- [x] **步骤 2：将详情页改为异步详情和计数**

ID 变化时先请求 `getPublishedArticle(id)`。成功且 effect 未清理后展示文章，再调用 `recordArticleView(id)` 并以响应的计数更新页面；404 展示现有“未找到该文章”，其他错误显示重试入口。effect cleanup 必须阻止 React StrictMode 的第一次模拟挂载继续上报浏览。

复制链接成功后调用 `recordArticleShare(id)`；计数失败不撤销复制成功提示，也不在本地自行加一。

- [x] **步骤 3：删除本地存储数据源**

确认 `rg "articlesStore|localStorage|articles_updated" src` 无引用后删除 `src/lib/articlesStore.ts`。初始内容已经由 `supabase/seed.sql` 承接。

- [x] **步骤 4：验证公开页面改造**

运行：

```bash
pnpm run typecheck
pnpm run lint
pnpm run build:web
```

预期：全部退出码为 0，构建产出 `dist`。

### 任务 7：增加后台登录保护并接入管理 API

**文件：**
- 创建：`src/components/AdminRoute.tsx`
- 创建：`src/pages/AdminLogin/index.tsx`
- 修改：`src/routes/index.tsx`
- 修改：`src/pages/Admin/index.tsx`

- [x] **步骤 1：实现登录页和受保护路由**

登录页调用：

```ts
await supabase.auth.signInWithPassword({ email, password });
```

成功后跳转 `/admin`；失败显示 Supabase 返回的用户可读消息，不输出 token。`AdminRoute` 在加载会话期间显示固定加载态，无会话时导航到 `/admin/login`，有会话时渲染后台。路由表增加公开的 `/admin/login`，并让 `/admin` 使用保护组件。

- [x] **步骤 2：重构管理后台数据加载**

页面初始化时从 `supabase.auth.getSession()` 获取 access token，并并行请求 `listAdminArticles(token)` 与 `getDashboard(token)`。任何 401/403 响应清除会话并跳转登录；网络错误保留页面并提供重试。

- [x] **步骤 3：接入创建、更新和删除**

表单提交期间禁用按钮：新建调用 `createArticle`，编辑调用 `updateArticle`，成功后用服务端返回对象更新列表并重新加载仪表盘。删除确认后调用 `deleteArticle`，只有 204 成功才从列表移除。失败时显示错误 toast，不能展示成功提示。

新建表单将 `views`、`shares` 默认设为 0，发布时间使用 `datetime-local` 并在请求时转成 ISO 字符串；从 API 加载时转换回本地输入格式。

- [x] **步骤 4：替换仪表盘假数据并增加退出**

仪表盘使用 `DashboardStats`：第四张卡显示 `publishRate%`，分享卡标题为“总分享量”。侧边栏增加退出按钮，调用 `supabase.auth.signOut()` 后跳转 `/admin/login`。

- [x] **步骤 5：验证后台改造**

运行：

```bash
pnpm run typecheck
pnpm run lint
pnpm run build:web
```

预期：全部通过；`rg "98\.6%|今日分享总数|Math\.floor\(Math\.random" src/pages/Admin` 无结果。

### 任务 8：装配生产服务、配置文档和全量验证

**文件：**
- 创建：`server/index.ts`
- 创建：`.env.example`
- 修改：`.gitignore`
- 修改：`README.md`
- 创建：`server/index.test.ts`

- [x] **步骤 1：先编写配置和静态托管测试**

测试 `loadConfig` 在缺少 `SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY` 或 `ADMIN_EMAILS` 时抛出包含变量名的启动错误；通过 `createApp({ staticDirectory })` 测试 API 未匹配路由返回 JSON 404，而非前端 HTML。生产静态回退仅处理非 `/api` 的 GET 请求。

- [x] **步骤 2：实现生产入口**

入口加载 `.env`、创建 Supabase 客户端、仓储和认证器，再将生产环境的 `dist` 绝对路径作为 `staticDirectory` 传给 `createApp`；应用提供静态资源并将非 `/api` GET 请求回退到 `dist/index.html`，入口只负责监听 `PORT`。启动日志只记录端口和环境，不记录密钥、token 或管理员邮箱。

- [x] **步骤 3：补齐环境与操作说明**

`.env.example` 写入全部变量名和非敏感示例值；`.gitignore` 增加 `.env`，保留 `!.env.example`。README 按顺序说明：创建 Supabase 项目、执行 migration、执行 seed、创建 Auth 用户、配置管理员邮箱、安装依赖、`pnpm dev`、构建与 `pnpm start`、健康检查。

- [x] **步骤 4：运行全量自动验证**

运行：

```bash
pnpm run test
pnpm run typecheck
pnpm run lint
pnpm run build
```

预期：测试全部 PASS，三个质量命令退出码均为 0，同时生成 `dist` 与 `dist-server`。

- [x] **步骤 5：无凭据本地烟测**

运行：`pnpm run dev:api`

预期：服务拒绝启动，并明确指出缺失的环境变量；错误信息不包含任何密钥值。结束该进程后继续下一步。

- [ ] **步骤 6：真实 Supabase 联调**

在用户提供有效配置并执行 SQL 后运行 `pnpm dev`，验证：

```text
GET  /api/health                 -> 200
GET  /api/articles               -> 200，仅已发布文章
GET  /api/articles/art-005       -> 404，种子数据中该文章为草稿
POST /api/admin/articles         -> 无 token 为 401
```

随后用白名单管理员登录页面，完成新建草稿、发布、前台阅读、复制分享、后台查看计数、编辑及删除的完整流程。若当前没有真实凭据，将此步骤明确记录为“未验证”，不能宣称线上接入完成。

> 当前状态：未验证。工作区中没有真实 Supabase URL、anon key、service role key，也未能确认迁移和种子已在云端执行。
