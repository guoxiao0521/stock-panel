# Stock Panel PRD

版本：v0.1  
日期：2026-06-14  
项目类型：个人自用美股自选股分析工具  
技术栈：Nuxt 4、Vue 3、TypeScript、Tailwind CSS、shadcn-vue、SQLite、yahoo-finance2

## 1. 背景

Stock Panel 是一个面向个人投资者自用的美股观察与分析面板。第一阶段聚焦自选股管理和关键行情指标展示，后续逐步扩展到宏观市场状态监控和 AI 辅助分析。

项目当前是 Nuxt 4 工程，前端界面优先使用 shadcn-vue 组件，样式体系使用 Tailwind CSS。数据源第一阶段以 `yahoo-finance2` 为主，业务数据和缓存数据先落到本地 SQLite。

## 2. 产品目标

### 2.1 第一阶段目标

- 搭建主界面框架，形成稳定的信息架构和视觉风格。
- 支持美股自选股的添加、删除、搜索、排序和基础管理。
- 展示自选股核心行情指标：最新价、日涨跌幅、年初至今涨跌幅、换手率、市盈率等。
- 使用 SQLite 保存自选股列表、备注、标签、行情快照和更新时间。
- 使用 Nuxt server routes 封装数据读写与 yahoo-finance2 查询，避免前端直接耦合数据源。

### 2.2 第二阶段目标

- 新增宏观市场页面。
- 展示 VIX、主要指数、利率、美元指数、黄金、原油等市场环境指标。
- 提供宏观指标的简要状态判断，例如风险偏好、波动率环境和市场宽度。

### 2.3 第三阶段目标

- 预留 AI + Skill 分析能力。
- 后续支持基于公司数据、技术指标、市场环境的辅助分析。
- AI 功能暂不做详细规划，仅保留页面入口、数据接口边界和 TODO。

## 3. 非目标

- 第一阶段不做多用户账号、登录、权限、云同步。
- 第一阶段不做 A 股、港股、期货、期权和加密资产。
- 第一阶段不提供交易下单能力。
- 第一阶段不做实时 tick 级行情。
- 第一阶段不输出投资建议或买卖指令。
- AI 分析在第一阶段和第二阶段均不实现完整功能。

## 4. 目标用户

个人美股投资者，主要使用场景是：

- 每天快速查看自选股的价格、涨跌、估值和交易活跃度。
- 维护一个长期关注列表，给股票添加备注和标签。
- 在进入个股深度分析前，先通过面板发现值得关注的异动。
- 后续结合宏观指标和 AI 分析形成更完整的观察流程。

## 5. 产品阶段

| 阶段 | 名称 | 重点 | 交付结果 |
| --- | --- | --- | --- |
| Phase 1 | 自选股面板 | 主框架、自选股、行情指标、SQLite | 可用的自选股管理和行情展示 |
| Phase 2 | 宏观市场面板 | VIX、指数、利率、商品、风险状态 | 第二个页面和宏观指标卡片 |
| Phase 3 | AI 分析 | AI + Skill、公司数据分析、技术位判断 | TODO，后续补充 |

## 6. 信息架构

### 6.1 路由规划

| 路由 | 阶段 | 页面 | 说明 |
| --- | --- | --- | --- |
| `/` | Phase 1 | 自选股列表 | 默认首页，展示自选股和行情摘要 |
| `/market` | Phase 2 | 宏观市场 | 展示 VIX 和其他宏观市场指标 |
| `/analysis` | Phase 3 | AI 分析 | 预留入口，第一阶段可不暴露或展示 TODO 状态 |

### 6.2 主界面布局

主界面建议采用工作台式布局：

- 顶部导航：产品名、页面切换、刷新按钮、数据更新时间。
- 左侧或顶部工具区：搜索股票、添加自选股、筛选标签、排序方式。
- 主内容区：自选股表格。
- 右侧详情区或抽屉：选中股票的备注、标签、关键指标、最近更新时间。
- 空状态：没有自选股时提示添加 ticker。
- 加载状态：行情刷新时保留已有数据，并显示局部 loading。
- 错误状态：单个股票查询失败时在对应行展示错误，不阻塞整个列表。

## 7. Phase 1 功能需求

### 7.1 自选股管理

#### 功能描述

用户可以维护一个默认自选股列表，列表仅限美股 ticker。

#### 需求明细

