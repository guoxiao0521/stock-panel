# Stock Panel

面向个人投资者自用的美股观察与分析面板。第一阶段聚焦自选股管理与关键行情指标展示。

技术栈：Nuxt 4 · Vue 3 · TypeScript · Tailwind CSS v4 · shadcn-vue · SQLite（better-sqlite3）· yahoo-finance2。

详细产品需求见 [`docs/PRD.md`](./docs/PRD.md)。

## 功能（Phase 1）

- 自选股管理：添加（yahoo-finance2 校验 ticker）、删除、备注、标签。
- 行情表格：最新价、日涨跌、年初至今、成交量、换手率、市盈率、市值。
- 搜索、排序（含升/降序切换）、手动刷新与自动刷新（5 分钟可选）。
- 个股详情侧栏：关键指标、备注与标签编辑。
- 数据持久化到本地 SQLite，行情快照带缓存（默认 5 分钟）。

## 环境要求

- Node.js >= 22
- pnpm（仓库使用 pnpm 作为包管理器）

> `better-sqlite3` 为原生模块，安装时会下载预编译二进制；如失败需本地具备 C++ 构建工具链。

## 安装

```bash
pnpm install
```

## 开发

启动开发服务器（默认 `http://localhost:3000`）：

```bash
pnpm dev
```

首次运行会在 `./.data/stock-panel.db` 自动创建 SQLite 数据库与表结构。

### 环境变量

| 变量 | 说明 | 默认值 |
| --- | --- | --- |
| `NUXT_DB_PATH` | SQLite 数据库文件路径 | `./.data/stock-panel.db` |

## 构建与预览

```bash
pnpm build      # 生产构建
pnpm preview    # 本地预览生产构建
```

## 目录结构

```
app/                  前端（Nuxt 4 app 目录）
  components/         业务组件 + shadcn-vue UI（components/ui）
  composables/        useWatchlist、useAppHeader、useTheme
  layouts/            默认布局与顶部导航
  lib/                格式化工具、cn
  pages/              /(自选股)、/market、/analysis
server/
  api/                Nitro server routes
    watchlist/        自选股 CRUD
    quotes/           行情查询与刷新
  utils/              db、repository、quote-service（自动导入）
shared/types/         前后端共用领域类型（#shared/types）
docs/PRD.md           产品需求文档
```

## API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/watchlist` | 获取默认自选股列表及最近行情 |
| POST | `/api/watchlist/items` | 添加自选股（校验 ticker） |
| PATCH | `/api/watchlist/items/:id` | 更新备注、标签、排序 |
| DELETE | `/api/watchlist/items/:id` | 删除自选股 |
| GET | `/api/quotes?symbols=AAPL,MSFT` | 查询缓存行情 |
| POST | `/api/quotes/refresh` | 刷新行情（`force` 忽略缓存） |

## 免责声明

本工具仅供个人研究参考，不构成投资建议；数据可能延迟、缺失或不准确，请自行判断投资风险。
