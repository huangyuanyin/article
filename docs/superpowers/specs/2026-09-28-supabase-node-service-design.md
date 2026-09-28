# Supabase Node 服务接入设计

## 目标

将现有基于浏览器 `localStorage` 的文章站改造成可部署的真实数据系统：前台与管理后台统一通过 Node API 访问数据，Supabase PostgreSQL 负责持久化，Supabase Auth 负责管理员身份认证。

首期完成文章增删改查、发布/草稿管理、浏览与分享计数、后台统计和管理员登录。图片仍使用 URL，不开发文件上传、多角色权限、富文本编辑器或文章分页。

## 架构

- 前端继续使用 Vite、React 和 React Router。
- 新增 Express + TypeScript Node 服务，开发端口为 `3001`。
- 开发环境由 Vite 将 `/api` 代理到 Node；生产环境由 Node 同时提供 `/api` 和前端构建产物，保持同源访问。
- 浏览器只使用 Supabase 匿名密钥完成 Auth 登录，不直接读写数据库表。
- Node 持有 `SUPABASE_SERVICE_ROLE_KEY`，所有文章数据操作均经由 Node 执行。
- Node 从 `Authorization: Bearer <access_token>` 读取登录令牌，通过 Supabase Auth 校验用户，并使用 `ADMIN_EMAILS` 环境变量中的邮箱白名单授权后台接口。

## 数据模型

`articles` 表字段如下：

| 字段 | 类型 | 规则 |
| --- | --- | --- |
| `id` | `text` | 主键，默认生成 UUID 字符串；允许保留现有 `art-001` 等 ID |
| `title` | `text` | 必填 |
| `summary` | `text` | 默认空字符串 |
| `content` | `text` | 默认空字符串 |
| `cover_image` | `text` | 可空 |
| `publish_date` | `timestamptz` | 必填 |
| `views` | `bigint` | 非负，默认 0 |
| `shares` | `bigint` | 非负，默认 0 |
| `status` | `text` | 仅允许 `published` 或 `draft` |
| `category` | `text` | 可空 |
| `author` | `text` | 可空 |
| `created_at` | `timestamptz` | 创建时自动写入 |
| `updated_at` | `timestamptz` | 更新时由触发器自动写入 |

数据库启用 RLS，不开放匿名或普通登录用户直接访问文章表。服务端使用 service role 访问。浏览量和分享量通过仅授权给 service role 的 PostgreSQL 函数原子递增，避免并发更新丢失。

迁移 SQL 同时写入现有 5 篇初始文章，使用 `ON CONFLICT DO NOTHING` 保证重复执行不会覆盖线上数据。现有浏览器 `localStorage` 数据不自动上传；数据库初始化后，以 Supabase 数据为唯一事实来源。

## API 契约

所有成功响应使用 `{ "data": ... }`，错误响应使用 `{ "error": { "code": string, "message": string, "fieldErrors"?: object } }`。参数校验失败返回 400，未登录返回 401，非管理员返回 403，资源不存在返回 404，未处理错误返回不含敏感信息的 500。

### 公开接口

- `GET /api/health`：服务和 Supabase 连接状态。
- `GET /api/articles`：按发布日期倒序返回已发布文章摘要，不包含正文。
- `GET /api/articles/:id`：返回单篇已发布文章及正文；草稿对外表现为 404。
- `POST /api/articles/:id/view`：原子增加浏览量并返回最新计数。
- `POST /api/articles/:id/share`：原子增加分享量并返回最新计数。

### 管理接口

以下接口全部经过 Supabase Auth 和管理员邮箱白名单校验：

- `GET /api/admin/articles`：返回全部文章，包含草稿和正文。
- `POST /api/admin/articles`：创建文章，ID 与时间戳由服务端生成。
- `PATCH /api/admin/articles/:id`：更新可编辑字段。
- `DELETE /api/admin/articles/:id`：删除文章，成功返回 204。
- `GET /api/admin/dashboard`：返回文章总数、发布数、草稿数、总浏览量、总分享量和最近更新文章。

创建和更新时，服务端验证标题非空、状态枚举、日期合法、计数为非负整数、封面为合法的 `http`/`https` URL。新文章浏览量和分享量默认 0，但管理表单仍允许显式设置。

## 前端改造

- 用异步 API 客户端替换 `articlesStore.ts` 的同步 `localStorage` 读写。
- 首页加载公开文章摘要；详情页单独请求正文，并在成功显示文章后上报一次浏览。
- 分享成功复制链接后再上报分享；上报失败不影响复制结果，但不伪造本地计数。
- 管理后台增加邮箱密码登录和退出，Supabase 客户端只负责 Auth 会话；每次管理请求附带当前 access token。
- 管理列表、新建、编辑、删除和仪表盘改为真实 API，并提供加载、空数据、提交中和失败状态。
- 新建文章计数默认 0，不再随机生成浏览量。
- 仪表盘移除硬编码的“内容健康度 98.6%”，改为接口返回的发布率；“今日分享总数”改为准确的“总分享量”。
- API 不可用时显示可重试错误，不回退到本地示例数据。

## 配置与运行

服务端环境变量：

- `PORT=3001`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAILS`，多个邮箱用英文逗号分隔

前端环境变量：

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

仓库提供示例环境变量文件、Supabase migration/seed SQL、前后端联合开发命令、单独 API 启动命令和生产启动命令。真实密钥不得写入仓库或日志。

## 测试与验收

- API 测试覆盖公开文章过滤、草稿不可见、管理员鉴权、CRUD 校验、404、仪表盘聚合及计数递增。
- 前端至少覆盖 API 数据转换与错误处理；整体执行 TypeScript 检查、ESLint 和生产构建。
- 没有 Supabase 凭据时，API 路由通过注入的内存仓储和鉴权替身完成自动化测试；真实环境另提供健康检查和人工联调步骤。

验收标准：

1. 管理员登录后新建、修改或删除文章，刷新页面及更换浏览器后结果仍一致。
2. 已发布文章可从前台访问，草稿无法通过公开列表或详情接口读取。
3. 未登录或非白名单用户无法调用任何管理写接口。
4. 浏览和分享计数由服务端持久化，并能在后台统计中看到最新结果。
5. Node 服务可以在开发环境与 Vite 联合运行，也可以在生产环境提供前端静态文件和 API。
6. 缺少配置、网络失败和校验失败时，界面给出明确反馈，不显示虚假的成功状态。

## 默认假设

- 已有或将创建一个 Supabase 项目，并能提供 URL、匿名密钥和 service role 密钥。
- 首期仅需要少量管理员，使用 Supabase 邮箱密码账号和服务端邮箱白名单，不建设独立的角色表。
- 首期数据规模较小，不增加分页、全文搜索、缓存和限流；接口结构保留后续扩展空间。
- 发布时间只用于展示和排序，文章是否对外可见仅由 `status` 决定，不实现定时发布任务。
