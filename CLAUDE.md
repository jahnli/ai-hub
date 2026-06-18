# CLAUDE.md — 项目规范

## 概述

这是一个基于 Go 构建的 AI API 网关/代理。它将 40 多个上游 AI 提供商（OpenAI、Claude、Gemini、Azure、AWS Bedrock 等）聚合在统一的 API 之后，并提供用户管理、计费、速率限制和管理后台。

## 技术栈

- **后端**: Go 1.22+、Gin Web 框架、GORM v2 ORM
- **前端**: React 19、TypeScript、Rsbuild、Base UI、Tailwind CSS
- **数据库**: SQLite、MySQL、PostgreSQL（三者必须同时支持）
- **缓存**: Redis (go-redis) + 内存缓存
- **认证**: JWT、WebAuthn/Passkeys、OAuth（GitHub、Discord、OIDC 等）
- **前端包管理器**: Bun（优先于 npm/yarn/pnpm）

## 架构

分层架构: Router -> Controller -> Service -> Model

```
router/        — HTTP 路由（API、relay、dashboard、web）
controller/    — 请求处理器
service/       — 业务逻辑
model/         — 数据模型与数据库访问（GORM）
relay/         — AI API 中继/代理及提供商适配器
  relay/channel/ — 各提供商适配器（openai/、claude/、gemini/、aws/ 等）
middleware/    — 认证、速率限制、CORS、日志、分发
setting/       — 配置管理（ratio、model、operation、system、performance）
common/        — 共享工具（JSON、加密、Redis、环境变量、速率限制等）
dto/           — 数据传输对象（请求/响应结构体）
constant/      — 常量（API 类型、渠道类型、上下文键）
types/         — 类型定义（relay 格式、文件来源、错误）
i18n/          — 后端国际化（go-i18n，en/zh）
oauth/         — OAuth 提供商实现
pkg/           — 内部包（cachex、ionet）
web/             — 前端主题容器
 web/default/   — 默认前端（React 19、Rsbuild、Base UI、Tailwind）
  web/classic/   — 经典前端（React 18、Vite、Semi Design）
  web/default/src/i18n/ — 前端国际化（i18next，zh/en/fr/ru/ja/vi）
```

## 国际化 (i18n)

### 后端 (`i18n/`)

- 库: `nicksnyder/go-i18n/v2`
- 语言: en、zh

### 前端 (`web/default/src/i18n/`)

- 库: `i18next` + `react-i18next` + `i18next-browser-languagedetector`
- 语言: en（基础）、zh（兜底）、fr、ru、ja、vi
- 翻译文件: `web/default/src/i18n/locales/{lang}.json` — 扁平 JSON，键为英文原文
- 用法: `useTranslation()` hook，在组件中调用 `t('English key')`
- CLI 工具: `bun run i18n:sync`（在 `web/default/` 目录下执行）

## 规则

### 规则 1: JSON 包 — 使用 `common/json.go`

所有 JSON 序列化/反序列化操作必须使用 `common/json.go` 中的封装函数：

- `common.Marshal(v any) ([]byte, error)`
- `common.Unmarshal(data []byte, v any) error`
- `common.UnmarshalJsonStr(data string, v any) error`
- `common.DecodeJson(reader io.Reader, v any) error`
- `common.GetJsonType(data json.RawMessage) string`

禁止在业务代码中直接导入或调用 `encoding/json`。这些封装函数旨在保持一致性并为未来扩展预留空间（例如切换到更快的 JSON 库）。

注意: `json.RawMessage`、`json.Number` 等 `encoding/json` 中的类型定义仍可作为类型引用，但实际的序列化/反序列化调用必须通过 `common.*` 进行。

### 规则 2: 数据库兼容性 — SQLite、MySQL >= 5.7.8、PostgreSQL >= 9.6

所有数据库代码必须同时兼容三种数据库。

**使用 GORM 抽象：**

- 优先使用 GORM 方法（`Create`、`Find`、`Where`、`Updates` 等），避免裸 SQL。
- 让 GORM 处理主键生成 — 不要直接使用 `AUTO_INCREMENT` 或 `SERIAL`。

