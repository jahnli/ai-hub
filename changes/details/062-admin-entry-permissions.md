# 管理入口权限收紧

**日期**: 2026-07-05

## 涉及文件

- `web/default/src/hooks/use-sidebar-data.ts` — 渠道、模型、订阅管理、系统信息和系统设置入口增加超级管理员角色限制，普通管理员不再看到对应左侧菜单。
- `web/default/src/routes/_authenticated/channels/index.tsx` — 渠道路由访问权限收紧为仅超级管理员，非超级管理员跳转 403。
- `web/default/src/routes/_authenticated/subscriptions/index.tsx` — 订阅管理路由访问权限收紧为仅超级管理员，非超级管理员跳转 403。
- `web/default/src/routes/_authenticated/models/index.tsx` — 模型管理默认入口访问权限收紧为仅超级管理员。
- `web/default/src/routes/_authenticated/models/$section.tsx` — 模型管理分区路由访问权限收紧为仅超级管理员。
