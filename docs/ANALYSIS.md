# AI 分析模块

Stock Panel Phase 3 分析能力，方法论映射自 [finance-skills](https://github.com/himself65/finance-skills)（MIT）。

## 架构

```text
/analysis 页面
  → useAnalysis composable
  → POST /api/analysis/run
  → analysis-service（组装 quote / history / macro / watchlist 上下文）
  → analysis-runner（可插拔适配层）
  → AnalysisReport（统一报告结构）
```

- **Route 层**：`server/api/analysis/run.post.ts`，仅做校验与 HTTP 错误转换。
- **Service 层**：`server/utils/analysis-service.ts`，读取本地 SQLite 与 yahoo-finance2 数据。
- **Runner 层**：`server/utils/analysis-runner.ts`，当前为 `template` runner（deterministic，无需 LLM）。
- **类型契约**：`shared/types/index.ts` 中的 `AnalysisReport`、`RunAnalysisBody` 等。

## 内置 Skill 映射

| 项目 Skill ID | finance-skills 源 | 说明 |
| --- | --- | --- |
| `overview` | `yfinance-data` | 综合概览：行情、技术位、宏观、用户备注 |
| `sepa` | `sepa-strategy` | Minervini 趋势模板 8 项检查 |
| `earningsPreview` | `earnings-preview` | 财报预览框架（预估数据待接入） |
| `liquidity` | `stock-liquidity` | 成交量、换手率、流动性评级 |

## 安装 finance-skills（开发 / Cursor Agent）

在 Cursor 或 Claude Code 中安装完整 skill 库，用于开发时辅助研究：

```shell
npx skills add himself65/finance-skills -a cursor
```

或安装单个插件：

```shell
npx plugins add himself65/finance-skills --plugin finance-market-analysis
```

应用内分析**不依赖**上述 CLI 安装；它使用项目内 `analysis-runner` 与本地数据。

## 后续接入真实 AI Provider

1. 在 `nuxt.config.ts` 的 `runtimeConfig` 中配置 provider / apiKey / model。
2. 在 `server/utils/analysis-runner.ts` 新增 `openAiRunner` 等实现。
3. 启动时调用 `setAnalysisRunner(...)` 切换 provider。
4. 输出仍须符合 `AnalysisReport` schema。

## API

### POST /api/analysis/run

请求体：

```json
{
  "symbol": "AAPL",
  "skillId": "overview",
  "range": "1Y",
  "forceRefresh": true
}
```

响应：`{ "report": AnalysisReport }`

`forceRefresh` 省略时默认为 `true`；如刷新失败但本地存在缓存行情，接口会回退缓存并在 `dataGaps` 中标记。

错误：

- `400`：缺少 symbol / skillId，未知 skillId / range，或 forceRefresh 类型错误
- `404`：symbol 不存在
- `500`：分析失败

## 免责声明

本模块输出仅供个人研究参考，不构成投资建议。数据可能延迟、缺失或不准确，请自行核实。
