# AI 开发环境插件复原指南

> **用途**：本仓库将 `.agents/`、`.cursor/`、`plugins/` 排除在 Git 之外。在新机器 clone 后，按本文复原本地 AI 插件配置。
>
> **给 AI 的说明**：若用户要求「按文档复原 AI 插件」，请严格按下方 **一键复原（Codex）** 或 **一键复原（Cursor）** 执行；不要把这些目录提交到 Git。

## 背景

| 路径 | 作用 | 是否进 Git |
|------|------|------------|
| `plugins/supabase/` | Supabase 官方 Codex 插件本地副本（v0.1.4） | 否 |
| `.agents/plugins/marketplace.json` | Codex 本地 marketplace，指向 `plugins/supabase` | 否 |
| `.cursor/settings.json` | Cursor 启用 Supabase 插件 | 否 |

**注意**：`stock-panel` 应用运行时数据库已迁移到 **Supabase Postgres**。这些插件用于 AI 辅助开发和数据库维护；业务表仍只应由 Nuxt server routes 访问，不通过前端直接读写。

## 前置条件

- 已 `git clone` 本仓库并在项目根目录操作
- **Codex**：已安装 [Codex](https://codex.openai.com) CLI 或 IDE 扩展
- **Cursor**：已安装 [Cursor](https://cursor.com)
- Node.js >= 22（与项目一致）
- 有 Supabase 账号（使用 MCP 连接数据库时需要 OAuth 授权）

---

## 一键复原（Codex）

在**项目根目录**执行（Windows PowerShell / macOS / Linux 均可）：

```bash
# 1. 拉取 Supabase Codex 插件（固定 v0.1.4）
mkdir -p plugins
git clone --depth 1 --branch v0.1.4 https://github.com/supabase-community/codex-plugin.git plugins/supabase
cd plugins/supabase && git submodule update --init --recursive && cd ../..

# 2. 创建 Codex 本地 marketplace
mkdir -p .agents/plugins
```

将以下内容写入 `.agents/plugins/marketplace.json`：

```json
{
  "name": "stock-panel-local",
  "interface": {
    "displayName": "Stock Panel Local"
  },
  "plugins": [
    {
      "name": "supabase",
      "source": {
        "source": "local",
        "path": "./plugins/supabase"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Coding"
    }
  ]
}
```

```bash
# 3.（可选）配置 Supabase MCP — 将 YOUR_PROJECT_REF 换成你的 Supabase project ref
codex mcp add supabase --url "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true"
codex mcp login supabase

# 4. 在 Codex 中安装/启用本地 Supabase 插件（按 Codex UI 提示完成 OAuth）
```

### Codex 验证

- [ ] `plugins/supabase/.codex-plugin/plugin.json` 存在，版本为 `0.1.4`
- [ ] `plugins/supabase/skills/supabase/SKILL.md` 存在
- [ ] Codex 插件列表中能看到 **Supabase**
- [ ] （若已配置 MCP）`codex mcp list` 显示 `supabase` 已连接

---

## 一键复原（Cursor）

Cursor 不需要 vendoring `plugins/supabase`，推荐用官方方式安装。

### 方式 A：Marketplace 插件（推荐）

1. 打开 Cursor → **Customize**（侧边栏）→ **Plugins**
2. 搜索 **Supabase** → 安装（Scope 选 **Project** 仅当前仓库，或 **User** 全局）
3. 按提示完成 Supabase OAuth 授权
4. 将以下内容写入 `.cursor/settings.json`（若文件已存在则合并 `plugins` 字段）：

```json
{
  "plugins": {
    "supabase": {
      "enabled": true
    }
  }
}
```

### 方式 B：仅 MCP（不装完整插件）

创建 `.cursor/mcp.json`：

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF&read_only=true"
    }
  }
}
```

将 `YOUR_PROJECT_REF` 替换为 Supabase Dashboard → Project Settings → General 中的 **Reference ID**。

然后在 **Settings → Tools & MCP** 中启用 `supabase` 并完成 OAuth。

### 方式 C：仅 Agent Skills（无 MCP）

```bash
npx skills add supabase/agent-skills
```

默认安装到项目级 `.agents/skills/` 或工具检测到的 skills 目录；可加 `--global` 装到用户目录。

### Cursor 验证

- [ ] **Settings → Tools & MCP** 中 Supabase 显示已连接（若配置了 MCP）
- [ ] Composer / Agent 中输入 `@` 能看到 Supabase 相关 tools
- [ ] `.cursor/settings.json` 中 `supabase.enabled` 为 `true`（若使用方式 A）

---

## 给 AI 的执行清单（复制即用）

当用户说「帮我按 AI_PLUGINS_SETUP 复原环境」时，按顺序执行：

1. 确认当前目录为 `stock-panel` 仓库根目录
2. 检查 `.gitignore` 已包含 `.agents/`、`.cursor/`、`plugins/`（勿提交这些目录）
3. **若用户使用 Codex**：执行「一键复原（Codex）」全部命令；询问用户 `YOUR_PROJECT_REF`（可选）
4. **若用户使用 Cursor**：优先方式 A；若无 Marketplace 则用方式 B + 可选方式 C
5. 运行验证清单，向用户报告未完成项
6. **不要** `git add` `.agents/`、`.cursor/`、`plugins/`

---

## 更新插件版本

```bash
# Codex 本地插件：拉取新版本（示例升级到 v0.1.5）
rm -rf plugins/supabase
git clone --depth 1 --branch v0.1.5 https://github.com/supabase-community/codex-plugin.git plugins/supabase
cd plugins/supabase && git submodule update --init --recursive && cd ../..

# Cursor Skills
npx skills add supabase/agent-skills --force
```

版本号以 [codex-plugin Releases](https://github.com/supabase-community/codex-plugin/releases) 为准。

---

## 安全建议

- MCP 默认使用 `read_only=true`，避免 Agent 误改生产数据
- 用 `project_ref` 限定单个 Supabase 项目
- 不要将 Personal Access Token 写入可提交的文件；优先 OAuth
- 本应用数据库为 Supabase Postgres；使用 MCP 时优先保持 `read_only=true`，需要执行 migration 或写操作时再显式切换权限

---

## 参考链接

- [Supabase Plugin for AI Coding Agents](https://supabase.com/docs/guides/ai-tools/plugins)
- [Supabase MCP Server](https://supabase.com/docs/guides/ai-tools/mcp)
- [Supabase Agent Skills](https://supabase.com/docs/guides/ai-tools/ai-skills)
- [codex-plugin](https://github.com/supabase-community/codex-plugin)
- [cursor-plugin](https://github.com/supabase-community/cursor-plugin)
