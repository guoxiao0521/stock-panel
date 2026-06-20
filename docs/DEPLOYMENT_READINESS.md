# Deployment Readiness

日期：2026-06-20  
目标：评估当前项目部署到 Vercel 或 Cloudflare 前还欠缺的必要能力，并给出推荐改造顺序。

## 1. 当前结论

当前项目更接近本地单人自用工具，不能直接稳定部署到 Vercel 或 Cloudflare 的 serverless/edge 环境。

主要阻塞点不是 Nuxt 本身，而是后端运行模型：

- 数据持久化依赖本地 SQLite 文件：`server/utils/db.ts`
- SQLite 驱动依赖原生模块 `better-sqlite3`
- 所有自选股写接口、刷新接口和分析接口缺少公网访问控制
- 没有云数据库 migration、定时刷新、限流、生产环境变量和部署验证流程

Nuxt/Nitro 可以部署到 Vercel 或 Cloudflare，但当前数据层和安全边界需要先改。

## 2. 当前项目现状

技术栈：

- Nuxt 4 / Vue 3 / TypeScript
- Nitro server routes
- Tailwind CSS / shadcn-vue
- `yahoo-finance2`
- `better-sqlite3`
- 本地 SQLite：默认 `./.data/stock-panel.db`

关键文件：

- `nuxt.config.ts`：当前配置了 `better-sqlite3` 外部依赖
- `server/utils/db.ts`：创建本地 SQLite 连接并初始化 schema
- `server/utils/watchlist-repo.ts`：自选股 CRUD，同步 SQLite API
- `server/utils/quote-repo.ts`：行情快照读写，同步 SQLite API
- `server/utils/macro-repo.ts`：宏观指标快照读写，同步 SQLite API
- `server/api/**`：公网 API 路由，目前未做鉴权和限流

本地构建验证：

- 已尝试运行 `pnpm build`
- 构建在 2 分钟后超时，未确认生产构建通过
- 部署前必须重新验证构建、预览和 API 行为

## 3. 必补能力

### 3.1 云端持久化

当前本地 SQLite 文件不能作为 serverless/edge 的持久数据源。

原因：

- Vercel Functions 的文件系统是只读为主，只提供临时 `/tmp` scratch space，不适合保存长期数据库文件。
- Cloudflare Workers/Pages Functions 不是传统 Node 服务器环境，本地文件型 SQLite 和原生 Node addon 不适合作为运行时依赖。
- `.data/stock-panel.db` 当前被 `.gitignore` 忽略，本身也是本地状态，不应随代码部署。

可选方案：

| 平台 | 推荐数据库 | 说明 |
| --- | --- | --- |
| Vercel | Neon Postgres / Supabase Postgres / Turso libSQL / Upstash | 保留 Nuxt server routes，数据层改成云 DB |
| Cloudflare | Cloudflare D1 | 最贴近当前 SQLite schema，但需要按 D1 binding/API 改造 |
| 任意平台 | 外部 Postgres | 更通用，后续迁移空间更大 |

建议：

- 如果目标是最快上线，优先选 Vercel + 托管 Postgres 或 Turso。
- 如果目标是 Cloudflare 生态内闭环，优先选 Cloudflare D1。

### 3.2 数据访问层异步化和适配层

当前 repository 直接使用 `better-sqlite3` 的同步 API：

- `db.prepare(...).get()`
- `db.prepare(...).all()`
- `db.prepare(...).run()`

云数据库通常是异步 API。需要完成：

- 抽象 `DatabaseClient` 或 repository adapter
- 将 repo 函数改为 async
- 将 API route 中对应调用改为 `await`
- 将 schema 初始化迁移为显式 migration
- 移除运行时对本地 `mkdirSync` 和本地 DB 文件路径的依赖

建议最小接口：

```ts
interface AppDatabase {
  listWatchlistRows(watchlistId: string): Promise<WatchlistRow[]>
  findItemById(id: string): Promise<WatchlistItem | null>
  findItemBySymbol(watchlistId: string, symbol: string): Promise<WatchlistItem | null>
  createWatchlistItem(watchlistId: string, body: CreateWatchlistItemBody): Promise<WatchlistItem>
  updateWatchlistItem(id: string, body: UpdateWatchlistItemBody): Promise<WatchlistItem | null>
  deleteWatchlistItem(id: string): Promise<boolean>
  getQuoteSnapshots(symbols: string[]): Promise<QuoteSnapshot[]>
  upsertQuoteSnapshot(snapshot: QuoteSnapshot, rawJson?: string | null): Promise<void>
  getMacroSnapshots(symbols: string[]): Promise<MacroMetricSnapshot[]>
  upsertMacroSnapshot(snapshot: MacroMetricSnapshot, raw?: unknown): Promise<void>
}
```

### 3.3 鉴权和访问控制

当前以下接口部署到公网后都可以被任何人调用：

- `POST /api/watchlist/items`
- `PATCH /api/watchlist/items/:id`
- `DELETE /api/watchlist/items/:id`
- `POST /api/quotes/refresh`
- `POST /api/market/refresh`
- `POST /api/analysis/run`

