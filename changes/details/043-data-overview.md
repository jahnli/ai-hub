# 数据总览页：飞书部门树筛选、统计卡片、子部门统计与使用分析

**日期**: 2026-06-25 ~ 07-02（最后更新 07-02）

## 涉及文件

- `controller/department.go` — 部门树、部门统计、子部门统计、用户排行接口控制器；新增 GetUserUsageAnalysis 单用户使用分析接口
- `service/feishu_department.go` — 飞书部门树拉取/缓存/权限裁剪；部门统计聚合；新增 GetSubDepartmentStats 按直接子部门并发拉取成员并批量聚合用量、getDirectChildren 辅助函数；部门与子部门统计新增按系统汇率换算的人民币费用；部门均价改为在人民币金额换算后计算；UsageAnalysisResponse 新增 ModelDailyStats 与 QuotaToCNY 字段，并发查询模型每日统计并下发配额到人民币换算率；新增 GetDepartmentUserRankings 返回部门内用户消耗 Top 10 排行；部门用户列表支持按数据库字段和计算用量列排序；新增 GetUserUsageAnalysis 单用户使用分析服务（并发查询模型/每日/模型每日统计）；新增 registration_status 参数支持按注册状态过滤用户（registered/unregistered），DepartmentUserItem 新增 IsRegistered 字段；未注册用户显示名默认为"-"；默认排序改为降序
- `model/log.go` — 部门统计聚合查询改用主库 quota_data 表，按 token_used、quota、count 聚合 Token/费用/请求数，并移除模型层按固定 quota 比例计算部门均价的逻辑；新增 GetUserStatsBatch 按 user_id 分组批量聚合 Token/费用/请求数；新增 ModelDailyStatRow 与 GetModelDailyStats 按模型按天聚合 Token 统计（支持 MySQL/SQLite/PostgreSQL）
- `model/user.go` — 新增 GetUserIDAndNamesByOpenIDs 按 open_id 批量查询用户 ID 和姓名
- `router/api-router.go` — 新增 `/api/department/tree`、`/stats`、`/sub-stats`、`/user-rankings`、`/user-usage-analysis` 路由
- `web/default/src/features/data-overview/api.ts` — 部门树、统计、子部门统计、用户排行 API 封装；部门用户列表 API 透传排序字段和方向、registration_status 参数；新增 getUserUsageAnalysis 单用户使用分析 API
- `web/default/src/features/data-overview/types.ts` — 部门树/统计类型；新增 SubDepartmentStat、ModelDailyStat、UserRankingItem 接口；子部门统计新增 total_amount_cny，使用分析响应新增 quota_to_cny；DepartmentUser 新增 is_registered 可选字段
- `web/default/src/features/data-overview/index.tsx` — 数据总览页面：查询后展示统计卡片与子部门板块；各板块加载骨架屏；Token 格式化改为中文单位（亿/万）；统计卡片从 Card 网格改为分割式紧凑布局（参照数据看板 LogStatCards 风格：单行 border 容器、divide-x 分隔、图标+大写标签+等宽数字+描述行），移除外层 Card 包裹；统计卡片费用展示改用后端按汇率换算后的人民币金额；骨架屏 key 提取为静态数组避免重复渲染；queryFn 增加参数非空断言；UsageAnalysisSection 移除时间参数传入；部门选择器提取为变量简化 JSX
- `web/default/src/features/data-overview/components/department-tree-select.tsx` — 级联展开/搜索部门树选择器
- `web/default/src/features/data-overview/components/department-users-table.tsx` — 部门用户表格，内嵌用户消耗排行图表；启用手动服务端排序，排序变化时重置到第一页；「已用额度/总额度」列头新增说明图标，提示额度数据固定为当前自然月且不受筛选时间影响；新增「统计」按钮列，点击打开用户统计弹窗；新增注册状态列（含下拉筛选器：全部/已注册/未注册），服务端按 registration_status 参数过滤；未注册用户禁用统计按钮
- `web/default/src/features/data-overview/components/user-consumption-charts.tsx` — 用户消耗排行 Top 10（水平柱状图）和用户消耗占比 Top 10（环形饼图），并排展示
- `web/default/src/features/data-overview/components/sub-department-stats.tsx` — 子部门统计组件：柱状图改为纵向、坐标轴格式化大数值；表头「用户数」改为「已注册/总人数」居中对齐；费用列、排序和图表改用后端返回的人民币金额
- `web/default/src/features/data-overview/components/usage-analysis.tsx` — 使用分析组件：模型排行/费用占比（tab 切换条形图/饼图）改为纵向柱状图；新增模型使用趋势折线图（ModelUsageTrend，按 Top N 模型展示每日 Token 量）；每日用量趋势新增「费用」指标切换；新增均价趋势折线图（AvgPriceTrendChart，计算每日平均单价并补全无数据日期）；费用和均价计算改用后端返回的 quota_to_cny 换算率；请求趋势图高度调整；重构为纯展示组件（移除 startTimestamp/endTimestamp 参数），移除均价趋势和 Token 分布图表，模型调用排行改为饼图分布，费用排行标题改为「模型消耗排行」，费用趋势标题改为「额度消耗趋势」
- `web/default/src/features/data-overview/components/user-stats-dialog.tsx` — 新增用户统计弹窗：展示单用户独立时间筛选、使用分析图表与近期调用日志
- `web/default/src/features/data-overview/components/user-logs-section.tsx` — 新增用户日志列表组件，复用 usage-logs 公共列定义
- `web/default/src/hooks/use-sidebar-config.ts` — 侧边栏配置新增 data_overview 模块及 URL 映射
- `web/default/src/hooks/use-sidebar-data.ts` — 「数据总览」菜单从管理员分区移至控制台分区，添加 requiredRole ADMIN
- `web/default/src/features/data-overview/components/department-users-table.tsx` — 请求次数格式化统一
- `web/default/src/features/data-overview/components/sub-department-stats.tsx` — 请求次数格式化统一
- `web/default/src/features/data-overview/components/user-consumption-charts.tsx` — Token 详情支持 tooltip 展示
- `web/default/src/features/data-overview/lib/export-excel.ts` — 注册状态判断改用 is_registered 字段，状态文本国际化；getWorksheet 非空断言提取为 getRequiredWorksheet 辅助函数
- `web/default/src/i18n/static-keys.ts` — 新增 Registration Status、Registered、Unregistered 静态键
- `web/default/src/i18n/locales/*.json` — 新增 Model Usage Trend、Avg Price Trend、Registered/Total、Total Requests、User Consumption Ranking Top 10、User Consumption Share Top 10、额度统计周期说明、User Statistics、Recent Usage Logs、No Logs Found、Statistics、Model Call Distribution、Model Consumption Ranking、Quota Consumption Trend、Registration Status、Registered、Unregistered 等翻译（6 语言）
- `service/feishu_department.go` — 新增 departmentMemberCacheTTL（30 分钟），部门成员列表和详情缓存 TTL 独立于部门树（5 分钟）；GetDepartmentUsers/GetDepartmentUserRankings 统一走 getAllMemberDetailsUnderDepts 单次查询，移除冗余的 getAllMembersUnderDepts 调用
- `web/default/src/features/data-overview/components/department-users-table.tsx` — 操作列 pinned right；默认按 quota 降序排序；额度列头 headerDescription 改为 undefined（tooltip 逻辑移至通用 column-header）
- `web/default/src/components/data-table/core/column-header.tsx` — DataTableColumnHeader 新增 DescriptionTooltip，通过 column.columnDef.meta.description 渲染列头说明图标
- `web/default/src/features/users/components/shared-user-columns.tsx` — userQuotaColumn 移除 inline header tooltip 渲染，改为 meta.description 传递
