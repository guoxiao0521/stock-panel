# AGENT.md

本文件约束本仓库中的 AI 编码助手行为。优先遵守本文件；若与用户明确指令冲突，以用户最新指令为准。

## Tech Stack（技术栈）

- Runtime：Node.js >= 22，包管理器使用 `pnpm`。
- Framework：Nuxt 4 + Vue 3 + TypeScript，项目为 ESM。
- UI：Tailwind CSS v4、shadcn-vue、Reka UI、lucide-vue、vue-sonner。
- Charts / Tables：lightweight-charts、@tanstack/vue-table。
- Server：Nuxt Nitro server routes。
- Data：Supabase Postgres，通过服务端 `pg` Pool 和 `DATABASE_URL` 访问；业务表位于 `stock_panel` schema。
- Market Data：`yahoo-finance2`，行情服务在 server utils 中封装。
- Shared Types：前后端共用类型放在 `shared/types`，通过 `#shared/types` 引用。

## Project Structure（目录结构）

```text
app/
  app.vue                 Nuxt App 入口
  assets/css/             全局 Tailwind 样式
  components/             业务组件
  components/ui/          shadcn-vue 基础 UI 组件
  composables/            前端状态与业务交互封装
  layouts/                页面布局
  lib/                    前端纯工具函数
  pages/                  路由页面
  plugins/                Nuxt 插件
server/
  api/                    Nitro API route，只做协议层工作
  utils/                  DB、repository、service、配置等服务端逻辑
shared/
  types/                  前后端共享领域类型与 API body 类型
docs/
  PRD.md                  产品需求文档
public/                   静态资源
```

不要提交或依赖 `node_modules/`、`.nuxt/`、`.output/`、`.data/` 中的生成文件，除非用户明确要求。

## Architecture Rules（架构约束）

- 保持 Feature First 架构：按业务能力组织代码，避免把业务逻辑拆成无语义的横向杂物目录。
- Route 层禁止业务逻辑：`server/api/**` 只负责参数读取、校验、HTTP 错误和调用 service/repository。
- 服务端业务编排放在 `server/utils/*-service.ts`。
- 数据库读写放在 `server/utils/*-repo.ts` 或明确的数据访问模块。
- Postgres 连接和低层 DB helper 集中在 `server/utils/db.ts`；schema 变更通过 `supabase/migrations` 管理，不在运行时自动建表。
- 行情源、缓存、批量刷新、容错逻辑由 quote/macro service 负责，不在 Vue 组件或 route 中实现。
- 前端页面 `app/pages/**` 负责组合视图，不承载复杂业务流程。
- 前端状态、筛选、排序、API 调用优先放入 `app/composables/**`。
- 纯展示与交互组件放在 `app/components/**`，保持 props/emit 清晰。
- 基础 UI 组件只放在 `app/components/ui/**`；不要把业务逻辑写进基础 UI 组件。
- 格式化、颜色 class、通用 UI helper 优先复用 `app/lib/**`。
- 前后端共享字段、API 请求体、领域模型必须定义在 `shared/types`。
- 新增 API 时必须补充请求体、响应结构或领域类型；避免让 `$fetch` 推断成隐式 `any`。
- 不修改公共接口除非必要；必须修改时同步更新调用方、共享类型和相关文档。
- 不新增重复组件；先搜索是否已有业务组件、UI 组件、composable 或工具函数可复用。
- 不绕过已有 repository/service 直接访问数据库，除非是在扩展同一层职责。
- 外部 API 调用必须隔离在服务端，前端不要直接调用行情源或数据库。
- 错误处理应贴近边界：route 转 HTTP 错误，service/repo 返回明确结果或抛出领域错误。
- 任何持久化字段变更都要同步考虑 Supabase migration、repo mapper、shared type 和 UI 展示。

## Code Style（代码规范）

- 编写自解释代码：命名优于注释，抽象优于解释；优先让代码表达业务意图，而非依赖注释说明实现细节。
- 只有在解释业务约束、外部 API 怪异行为、缓存策略或非显然算法时才写注释。
- 使用 TypeScript 严格表达数据边界；禁止引入隐式 `any`。
- Vue 文件使用 `<script setup lang="ts">`。
- 组件 props、emits 必须显式声明类型。
- 函数保持单一职责；如果函数名无法准确描述行为，先调整抽象再补注释。
- 变量名使用领域语言，例如 `watchlistId`、`quoteSnapshot`、`turnoverRate`。
- 文件命名遵循现有风格：业务组件 PascalCase，composable 使用 `useXxx.ts`，server 工具使用 kebab-case。
- 路径别名沿用现有约定：前端使用 `@/`，共享类型使用 `#shared/types`。
- 优先使用已有工具：`format.ts`、`market-status.ts`、`indicators.ts`、`utils.ts`。
- UI 按现有 shadcn-vue + Tailwind 风格实现，按钮图标优先用 `@lucide/vue`。
- 保持可访问性：图标按钮必须有 `aria-label` 或等价可访问名称。
- 不在组件模板中堆叠复杂表达式；复杂计算放到 computed、函数或 composable。
- 不在没有必要时新增依赖；新增依赖前确认现有技术栈无法覆盖。
- 不做与当前任务无关的重构、格式化或目录迁移。

## AI Agent Rules（AI 编码助手约束）

1. 修改前先阅读同目录已有实现，理解命名、分层、错误处理和 UI 风格。
2. 优先复用已有代码；先搜索组件、composable、service、repo、lib helper。
3. 不新增重复组件；发现相近组件时优先扩展 props/slots 或抽取真实公共能力。
4. 不修改公共接口除非必要；必要时说明原因，并同步更新所有调用方。
5. 新增 API 必须补充类型，包括 request body、response shape 和共享领域类型。
6. 保持 Feature First 架构；不要为了“通用”过早抽象。
7. Route 层禁止业务逻辑；route 只能做协议适配、校验和委派。
8. 所有代码必须通过 TypeScript 检查；当前仓库至少运行 `pnpm build` 验证。
9. 修改服务端数据逻辑时，同时检查 route、service、repo、shared types 的一致性。
10. 修改前端数据流时，同时检查 page、component、composable、shared types 的一致性。
11. 修改 UI 时先复用 `components/ui`，保持现有 Tailwind class 风格。
12. 修改行情或数据库逻辑时，避免破坏本地缓存、批量容错和空值展示策略。
13. 不把临时调试代码、console 噪音、一次性脚本或生成产物提交到源码。
14. 遇到不明确需求时，先做最小可行且符合现有架构的实现。
15. 完成后说明改了什么、如何验证，以及是否存在未验证风险。

## Verification（验证）

- 常规代码改动后运行：`pnpm build`。
- UI 改动需至少本地启动 `pnpm dev` 并检查关键页面。
- API 或数据层改动需覆盖成功、失败、空数据和外部数据缺失场景。
- 如果因环境限制无法验证，必须在结果中明确说明未验证项和原因。
