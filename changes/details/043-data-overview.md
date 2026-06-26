# 数据总览页：飞书部门树筛选、统计卡片、子部门统计与使用分析

**日期**: 2026-06-25 ~ 06-26

## 涉及文件

- `controller/department.go` — 部门树、部门统计、子部门统计接口控制器
- `service/feishu_department.go` — 飞书部门树拉取/缓存/权限裁剪；部门统计聚合；新增 GetSubDepartmentStats 按直接子部门并发拉取成员并批量聚合用量、getDirectChildren 辅助函数；UsageAnalysisResponse 新增 ModelDailyStats 字段，并发查询模型每日统计
- `model/log.go` — 部门统计聚合查询；新增 GetUserStatsBatch 按 user_id 分组批量聚合 Token/费用/请求数；新增 ModelDailyStatRow 与 GetModelDailyStats 按模型按天聚合 Token 统计（支持 MySQL/SQLite/PostgreSQL/ClickHouse）
- `router/api-router.go` — 新增 `/api/department/tree`、`/stats`、`/sub-stats` 管理员路由
- `web/default/src/features/data-overview/api.ts` — 部门树、统计、子部门统计 API 封装
- `web/default/src/features/data-overview/types.ts` — 部门树/统计类型；新增 SubDepartmentStat、ModelDailyStat 接口
- `web/default/src/features/data-overview/index.tsx` — 数据总览页面：查询后展示统计卡片与子部门板块；新增各板块加载骨架屏；Token 格式化改为中文单位（亿/万）
- `web/default/src/features/data-overview/components/department-tree-select.tsx` — 级联展开/搜索部门树选择器
- `web/default/src/features/data-overview/components/sub-department-stats.tsx` — 子部门统计组件：柱状图改为纵向、坐标轴格式化大数值；表头「用户数」改为「已注册/总人数」居中对齐
- `web/default/src/features/data-overview/components/usage-analysis.tsx` — 使用分析组件：模型排行/费用占比（tab 切换条形图/饼图）改为纵向柱状图；新增模型使用趋势折线图（ModelUsageTrend，按 Top N 模型展示每日 Token 量）；每日用量趋势新增「费用」指标切换；新增均价趋势折线图（AvgPriceTrendChart，计算每日平均单价并补全无数据日期）
- `web/default/src/hooks/use-sidebar-config.ts` — 侧边栏配置新增 data_overview 模块及 URL 映射
- `web/default/src/hooks/use-sidebar-data.ts` — 「数据总览」菜单从管理员分区移至控制台分区，添加 requiredRole ADMIN
- `web/default/src/i18n/locales/*.json` — 新增 Model Usage Trend、Avg Price Trend、Registered/Total、Total Requests 等翻译（6 语言）