- 支持通过 ticker 添加股票，例如 `AAPL`、`MSFT`、`NVDA`。
- 添加时自动标准化 ticker 为大写。
- 添加时通过 yahoo-finance2 校验股票是否存在。
- 不允许重复添加同一个 ticker。
- 支持删除自选股。
- 支持编辑备注。
- 支持添加和移除标签。
- 支持按名称、ticker、标签搜索。
- 支持排序：
  - 手动排序。
  - 按日涨跌幅排序。
  - 按年初至今涨跌幅排序。
  - 按市盈率排序。
  - 按换手率排序。
  - 按添加时间排序。
- 支持刷新行情：
  - 手动刷新。
  - 可选自动刷新，默认间隔建议 5 分钟。

#### 验收标准

- 用户可以成功添加一只有效美股 ticker。
- 重复 ticker 会被阻止，并给出明确反馈。
- 删除股票后刷新页面仍保持删除状态。
- 备注和标签写入 SQLite，刷新页面后仍可见。
- 查询失败的 ticker 不影响其他股票展示。

### 7.2 自选股行情表格

#### 功能描述

主界面用表格展示自选股行情和关键指标。

#### 建议字段

| 字段 | 说明 | 数据来源/计算方式 |
| --- | --- | --- |
| Ticker | 股票代码 | 用户添加，yahoo-finance2 校验 |
| 公司名 | shortName 或 longName | yahoo-finance2 |
| 最新价 | regularMarketPrice | yahoo-finance2 |
| 日涨跌额 | regularMarketChange | yahoo-finance2 |
| 日涨跌幅 | regularMarketChangePercent | yahoo-finance2 |
| 年初至今 | 当前价相对年初首个可用交易日收盘价 | yahoo-finance2 historical 计算 |
| 成交量 | regularMarketVolume | yahoo-finance2 |
| 换手率 | 成交量 / 流通股本或总股本 | 优先 floatShares，否则 sharesOutstanding |
| 市盈率 | trailingPE 或 forwardPE | yahoo-finance2 |
| 市值 | marketCap | yahoo-finance2 |
| 标签 | 用户维护 | SQLite |
| 备注 | 用户维护 | SQLite |
| 更新时间 | 最新行情快照时间 | SQLite |

#### 展示规则

- 正涨幅使用上涨色，负涨幅使用下跌色。
- 缺失数据展示为 `-`，不要展示 `null`、`undefined` 或 `NaN`。
- 数字需要格式化：
  - 价格保留 2 位小数。
  - 百分比保留 2 位小数。
  - 成交量、市值使用 K/M/B/T 缩写。
  - PE 保留 1 至 2 位小数。
- 表格列需要支持较小屏幕横向滚动。
- 用户刷新数据时不清空表格，只更新加载状态。

#### 验收标准

- 表格可以展示至少 20 只自选股且界面不明显卡顿。
- 任意指标缺失时，行布局仍稳定。
- 刷新行情后更新时间更新。
- 排序和搜索不会破坏当前行情数据显示。

### 7.3 个股详情侧栏

#### 功能描述

点击自选股行后展示简要详情，第一阶段保持轻量。

#### 建议内容

- 公司名、Ticker、交易所、币种。
- 最新价和日涨跌幅。
- 市值、PE、成交量、换手率。
- 用户备注。
- 用户标签。
- 最近一次数据更新时间。
- 数据源说明：Yahoo Finance。

#### 验收标准

- 点击表格行可以打开详情。
- 修改备注或标签后，列表和详情同步更新。
- 关闭详情后不会丢失当前搜索和排序状态。

## 8. Phase 2 功能需求：宏观市场页面

### 8.1 页面目标

为个股观察提供市场环境上下文。

### 8.2 初步指标

| 指标 | Ticker/来源建议 | 说明 |
| --- | --- | --- |
| VIX | `^VIX` | 恐慌指数 |
| S&P 500 | `^GSPC` 或 `SPY` | 大盘状态 |
| Nasdaq 100 | `^NDX` 或 `QQQ` | 科技股风险偏好 |
| Russell 2000 | `^RUT` 或 `IWM` | 小盘股风险偏好 |
| 10Y 美债收益率 | `^TNX` | 利率环境 |
| 美元指数 | `DX-Y.NYB` | 美元强弱 |
| 黄金 | `GC=F` 或 `GLD` | 避险资产 |
| 原油 | `CL=F` 或 `USO` | 能源价格 |

### 8.3 展示建议

