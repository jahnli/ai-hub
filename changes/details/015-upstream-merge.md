# 合并上游 14 个 commit（2026-06-19 快照）

**日期**: 2026-06-19

## 上游 commit 列表

```
0229dc20 refactor: refine toolbar controls and model drawer
9100e15e feat: add channel sensitive info toggle
4206d7fd feat(data-table): enhance mobile card view handling and improve layout logic
50b8f2a2 refactor: update styling and improve code readability across multiple components
a0de4b56 refactor(channels): restructure channel card into left/right columns
0467d540 chore: update frontend branding copy
29c3dcb9 feat(table): support card layout
68585568 feat(data-table): add reusable card/table view toggle
3fcd741c refactor: codex usage ui (#5595)
6bd69f3e feat(ui): enhance endpoint selection and date picker
5b4839fa chore(web): add default frontend oxc tooling (#5585)
0c806db9 refactor(theme): update color classes
490395b2 feat(performance): enhanced metrics display
6ad5dbb6 fix(main): prevent refetching on window focus to optimize performance
```

## 合并统计

- 99 文件变更，4362 新增行，1781 删除行
- 11 个冲突文件，逐一人工审查确认

## 涉及文件

### 后端（3 个，自动合并）
- `controller/codex_usage.go` — codex 用量控制器优化
- `router/api-router.go` — 新增路由
- `service/codex_wham_usage.go` — codex 用量服务重构

### 前端 default — 新工具链（6 个，新增 + 删除）
- `web/default/.oxfmtrc.json` — oxc 格式化配置（新增）
- `web/default/.oxlintrc.json` — oxc lint 配置（新增）
- `web/default/scripts/format-with-protected-headers.mjs` — 格式化脚本（新增）
- `web/default/.prettierignore` — 删除，迁移到 oxfmt
- `web/default/.prettierrc` — 删除，迁移到 oxfmt
- `web/default/eslint.config.js` — 删除，迁移到 oxlint

### 前端 default — data-table 重构（15 个）
- `web/default/src/components/data-table/core/column-pinning.ts`
- `web/default/src/components/data-table/core/data-table-view.tsx`
- `web/default/src/components/data-table/hooks/use-data-table-view-mode.ts`（新增）
- `web/default/src/components/data-table/index.ts`
- `web/default/src/components/data-table/layout/card-cell-utils.ts`（新增）
- `web/default/src/components/data-table/layout/card-grid.tsx`（新增）
- `web/default/src/components/data-table/layout/card-row-content.tsx`（新增）
- `web/default/src/components/data-table/layout/data-table-page.tsx`
- `web/default/src/components/data-table/layout/mobile-card-list.tsx`
- `web/default/src/components/data-table/static/static-data-table-classnames.ts`
- `web/default/src/components/data-table/toolbar/toolbar.tsx`
- `web/default/src/components/data-table/toolbar/view-mode-toggle.tsx`（新增）

### 前端 default — channels 重组（11 个）
- `web/default/src/features/channels/api.ts`
- `web/default/src/features/channels/components/channel-card.tsx`（新增）
- `web/default/src/features/channels/components/channel-row-actions-context.ts`（新增）
- `web/default/src/features/channels/components/channels-columns.tsx`
- `web/default/src/features/channels/components/channels-provider.tsx`
- `web/default/src/features/channels/components/channels-table.tsx`
- `web/default/src/features/channels/components/data-table-row-actions.tsx`
- `web/default/src/features/channels/components/dialogs/channel-test-dialog.tsx`
- `web/default/src/features/channels/components/dialogs/codex-usage-dialog.tsx`
- `web/default/src/features/channels/components/numeric-spinner-input.tsx`
- `web/default/src/features/channels/constants.ts`
- `web/default/src/features/channels/lib/channel-utils.ts`

### 前端 default — dashboard/通用/样式（15+ 个）
- `web/default/src/features/dashboard/` 下多个图表组件
- `web/default/src/features/models/` 下弹窗和抽屉组件
- `web/default/src/features/usage-logs/` API 和列定义
- `web/default/src/features/performance-metrics/` 格式化
- `web/default/src/features/system-settings/` 侧边栏模块
- `web/default/src/components/` 公共组件（datetime-picker, provider-badge, status-badge）
- `web/default/src/lib/helper.ts`, `web/default/src/lib/theme-customization.ts`
- `web/default/src/styles/theme-presets.css`, `web/default/src/styles/theme.css`
- `web/default/src/routes/_authenticated/` 路由调整

### 前端 default — 配置文件（5 个）
- `web/default/AGENTS.md` — 前端规范更新
- `web/default/package.json` — 依赖和脚本更新
- `web/default/scripts/sync-i18n.mjs` — i18n 脚本
- `web/default/src/i18n/locales/{en,zh,fr,ja,ru,vi}.json` — 翻译文件合并
- `web/bun.lock`, `web/package.json` — 依赖锁定

### 前端 classic（14 个）
- i18n 语言文件更新（8 个）
- 组件调整（CodexUsageModal, MjLogsActions, Footer, App, Home, Midjourney, constants, render helper）

### 项目文档（2 个，冲突解决）
- `AGENTS.md` — 融入上游代码质量、测试规范、前端规则、项目治理等新章节
- `CLAUDE.md` — 同上

## 冲突解决策略

| 文件 | 策略 | 说明 |
|------|------|------|
| `AGENTS.md` / `CLAUDE.md` | 手动合并 | 保留中文版 + 翻译融入上游新增规则 |
| `package.json` | 保留本地 | 包名差异 |
| 6 个 i18n 文件 | 手动合并 | 本地为基础 + 52 个新功能键（排除 59 个已删除功能键） |
| `theme-presets.css` | 保留本地 | 已移除预设 |
| `theme.css` | 保留本地 | 透明侧边栏 + 融入上游 table 变量 |