**当裸 SQL 不可避免时：**

- 列引用方式不同：PostgreSQL 使用 `"column"`，MySQL/SQLite 使用 `` `column` ``。
- 对 `group` 和 `key` 等保留字列，使用 `model/main.go` 中的 `commonGroupCol`、`commonKeyCol` 变量。
- 布尔值不同：PostgreSQL 使用 `true`/`false`，MySQL/SQLite 使用 `1`/`0`。使用 `commonTrueVal`/`commonFalseVal`。
- 使用 `common.UsingPostgreSQL`、`common.UsingSQLite`、`common.UsingMySQL` 标志来分支特定数据库逻辑。

**禁止在没有跨数据库兜底的情况下使用：**

- MySQL 专有函数（例如 `GROUP_CONCAT` 而没有 PostgreSQL 的 `STRING_AGG` 对应）
- PostgreSQL 专有操作符（例如 `@>`、`?`、`JSONB` 操作符）
- SQLite 中的 `ALTER COLUMN`（不支持 — 使用添加列的变通方案）
- 没有兜底的数据库专有列类型 — JSON 存储使用 `TEXT` 而非 `JSONB`

**迁移：**

- 确保所有迁移在三种数据库上都能运行。
- 对于 SQLite，使用 `ALTER TABLE ... ADD COLUMN` 而非 `ALTER COLUMN`（参见 `model/main.go` 中的模式）。

### 规则 3: 新渠道 StreamOptions 支持

实现新渠道时：

- 确认提供商是否支持 `StreamOptions`。
- 如果支持，将该渠道添加到 `streamSupportedChannels`。

### 规则 4: 上游中继请求 DTO — 保留显式零值

对于从客户端 JSON 解析后再重新序列化到上游提供商的请求结构体（特别是 relay/convert 路径）：

- 可选标量字段必须使用指针类型配合 `omitempty`（例如 `*int`、`*uint`、`*float64`、`*bool`），而非非指针标量。
- 语义必须为：
  - 客户端 JSON 中字段不存在 => `nil` => 序列化时省略；
  - 字段显式设为零值/false => 非 `nil` 指针 => 仍必须发送到上游。
- 避免对可选请求参数使用非指针标量配合 `omitempty`，因为零值（`0`、`0.0`、`false`）会在序列化时被静默丢弃。

### 规则 5: 计费表达式系统 — 先阅读 `pkg/billingexpr/expr.md`

处理分级/动态计费（基于表达式的定价）时，必须先阅读 `pkg/billingexpr/expr.md`。该文档描述了设计理念、表达式语言（变量、函数、示例）、完整系统架构（编辑器 → 存储 → 预消费 → 结算 → 日志展示）、token 归一化规则（`p`/`c` 自动排除）、配额转换和表达式版本控制。所有对计费表达式系统的代码修改都必须遵循该文档中描述的模式。

### 规则 6: 变更日志 — 自动记录实质性变更

当你在本项目中完成**实质性代码变更**后，**必须**在 `docs/changes/` 中创建变更记录。

**触发条件（满足任一即触发）：**

- 新增功能或 API 端点
- 修改已有业务逻辑（不含纯格式化/注释）
- 修复 Bug
- 跨多文件重构
- 新增或修改数据库模型/迁移
- 修改前端页面或组件行为

**不触发的情况：**

- 仅回答问题、阅读/探索代码
- 纯格式化、注释或文档修改
- 依赖版本更新（除非涉及 breaking change 适配）
- 编辑变更文档本身

**完成代码变更后的步骤：**

在 `docs/changes/CHANGELOG.md` 表格末尾追加一行：

| YYYY-MM-DD | 一句话说明 | `file.go`（具体改动，如字段/值：旧→新）、`file2.go`（...） | 二开变更 / 与上游一致 | 保留 / 检查 / 可丢弃 |

- **涉及文件**：列出路径并在括号内注明具体改动，方便合并时看懂冲突
- **与上游差异**：二开变更需简述与上游的不同
- **合并指引**：保留（长期二开）、检查（上游更新后确认是否仍需）、可丢弃（上游已支持或临时方案）
