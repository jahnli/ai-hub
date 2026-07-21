# 新增在线生图功能

**日期**: 2026-07-21

## 涉及文件

- `controller/playground.go` — 将 Playground 中继抽为可复用逻辑，新增图片格式的 Playground 入口。
- `router/relay-router.go` — 新增 `/pg/images/generations` 和 `/pg/images/edits` 路由。
- `middleware/distributor.go` — 让 Playground 图片生成/编辑请求参与模型解析和 relay mode 设置。
- `relay/constant/relay_mode.go` — 支持将 Playground 图片路径识别为图片生成/编辑模式。
- `web/default/src/features/image-studio/` — 新增在线生图前端功能，包含参数配置、生成/编辑面板、结果展示、历史记录、提示词预设和本地存储；补充 gpt-image-2 参数适配、模型专属参数、4K 尺寸预设、自定义尺寸校验、最多 4 张生成、生成进度与停止按钮展示，并让结果参数值支持翻译；生成/编辑请求不再发送 n 参数，多张生成改为并行单图请求，部分失败时保留成功图片、显示灰色失败占位并汇总消费日志，不再弹出 warning toast。
- `web/default/src/routes/_authenticated/image-studio/index.tsx` — 新增在线生图认证路由。
- `web/default/src/hooks/use-sidebar-config.ts` — 注册在线生图路由对应的侧边栏配置。
- `web/default/src/hooks/use-sidebar-data.ts` — 在快捷方式分组中新增“在线生图”入口。
- `web/default/src/routeTree.gen.ts` — 更新 TanStack Router 生成路由树。
- `web/default/package.json`、`web/bun.lock` — 新增前端依赖以支持在线生图功能。
- `relay/image_handler.go`、`constant/context_key.go`、`service/text_quota.go` — 图片生成消费日志写入结构化参数详情，覆盖尺寸、品质、生成数量、背景、输出格式、输出压缩、审核敏感度、水印等配置。
- `relay/helper/valid_request.go` — 图片请求校验新增生成数量上限，超过 4 张时直接拒绝。
- `web/default/src/features/usage-logs/components/dialogs/details-dialog.tsx`、`web/default/src/features/usage-logs/types.ts` — 使用日志详情新增图片参数区块，按结构化字段本地化展示图片生成配置。
- `relay/channel/openai/adaptor.go`、`relay/channel/openai/image_edit_test.go` — OpenAI 图生图支持将前端 JSON data URL 图片转换为 multipart 文件上传，补齐 Content-Length 并增加回归测试，避免上游空图或 EOF。
- `web/default/src/features/image-studio/index.tsx`、`web/default/src/features/image-studio/lib/image-utils.ts` — 历史生成结果支持一键带入图生图，远程图片会先转换为 data URL；重置时清空提示词、参考图、当前结果与错误。
- `web/default/src/features/image-studio/components/generate-panel.tsx`、`web/default/src/features/image-studio/components/result-grid.tsx` — 生成进度文案移除单图预估时间，思考动画加快，清空按钮改为重置。
- `web/default/src/i18n/locales/*.json`、`web/default/src/i18n/locales/_reports/*.json`、`web/default/src/i18n/locales/_extras/*.json` — 补齐图片参数日志详情和并行生成失败占位文案的多语言翻译，并更新同步报告、清理过期额外翻译清单。
- `model/image_studio.go` — 新增 ImageStudioGeneration 数据库模型，含图片元数据（尺寸、格式、大小）和收藏/用量字段，CRUD 方法支持按用户分页查询、收藏标记、用量更新和删除。
- `controller/image_studio_storage.go`、`controller/image_studio_storage_backend.go` — 图片存储由本地磁盘迁移至 MinIO，支持通过环境变量配置 Bucket，对象统一写入 `image` 目录，并继续通过 API 提供访问、删除等能力。
- `controller/image_studio_storage_backend_test.go` — 验证 MinIO 对象目录为 `image`，并验证使用环境变量配置的 Bucket。
- `.env.example`、`docker-compose.yml` — 补充在线生图 MinIO 连接信息和 Bucket 环境变量配置。
- `go.mod`、`go.sum` — 引入 MinIO Go SDK 依赖。
- `model/main.go` — 注册 ImageStudioGeneration 模型的数据库迁移。
- `router/api-router.go` — 注册 /api/image-studio 路由组（CRUD + 静态文件访问）。
- `web/default/src/features/image-studio/api.ts` — 新增服务端存储相关 API 调用函数（store/list/delete/clear/favorite/usage）。
- `web/default/src/features/image-studio/types.ts` — 新增服务端数据类型定义（ImageStudioGenerationRecord、StoreImageStudioGenerationPayload 等），并从上游生图请求类型移除 n 字段，保留历史记录中的请求总数和失败图片数量元数据。
- `web/default/src/features/image-studio/lib/storage.ts` — 历史记录存储层重构为调用服务端 API，移除 localStorage 实现；根据请求总数与成功图片数恢复失败占位数量。
- `web/default/src/features/image-studio/hooks/use-image-studio.ts` — 生成完成后调用服务端存储 API 持久化图片，返回服务端 URL 替代 data URL；多张生成按所选数量并行发送不带 n 的单图请求，聚合成功结果、失败数量和各请求消费日志，并移除部分失败 warning toast。
- `web/default/src/features/image-studio/hooks/use-generation-history.ts` — 历史加载改为从服务端 API 获取。
- `web/default/src/features/image-studio/components/result-grid.tsx` — 结果网格适配服务端图片 URL 展示；部分请求失败时追加等量灰色“生图失败”占位卡；大图预览将图片与提示词框统一为最大 960px/92vw 宽度，图片、提示词和操作栏作为整体按视口居中，优化三部分间距并保持缩放与旋转操作。
- `web/default/src/features/image-studio/components/history-panel.tsx` — 历史面板适配服务端数据结构。
- `web/default/src/features/image-studio/constants.ts` — 新增 IMAGE_STUDIO_GENERATIONS API 端点常量；在线生图最大生成数量改为 4。
- `controller/security_audit.go`、`router/api-router.go` — 新增管理员图片审计分页接口与路由，支持按时间范围、用户名和显示名筛选。
- `model/image_studio.go` — 图片生成记录新增安全审计查询，关联用户展示信息并批量加载图片资源，兼容 SQLite、MySQL 和 PostgreSQL。
- `web/default/src/features/security-audit/` — 安全审计新增图片审计页，提供日期与用户筛选、图片缩略图及大图预览、请求内容 Tooltip、生成详情、图片下载和分页；生成详情与请求内容弹框统一为最大 78rem、视口 85% 高度，头像和用户资料展示保持一致并放大详情文字，图片数量改为主题色标签；审计大图预览同步统一图片和提示词宽度、视口居中及三部分间距。
- `web/default/src/i18n/locales/*.json`、`web/default/src/i18n/locales/_reports/*.json` — 补充图片审计界面多语言文案并更新同步报告。
