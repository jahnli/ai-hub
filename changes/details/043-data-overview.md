# 数据总览页：飞书部门树筛选、统计卡片、子部门统计与使用分析

**日期**: 2026-06-25 ~ 06-30

## 涉及文件

- `controller/department.go` — 部门树、部门统计、子部门统计、用户排行接口控制器
- `service/feishu_department.go` — 飞书部门树拉取/缓存/权限裁剪；部门统计聚合；新增 GetSubDepartmentStats 按直接子部门并发拉取成员并批量聚合用量、getDirectChildren 辅助函数；UsageAnalysisResponse 新增 ModelDailyStats 字段，并发查询模型每日统计；新增 GetDepartmentUserRankings 返回部门内用户消耗 Top 10 排行；部门用户列表支持按数据库字段和计算用量列排序
- `model/log.go` — 部门统计聚合查询；新增 GetUserStatsBatch 按 user_id 分组批量聚合 Token/费用/请求数；新增 ModelDailyStatRow 与 GetModelDailyStats 按模型按天聚合 Token 统计（支持 MySQL/SQLite/PostgreSQL/ClickHouse）
- `model/user.go` — 新增 GetUserIDAndNamesByOpenIDs 按 open_id 批量查询用户 ID 和姓名
- `router/api-router.go` — 新增 `/api/department/tree`、`/stats`、`/sub-stats`、`/user-rankings` 路由
- `web/default/src/features/data-overview/api.ts` — 部门树、统计、子部门统计、用户排行 API 封装；部门用户列表 API 透传排序字段和方向
- `web/default/src/features/data-overview/types.ts` — 部门树/统计类型；新增 SubDepartmentStat、ModelDailyStat、UserRankingItem 接口
- `web/default/src/features/data-overview/index.tsx` — 数据总览页面：查询后展示统计卡片与子部门板块；各板块加载骨架屏；Token 格式化改为中文单位（亿/万）；统计卡片从 Card 网格改为分割式紧凑布局（参照数据看板 LogStatCards 风格：单行 border 容器、divide-x 分隔、图标+大写标签+等宽数字+描述行），移除外层 Card 包裹
- `web/default/src/features/data-overview/components/department-tree-select.tsx` — 级联展开/搜索部门树选择器
- `web/default/src/features/data-overview/components/department-users-table.tsx` — 部门用户表格，内嵌用户消耗排行图表；启用手动服务端排序，排序变化时重置到第一页
- `web/default/src/features/data-overview/components/user-consumption-charts.tsx` — 用户消耗排行 Top 10（水平柱状图）和用户消耗占比 Top 10（环形饼图），并排展示
- `web/default/src/features/data-overview/components/sub-department-stats.tsx` — 子部门统计组件：柱状图改为纵向、坐标轴格式化大数值；表头「用户数」改为「已注册/总人数」居中对齐
- `web/default/src/features/data-overview/components/usage-analysis.tsx` — 使用分析组件：模型排行/费用占比（tab 切换条形图/饼图）改为纵向柱状图；新增模型使用趋势折线图（ModelUsageTrend，按 Top N 模型展示每日 Token 量）；每日用量趋势新增「费用」指标切换；新增均价趋势折线图（AvgPriceTrendChart，计算每日平均单价并补全无数据日期）
- `web/default/src/hooks/use-sidebar-config.ts` — 侧边栏配置新增 data_overview 模块及 URL 映射
- `web/default/src/hooks/use-sidebar-data.ts` — 「数据总览」菜单从管理员分区移至控制台分区，添加 requiredRole ADMIN
- `web/default/src/i18n/locales/*.json` — 新增 Model Usage Trend、Avg Price Trend、Registered/Total、Total Requests、User Consumption Ranking Top 10、User Consumption Share Top 10 等翻译（6 语言）
