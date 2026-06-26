# 数据总览页：飞书部门树筛选、统计卡片与子部门统计

**日期**: 2026-06-25

## 涉及文件

- `controller/department.go` — 部门树、部门统计、子部门统计接口控制器
- `service/feishu_department.go` — 飞书部门树拉取/缓存/权限裁剪；部门统计聚合；新增 GetSubDepartmentStats 按直接子部门并发拉取成员并批量聚合用量、getDirectChildren 辅助函数
- `model/log.go` — 部门统计聚合查询；新增 GetUserStatsBatch 按 user_id 分组批量聚合 Token/费用/请求数
- `router/api-router.go` — 新增 `/api/department/tree`、`/stats`、`/sub-stats` 管理员路由
- `web/default/src/features/data-overview/api.ts` — 部门树、统计、子部门统计 API 封装
- `web/default/src/features/data-overview/types.ts` — 部门树/统计类型；新增 SubDepartmentStat 接口
- `web/default/src/features/data-overview/index.tsx` — 数据总览页面，查询后展示统计卡片与子部门板块
- `web/default/src/features/data-overview/components/department-tree-select.tsx` — 级联展开/搜索部门树选择器
- `web/default/src/features/data-overview/components/sub-department-stats.tsx` — 子部门统计组件：列表与图表合并为单张卡片，共享标题，border-t 分隔后 tab 切换 Token 用量条形图/费用分布饼图
- `web/default/src/features/data-overview/components/usage-analysis.tsx` — 使用分析组件：单卡片内包含模型调用排行/费用占比（tab 切换条形图/饼图）+ 每日用量趋势面积图（Tokens/请求数切换）
- `web/default/src/i18n/locales/*.json` — 子部门统计、各部门 Token 用量、费用分布等翻译
