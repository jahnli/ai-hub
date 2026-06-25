# 新增数据总览页：支持飞书部门树筛选、日期范围查询与部门用量统计卡片

**日期**: 2026-06-25

## 涉及文件

- `controller/department.go` — 新增部门树与部门统计接口控制器，校验查询参数并返回统一 JSON 响应。
- `service/feishu_department.go` — 新增飞书部门树拉取、租户信息读取、缓存、权限裁剪，以及按部门及子部门匹配用户后查询统计数据的服务逻辑；后续重构改用飞书通讯录 API 实时获取部门成员 open_id 列表，匹配本地用户表计算已注册/未注册员工数。
- `model/log.go` — 新增部门统计聚合查询，按时间范围统计总 Token、累计消耗、请求次数、平均响应时间、错误率与每百万 Token 均价；新增 RegisteredUsers 和 UnregisteredUsers 字段用于统计部门员工注册情况。
- `router/api-router.go` — 新增 `/api/department/tree` 与 `/api/department/stats` 管理员接口路由。
- `web/default/src/features/data-overview/api.ts` — 新增部门树与部门统计的前端 API 封装。
- `web/default/src/features/data-overview/types.ts` — 新增部门树、租户信息与部门统计响应类型；新增 registered_users 和 unregistered_users 字段。
- `web/default/src/features/data-overview/index.tsx` — 新增数据总览页面，复用日志日期范围选择器，点击查询后展示统计卡片；新增已注册员工数与未注册员工数两张卡片。
- `web/default/src/features/data-overview/components/department-tree-select.tsx` — 新增支持级联展开和搜索的部门树选择器。
- `web/default/src/routes/_authenticated/data-overview/index.tsx` — 新增管理员数据总览前端路由与权限拦截。
- `web/default/src/hooks/use-sidebar-data.ts` — 管理员侧边栏新增数据总览入口。
- `web/default/src/routeTree.gen.ts` — 更新 TanStack Router 生成路由树，注册数据总览页面。
- `web/default/src/i18n/locales/en.json`、`web/default/src/i18n/locales/zh.json`、`web/default/src/i18n/locales/fr.json`、`web/default/src/i18n/locales/ja.json`、`web/default/src/i18n/locales/ru.json`、`web/default/src/i18n/locales/vi.json` — 补充数据总览、部门选择、查询统计与统计卡片相关文案；新增已注册员工数与未注册员工数翻译。