必须补至少一种访问控制：

- 简单个人用：Basic Auth 或单个管理员 token
- 中等复杂度：登录 session + HttpOnly cookie
- 平台级：Vercel/Cloudflare Access 保护整个站点

最小建议：

- 给所有写接口、刷新接口、分析接口加鉴权
- GET 接口按需求决定是否公开
- 管理密钥放环境变量，不写入代码
- 前端请求通过 session/cookie，不在浏览器暴露长期 API token

### 3.4 API 限流和防滥用

`yahoo-finance2` 是外部数据源，不应让公网用户无限刷。

需要补：

- 单 IP / 单 session 请求频率限制
- 单次刷新 symbols 数量上限
- 刷新接口必须走服务端缓存 TTL
- 失败退避，避免持续打爆数据源
- 错误日志中保留 symbol、接口、错误类型和时间

建议策略：

- 普通行情刷新：缓存 5 分钟
- 强制刷新：只允许管理员触发
- 单次刷新上限：50 个 symbol
- 分析接口：限制并发和频率，因为会拉历史数据和 benchmark

### 3.5 定时刷新

当前刷新依赖用户打开页面或手动点击。部署后建议加入后台刷新。

Vercel 方案：

- 使用 Vercel Cron 调用内部刷新 API
- 刷新接口需要校验 cron secret

Cloudflare 方案：

- 使用 Scheduled Workers
- 定时读取自选股并刷新缓存

建议先做：

- 每 5 到 15 分钟刷新自选股行情
- 每 5 到 15 分钟刷新宏观指标
- 美股非交易时段降低刷新频率

### 3.6 生产环境变量

当前只有 `NUXT_DB_PATH`，云部署后需要补充：

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | Vercel/Postgres/Turso 等数据库连接 |
| `ADMIN_AUTH_SECRET` | 管理员访问密钥或 session secret |
| `CRON_SECRET` | 定时任务调用刷新接口时校验 |
| `ANALYSIS_PROVIDER` | 分析 provider，例如 `template`、`openai` |
| `ANALYSIS_API_KEY` | 后续 AI provider key |
| `ANALYSIS_MODEL` | 后续 AI model 配置 |
| `QUOTE_CACHE_TTL_SECONDS` | 行情缓存 TTL |
| `REFRESH_MAX_SYMBOLS` | 单次刷新 symbol 上限 |

Cloudflare D1 还需要在 Wrangler/Pages 配置中绑定数据库，例如 `DB` binding。

### 3.7 Migration 和数据迁移

当前 schema 在 `server/utils/db.ts` 中启动时自动执行。这适合本地开发，不适合生产。

需要补：

- `migrations/` 目录
- 初始建表 SQL
- 后续 schema 变更 SQL
- 本地和云端的 migration 命令
- 从 `.data/stock-panel.db` 导出当前自选股的迁移脚本

建议 migration 拆分：

- `0001_init.sql`：watchlists、watchlist_items、quote_snapshots、macro_metric_snapshots
- `0002_macro_errors.sql`：如果保留已有迁移语义，增加 error / error_at

### 3.8 部署配置

Vercel 需要明确：

- Build command：`pnpm build`
- Install command：`pnpm install`
- Node 版本：>= 22
- 环境变量
- 数据库连接
- Cron 配置

Cloudflare 需要明确：

- Nitro preset：Cloudflare Pages 或 Workers
- Wrangler 配置
- D1 binding
- `nodejs_compat` 是否需要开启
- Build output 目录
- D1 migration 应用流程

注意：

- 项目使用 `server/api`，不能直接当作纯静态站点部署，除非把 API 全部拆到外部服务。
- `nuxt generate` 不适合作为当前完整功能的主要部署方式。

### 3.9 日志、监控和错误可见性

部署后至少需要：

- API 错误日志
- 行情刷新失败日志
- 数据库错误日志
- 构建失败日志
- 定时任务执行结果
- 最近一次刷新时间和失败原因在 UI 可见

可选：

- Sentry
- Vercel Logs / Cloudflare Logs
- 自建 `refresh_jobs` 表记录刷新历史

### 3.10 测试和 CI

部署前必须补：

- `pnpm build` 稳定通过
- API route 基础测试
- repository 层测试
- migration 测试
- 生产预览 smoke test

推荐 CI 步骤：

```bash
pnpm install
pnpm build
pnpm test
```

当前项目还没有测试脚本，需要先决定测试框架。Nuxt 项目可考虑 Vitest。

## 4. Vercel 路线

适合场景：

- 想最快上线
- 希望保留 Node serverless 运行方式
- 不想一次性适配 Cloudflare Workers 的运行时限制

推荐技术选择：

- Nuxt SSR on Vercel
- 数据库：Neon Postgres、Supabase Postgres 或 Turso
- 定时任务：Vercel Cron
- 鉴权：Basic Auth、session cookie 或 Vercel/平台访问控制

主要改造：

1. 替换 `better-sqlite3`
2. repository async 化
3. 接入云数据库
4. 增加鉴权和限流
5. 增加 Cron secret + 刷新任务
6. 补 Vercel 环境变量和构建验证