- 顶部展示市场状态摘要。
- 指标用紧凑卡片展示，不做营销式大卡片。
- 每个指标显示最新值、日涨跌幅、短期趋势。
- 后续可增加历史走势图。

## 9. Phase 3 功能需求：AI 分析 TODO

AI 功能暂不做详细规划，仅保留以下 TODO：

- TODO：定义 AI 分析输入数据，包括行情、财务、新闻、技术指标、宏观指标。
- TODO：定义 Skill 调用方式和安全边界。
- TODO：设计个股分析报告结构。
- TODO：设计支撑位、压力位、趋势判断的计算和解释方式。
- TODO：增加免责声明，明确 AI 输出仅供研究参考，不构成投资建议。
- TODO：评估是否需要保存 AI 分析历史。

## 10. 数据源与数据策略

### 10.1 数据源

第一阶段使用 `yahoo-finance2`。

建议新增依赖：

```bash
pnpm add yahoo-finance2
pnpm add better-sqlite3
pnpm add -D @types/better-sqlite3
```

如果后续需要 ORM，可以再评估 Drizzle ORM 或 Prisma。第一阶段为了速度和可控性，可先直接封装 SQLite repository 层。

### 10.2 数据刷新策略

- 页面首次加载时读取 SQLite 中的自选股和最近行情快照。
- 如果快照过期，再调用 yahoo-finance2 刷新。
- 默认缓存有效期建议 5 分钟。
- 手动刷新忽略缓存，直接重新拉取。
- 查询失败时保留旧快照，并记录错误信息。

### 10.3 指标计算说明

- 年初至今涨跌幅：
  - 获取当年首个可用交易日收盘价。
  - 使用 `(最新价 - 年初价) / 年初价 * 100` 计算。
- 换手率：
  - 优先使用 `regularMarketVolume / floatShares`。
  - 如果没有 `floatShares`，使用 `regularMarketVolume / sharesOutstanding`。
  - 如果股本数据缺失，展示 `-`。
- 市盈率：
  - 优先展示 `trailingPE`。
  - 如果缺失，可展示 `forwardPE`，并在字段内部标记来源。

## 11. SQLite 数据模型建议

### 11.1 watchlists

用于预留未来多个自选股列表。第一阶段只创建默认列表。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | text primary key | 列表 ID |
| name | text | 列表名称 |
| created_at | text | 创建时间 |
| updated_at | text | 更新时间 |

### 11.2 watchlist_items

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| id | text primary key | 项目 ID |
| watchlist_id | text | 所属列表 |
| symbol | text | 股票代码 |
| name | text | 公司名 |
| exchange | text | 交易所 |
| currency | text | 币种 |
| note | text | 用户备注 |
| tags_json | text | 标签 JSON |
| sort_order | integer | 手动排序 |
| created_at | text | 创建时间 |
| updated_at | text | 更新时间 |

### 11.3 quote_snapshots

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| symbol | text primary key | 股票代码 |
| price | real | 最新价 |
| change | real | 日涨跌额 |
| change_percent | real | 日涨跌幅 |
| ytd_change_percent | real | 年初至今涨跌幅 |
| volume | integer | 成交量 |
| turnover_rate | real | 换手率 |
| trailing_pe | real | 静态市盈率 |
| forward_pe | real | 预期市盈率 |
| market_cap | integer | 市值 |
| quote_time | text | 行情时间 |
| fetched_at | text | 拉取时间 |
| source | text | 数据源 |
| error | text | 最近错误 |
| raw_json | text | 原始数据 JSON，便于调试 |

### 11.4 macro_metric_snapshots

Phase 2 使用。

| 字段 | 类型 | 说明 |
| --- | --- | --- |
| symbol | text primary key | 指标代码 |
| name | text | 指标名称 |
| value | real | 最新值 |
| change | real | 涨跌额 |
| change_percent | real | 涨跌幅 |
| quote_time | text | 行情时间 |
| fetched_at | text | 拉取时间 |
| raw_json | text | 原始数据 JSON |

## 12. API 设计建议

Nuxt server routes 建议放在 `server/api`。

### 12.1 自选股

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/watchlist` | 获取默认自选股列表和最近行情 |
| POST | `/api/watchlist/items` | 添加自选股 |
| PATCH | `/api/watchlist/items/:id` | 更新备注、标签、排序 |
| DELETE | `/api/watchlist/items/:id` | 删除自选股 |

### 12.2 行情

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/quotes` | 按 symbols 查询缓存行情 |
| POST | `/api/quotes/refresh` | 刷新一个或多个股票行情 |

