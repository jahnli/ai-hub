# 变更日志

仅记录二开修改，用于未来与上游合并时快速定位差异。每次 AI 完成的实质性代码变更，在此文件追加一行。

| 日期 | 说明 | 涉及文件 | 与上游差异 | 合并指引 |
|------|------|---------|-----------|---------|
| 2026-06-18 | 启动默认主题改为 default | `common/constants.go`（`init()` 中 `themeValue.Store("classic")` → `"default"`）、`setting/system_setting/theme.go`（`Frontend: "classic"` → `"default"`） | 二开变更 | 保留 |
| 2026-06-18 | 全局品牌重命名 New API → AI Hub | 后端 Go（SystemName/CLI/类型名 `NewAPIError→AIHubError`/error type 字符串/Redis 命名空间/缓存目录/User-Agent/DocsLink→飞书）、部署（Dockerfile 产物名/docker-compose 服务名镜像名/makefile）、CI workflows（Docker 镜像→`quantumnous/ai-hub`/release 产物名/Gitee/issue 模板链接→飞书）、Electron（包名/appId/extraResources）、前端 web/default（title/品牌文案/i18n 6 语言键值/常量标识/文档链接→飞书）、README 全部语言版本。**未改**：`go.mod` import path、上游 API 路径 `/api/newapi/`、GitHub 更新检查 API、HTTP-Referer、`X-Oneapi-Request-Id` | 二开变更 | 检查 |
| 2026-06-18 | 移除主页底部 Footer 组件 | `web/default/src/features/home/index.tsx`（删除 `Footer` import 及 `<Footer />` 渲染）、`web/default/src/components/layout/components/footer.tsx`（删除整个文件） | 二开变更 | 保留 |
| 2026-06-19 | 删除已废弃的 Footer 组件翻译 key | `web/default/src/i18n/locales/{en,zh,fr,ja,ru,vi}.json`（删除 `footer.columns.*`、`footer.defaultCopyright`、`footer.newapi.projectAttributionSuffix` 共 14 key × 6 语言） | 二开变更 | 保留 |