风险：

- Serverless 冷启动
- 数据库连接池需要适配 serverless
- `yahoo-finance2` 请求耗时可能接近函数执行限制，需要控制并发和超时

## 5. Cloudflare 路线

适合场景：

- 希望部署在 Cloudflare Pages/Workers
- 希望使用 D1/KV/R2 等 Cloudflare 原生服务
- 愿意接受更彻底的运行时适配

推荐技术选择：

- Nuxt on Cloudflare Pages/Workers
- 数据库：Cloudflare D1
- 定时任务：Scheduled Workers
- 缓存：KV 或 Nitro storage binding（可后续再做）
- 鉴权：Cloudflare Access 或应用内 session

主要改造：

1. 移除 `better-sqlite3`
2. 将 schema 迁到 D1 migrations
3. repository 改为 D1 binding 查询
4. 检查 `yahoo-finance2` 在 Workers runtime 的兼容性
5. 配置 Wrangler、D1 binding、compatibility flags
6. 增加 Scheduled Worker 刷新逻辑

风险：

- Workers 不是完整 Node.js 环境，部分 npm 包可能不兼容
- 原生 Node addon 不可作为运行时依赖
- D1 查询 API 和当前同步 SQLite 代码差异较大

## 6. 推荐实施顺序

### Milestone 1：部署前基础体检

- 修复 `pnpm build` 超时或失败问题
- 补 `.env.example`
- 明确部署目标：Vercel 或 Cloudflare
- 记录当前 `.data/stock-panel.db` 中需要迁移的数据

验收：

- `pnpm build` 本地通过
- `pnpm preview` 可打开主要页面
- README 或部署文档能说明本地和生产环境变量

### Milestone 2：数据层改造

- 抽象数据库访问层
- repository async 化
- 增加 migration 文件
- 接入目标云数据库
- 写一个本地 SQLite 导出脚本，迁移自选股和备注

验收：

- 自选股 CRUD 可在云数据库读写
- 行情快照和宏观快照可写入云数据库
- 本地开发和生产部署使用不同数据库配置

### Milestone 3：安全边界

- 写接口加鉴权
- 刷新接口加鉴权
- 分析接口加鉴权或限流
- 增加 rate limit
- 增加请求体大小和 symbol 数量限制

验收：

- 未登录用户不能修改自选股
- 未授权请求不能触发强制刷新
- 滥用刷新接口不会绕过缓存 TTL

### Milestone 4：刷新与缓存

- 增加 Cron/Scheduled Worker
- 增加 refresh job 日志
- 非交易时段降低刷新频率
- UI 展示最近成功刷新时间和失败状态

验收：

- 不打开页面也能定时刷新
- Yahoo 请求失败不会清空旧数据
- 错误可在日志中定位

### Milestone 5：生产发布

- 配置 Vercel 或 Cloudflare 项目
- 设置环境变量和 secrets
- 跑 migration
- 部署 preview
- 运行 smoke test
- 切 production domain

验收：

- 首页、自选股、宏观、分析页面可访问
- 自选股新增、编辑、删除可持久化
- 刷新接口可用且受保护
- 定时任务能正常执行
- 生产日志可查看

## 7. 最小上线版本定义

如果目标是“尽快个人可用”，最小上线版本至少需要：

- 云数据库替代本地 SQLite
- 所有写接口加鉴权
- `pnpm build` 通过
- 生产环境变量完整
- 手动刷新可用且限流
- 基础错误日志可查

可以暂缓：

- 多用户账号
- 完整 AI provider
- 高级监控
- 历史行情长期存储
- 复杂权限模型

## 8. 决策建议

优先推荐：

1. **Vercel + 托管 Postgres/Turso**
   - 改造量较小
   - 更接近当前 Nuxt server routes + Node 包生态
   - 适合快速上线

2. **Cloudflare + D1**
   - 长期成本和边缘部署体验好
   - 但需要更彻底地替换数据层和检查运行时兼容性
   - 适合愿意投入一次平台化改造时选择

不推荐：

- 继续使用本地 SQLite 文件作为云端生产数据库
- 把 `.data/stock-panel.db` 随代码部署
- 不加鉴权直接暴露管理和刷新接口
- 用 `nuxt generate` 作为完整功能部署方案

## 9. 官方参考

- Nuxt Vercel 部署：https://nuxt.com/deploy/vercel
- Nuxt Cloudflare 部署：https://nuxt.com/deploy/cloudflare
- Nuxt 部署总览：https://nuxt.com/docs/4.x/getting-started/deployment
- Vercel Functions Runtime：https://vercel.com/docs/functions/runtimes
- Vercel SQLite 说明：https://vercel.com/kb/guide/is-sqlite-supported-in-vercel
- Vercel Cron Jobs：https://vercel.com/docs/cron-jobs
- Cloudflare Workers Node.js compatibility：https://developers.cloudflare.com/workers/runtime-apis/nodejs/
- Cloudflare storage options / D1：https://developers.cloudflare.com/workers/platform/storage-options/
- NuxtHub Cloudflare deploy notes：https://hub.nuxt.com/docs/getting-started/deploy
