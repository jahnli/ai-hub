# SSRF 防护

**日期**: 2026-07-07

## 涉及文件

- `common/ssrf_protection.go` — 新增 SSRF 防护校验，拦截私有地址、回环地址等不安全目标。
- `common/ssrf_protection_test.go` — 覆盖 SSRF 防护地址校验的关键用例。
- `controller/video_proxy.go` — 视频代理请求接入受保护的 HTTP 访问流程，避免代理内网资源。
- `relay/mjproxy_handler.go` — Midjourney 代理相关远程资源访问接入 SSRF 防护。
- `service/download.go` — 下载服务改用受保护请求，限制不安全 URL。
- `service/http_client.go` — HTTP 客户端统一接入 SSRF 防护能力。
- `service/protected_fetch_client.go` — 新增受保护的远程资源获取客户端。
- `service/protected_fetch_client_test.go` — 覆盖受保护获取客户端的安全校验行为。
- `service/user_notify.go` — 用户通知中的外部请求接入 SSRF 防护。
- `service/webhook.go` — Webhook 请求接入 SSRF 防护，避免向内网或本地地址发送请求。
