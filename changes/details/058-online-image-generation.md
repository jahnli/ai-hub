# 新增在线生图功能

**日期**: 2026-07-03

## 涉及文件

- `controller/playground.go` — 将 Playground 中继抽为可复用逻辑，新增图片格式的 Playground 入口。
- `router/relay-router.go` — 新增 `/pg/images/generations` 和 `/pg/images/edits` 路由。
- `middleware/distributor.go` — 让 Playground 图片生成/编辑请求参与模型解析和 relay mode 设置。
- `relay/constant/relay_mode.go` — 支持将 Playground 图片路径识别为图片生成/编辑模式。
- `web/default/src/features/image-studio/` — 新增在线生图前端功能，包含参数配置、生成/编辑面板、结果展示、历史记录、提示词预设和本地存储。
- `web/default/src/routes/_authenticated/image-studio/index.tsx` — 新增在线生图认证路由。
- `web/default/src/hooks/use-sidebar-config.ts` — 注册在线生图路由对应的侧边栏配置。
- `web/default/src/hooks/use-sidebar-data.ts` — 在快捷方式分组中新增“在线生图”入口。
- `web/default/src/routeTree.gen.ts` — 更新 TanStack Router 生成路由树。
- `web/default/package.json`、`web/bun.lock` — 新增前端依赖以支持在线生图功能。
- `web/default/src/i18n/locales/*.json` — 新增在线生图相关 6 语言翻译，并将原“图像工作台”文案调整为“在线生图”。
- `web/default/src/i18n/locales/_reports/*.json` — 更新 i18n 同步报告。
