# 新增在线生图功能

**日期**: 2026-07-04

## 涉及文件

- `controller/playground.go` — 将 Playground 中继抽为可复用逻辑，新增图片格式的 Playground 入口。
- `router/relay-router.go` — 新增 `/pg/images/generations` 和 `/pg/images/edits` 路由。
- `middleware/distributor.go` — 让 Playground 图片生成/编辑请求参与模型解析和 relay mode 设置。
- `relay/constant/relay_mode.go` — 支持将 Playground 图片路径识别为图片生成/编辑模式。
- `web/default/src/features/image-studio/` — 新增在线生图前端功能，包含参数配置、生成/编辑面板、结果展示、历史记录、提示词预设和本地存储；补充 gpt-image-2 参数适配、模型专属参数、4K 尺寸预设、自定义尺寸校验、最多 8 张生成、生成进度与停止按钮展示，并让结果参数值支持翻译。
- `web/default/src/routes/_authenticated/image-studio/index.tsx` — 新增在线生图认证路由。
- `web/default/src/hooks/use-sidebar-config.ts` — 注册在线生图路由对应的侧边栏配置。
- `web/default/src/hooks/use-sidebar-data.ts` — 在快捷方式分组中新增“在线生图”入口。
- `web/default/src/routeTree.gen.ts` — 更新 TanStack Router 生成路由树。
- `web/default/package.json`、`web/bun.lock` — 新增前端依赖以支持在线生图功能。
- `relay/image_handler.go`、`constant/context_key.go`、`service/text_quota.go` — 图片生成消费日志写入结构化参数详情，覆盖尺寸、品质、生成数量、背景、输出格式、输出压缩、审核敏感度、水印等配置。
- `web/default/src/features/usage-logs/components/dialogs/details-dialog.tsx`、`web/default/src/features/usage-logs/types.ts` — 使用日志详情新增图片参数区块，按结构化字段本地化展示图片生成配置。
- `relay/channel/openai/adaptor.go`、`relay/channel/openai/image_edit_test.go` — OpenAI 图生图支持将前端 JSON data URL 图片转换为 multipart 文件上传，补齐 Content-Length 并增加回归测试，避免上游空图或 EOF。
- `web/default/src/features/image-studio/index.tsx`、`web/default/src/features/image-studio/lib/image-utils.ts` — 历史生成结果支持一键带入图生图，远程图片会先转换为 data URL；重置时清空提示词、参考图、当前结果与错误。
- `web/default/src/features/image-studio/components/generate-panel.tsx`、`web/default/src/features/image-studio/components/result-grid.tsx` — 生成进度文案移除单图预估时间，思考动画加快，清空按钮改为重置。
- `web/default/src/i18n/locales/*.json`、`web/default/src/i18n/locales/_reports/*.json` — 补齐图片参数日志详情相关 6 语言翻译并更新同步报告。