### 12.3 宏观指标

| 方法 | 路径 | 阶段 | 说明 |
| --- | --- | --- | --- |
| GET | `/api/market/metrics` | Phase 2 | 获取宏观指标 |
| POST | `/api/market/refresh` | Phase 2 | 刷新宏观指标 |

## 13. UI 设计规范

### 13.1 组件原则

优先使用 shadcn-vue：

- Button：刷新、添加、删除、保存。
- Card：宏观指标卡片、详情信息块。
- Badge：标签、状态。
- Table：自选股列表。
- Dialog 或 Sheet：添加股票、编辑详情。
- Input：搜索和 ticker 输入。
- Select：排序、筛选。
- Tabs：未来用于切换观察列表或详情面板。

如果 shadcn-vue 当前未安装对应组件，应通过 shadcn CLI 添加，不建议手写一套不一致的 UI 组件。

### 13.2 视觉原则

- 工具型产品优先信息密度和可扫描性。
- 避免大面积装饰性渐变和营销式 hero。
- 表格、筛选、刷新状态要稳定，不因数据加载造成布局跳动。
- 上涨、下跌、中性状态需要视觉一致。
- 页面适配桌面优先，同时保证移动端可横向查看表格。

## 14. 错误处理

- 添加无效 ticker：提示无法找到该美股代码。
- yahoo-finance2 请求失败：保留旧数据，并显示最近刷新失败。
- 单只股票失败：只标记该行错误，不影响其他股票。
- SQLite 初始化失败：页面展示明确错误，开发环境输出详细日志。
- 指标缺失：展示 `-`，不抛前端异常。

## 15. 性能要求

- 20 到 50 只自选股时，页面交互应保持流畅。
- 首屏优先展示 SQLite 缓存数据，再异步刷新远端行情。
- 批量刷新应限制并发，避免被数据源限流。
- 表格搜索和排序在前端完成即可。
- 行情原始响应可以保存，但需避免无限增长；第一阶段每个 symbol 只保存最新快照。

## 16. 合规与免责声明

产品为个人研究工具，不提供交易执行能力。后续 AI 分析需要在页面中明确：

- 所有数据和分析仅供研究参考。
- 不构成投资建议。
- 数据可能延迟、缺失或不准确。
- 用户需要自行判断投资风险。

## 17. 第一阶段开发拆分建议

### Milestone 1：主框架

- 创建应用布局和导航。
- 首页搭建自选股面板骨架。
- 引入需要的 shadcn-vue 组件。
- 定义基础类型和格式化工具。

### Milestone 2：SQLite 数据层

- 添加 SQLite 依赖。
- 初始化数据库和表结构。
- 封装 watchlist repository。
- 提供自选股 CRUD API。

### Milestone 3：行情数据层

- 添加 yahoo-finance2。
- 封装 quote service。
- 实现单只和批量刷新。
- 计算 YTD、换手率、PE。
- 写入 quote_snapshots。

### Milestone 4：自选股交互

- 添加股票弹窗。
- 删除、备注、标签。
- 搜索、排序。
- 手动刷新和 loading/error 状态。

### Milestone 5：验收和整理

- 补充关键单元测试或服务层测试。
- 验证空状态、错误状态、数据缺失状态。
- 检查桌面和移动端布局。
- 更新 README 的启动和依赖说明。

## 18. 第一阶段验收清单

- 可以添加、删除、搜索、排序美股自选股。
- 自选股数据存储在 SQLite，刷新页面后不丢失。
- 首页展示最新价、涨跌幅、年初至今、换手率、市盈率。
- 手动刷新可以更新行情数据。
- API 层不把 yahoo-finance2 直接暴露给前端组件。
- 数据缺失和请求失败时界面可用。
- UI 主要由 shadcn-vue 和 Tailwind CSS 实现。
- Nuxt build 通过。

## 19. 待确认问题

- 是否需要多个自选股分组，例如“核心持仓”“观察”“高增长”。
- 是否需要导入导出 ticker 列表。
- 是否需要记录历史行情快照，而不是只保留最新快照。
- 是否需要为每只股票增加买入成本、目标价、仓位等个人投资字段。
- 宏观页面是否只展示指标，还是需要加入趋势图和状态评分。
- AI 分析使用哪类模型、Skill 来源和调用方式。
