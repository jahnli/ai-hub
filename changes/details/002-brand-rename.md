# 全局品牌重命名 New API → AI Hub

**日期**: 2026-06-18

## 涉及文件

- 后端 Go: `SystemName` / CLI / 类型名 `NewAPIError` → `AIHubError` / error type 字符串 / Redis 命名空间 / 缓存目录 / User-Agent / DocsLink → 飞书
- 部署: Dockerfile 产物名 / docker-compose 服务名镜像名 / makefile
- CI workflows: Docker 镜像 → `quantumnous/ai-hub` / release 产物名 / Gitee / issue 模板链接 → 飞书
- Electron: 包名 / appId / extraResources
- 前端 web/default: title / 品牌文案 / i18n 6 语言键值 / 常量标识 / 文档链接 → 飞书
- README 全部语言版本

## 未改

- `go.mod` import path
- 上游 API 路径 `/api/newapi/`
- GitHub 更新检查 API
- HTTP-Referer
- `X-Oneapi-Request-Id`
