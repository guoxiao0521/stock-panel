# Deployment Readiness

日期：2026-06-27
目标：记录当前项目迁移到 Supabase Postgres 后的部署前要求。

## 当前架构

- Nuxt 4 / Vue 3 / TypeScript
- Nitro server routes
- Tailwind CSS / shadcn-vue
- `yahoo-finance2`
- Supabase Postgres，运行时通过 `pg` + `DATABASE_URL` 访问
- 业务表与 better-auth 表位于非公开 schema `stock_panel`
- 业务表不授予 `anon` / `authenticated` Data API 访问权限，所有读写继续走 Nuxt server routes

## 必需环境变量

| 变量 | 用途 |
| --- | --- |
| `DATABASE_URL` | 运行时 Postgres 连接串，推荐 Supabase Transaction pooler，并带 `options=-c%20search_path%3Dstock_panel,public` |
| `DATABASE_DIRECT_URL` | 可选，migration/admin 直连连接串 |
| `BETTER_AUTH_SECRET` | better-auth session secret |
| `BETTER_AUTH_URL` | better-auth base URL |
| `GOOGLE_CLIENT_ID` | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `SUPABASE_URL` | 可选 public runtime config |
| `SUPABASE_KEY` | 可选 publishable key；禁止使用 service role key |

`DATABASE_URL` 是服务端 secret，不能写入 public runtime config，也不能在前端代码中读取。

## Migration

初始 schema 位于 `supabase/migrations/*_init_stock_panel.sql`。

部署前需要：

1. 在 Supabase 项目中应用 migration。
2. 确认 `stock_panel` schema 存在。
3. 确认默认 watchlist `id = 'default'` 已 seed。
4. 确认未向 `anon` / `authenticated` grant `stock_panel` 业务表权限。

本次迁移不导入 `.data/stock-panel.db` 历史数据；现有用户需要重新登录。

## 部署检查

- `pnpm install`
- `pnpm build`
- 设置所有生产环境变量
- 应用 Supabase migration
- 启动 preview 或部署预览环境
- 未登录访问 `GET /api/watchlist` 应返回默认空列表
- 未登录写接口应返回 401
- 登录后验证添加、备注/标签编辑、删除自选股
- 验证行情刷新写入 `quote_snapshots`
- 验证宏观刷新写入 `macro_metric_snapshots`
- 验证分析接口能读取 quote、macro 和自选股备注

## 剩余生产风险

- 刷新接口和分析接口仍需要更细的频率限制，避免外部数据源被滥用。
- 如果部署到 serverless 平台，应使用 Supabase pooler 连接串并控制 `DATABASE_POOL_MAX`。
- 生产日志需要覆盖 DB 连接错误、Yahoo Finance 失败和 OAuth 回调失败。

## 官方参考

- Supabase Postgres 连接：https://supabase.com/docs/guides/database/connecting-to-postgres
- Better Auth PostgreSQL adapter：https://better-auth.com/docs/adapters/postgresql
- Nuxt Vercel 部署：https://nuxt.com/deploy/vercel
- Nuxt Cloudflare 部署：https://nuxt.com/deploy/cloudflare
