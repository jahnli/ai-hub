# 数据总览页：飞书部门树筛选、统计卡片、子部门统计与使用分析

**日期**: 2026-06-25 ~ 07-20（最后更新 07-20）

## 涉及文件

- `controller/department.go` — 部门树、部门统计、子部门统计、用户排行接口控制器；新增 GetUserUsageAnalysis 单用户使用分析接口；新增 GetDepartmentLogs 部门使用日志接口；新增 GetDepartmentUserLogs 用户统计弹窗精确日志接口及 user_id 校验
- `service/feishu_department.go` — 飞书部门树拉取/缓存/权限裁剪；部门统计聚合；新增 GetSubDepartmentStats 按直接子部门并发拉取成员并批量聚合用量、getDirectChildren 辅助函数；部门与子部门统计新增按系统汇率换算的人民币费用；部门均价改为在人民币金额换算后计算；子部门统计新增每百万 Token 均价并随接口返回；UsageAnalysisResponse 新增 ModelDailyStats 与 QuotaToCNY 字段，并发查询模型每日统计并下发配额到人民币换算率；新增 GetDepartmentUserRankings 返回部门内用户消耗 Top 10 排行；部门用户列表支持按数据库字段和计算用量列排序，并补充每百万 Token 均价字段与排序；新增 GetUserUsageAnalysis 单用户使用分析服务（并发查询模型/每日/模型每日统计）；新增 GetDepartmentLogs 按部门成员 user_id 拉取使用日志；新增 GetDepartmentUserLogs 按单一 user_id、时间范围和分页精确拉取日志；新增 registration_status 参数支持按注册状态过滤用户（registered/unregistered），DepartmentUserItem 新增 IsRegistered 字段；未注册用户显示名默认为"-"；默认排序改为降序
- `model/log.go` — 部门统计聚合查询改用主库 quota_data 表，按 token_used、quota、count 聚合 Token/费用/请求数，并移除模型层按固定 quota 比例计算部门均价的逻辑；新增 GetUserStatsBatch 按 user_id 分组批量聚合 Token/费用/请求数；新增 ModelDailyStatRow 与 GetModelDailyStats 按模型按天聚合 Token 统计（支持 MySQL/SQLite/PostgreSQL）；新增 GetLogsByUserIds 复用使用日志查询并支持部门成员过滤
- `model/user.go` — 新增 GetUserIDAndNamesByOpenIDs 按 open_id 批量查询用户 ID 和姓名
- `router/api-router.go` — 新增 `/api/department/tree`、`/stats`、`/sub-stats`、`/logs`、`/user-logs`、`/user-rankings`、`/user-usage-analysis` 路由
- `web/default/src/features/data-overview/api.ts` — 部门树、统计、子部门统计、用户排行 API 封装；部门用户列表 API 透传排序字段和方向、registration_status 参数；新增 getUserUsageAnalysis 单用户使用分析 API；新增 getDepartmentLogs 部门使用日志 API；新增 getDepartmentUserLogs 用户统计弹窗精确日志 API
- `web/default/src/features/data-overview/types.ts` — 部门树/统计类型；新增 SubDepartmentStat、ModelDailyStat、UserRankingItem 接口；子部门统计新增 total_amount_cny 与 avg_price_per_mt，使用分析响应新增 quota_to_cny；DepartmentUser 新增 is_registered 与 open_id 可选字段，复用共享用户列的头像飞书跳转能力
- `web/default/src/features/data-overview/index.tsx` — 数据总览页面：查询后展示统计卡片与子部门板块；各板块加载骨架屏；Token 格式化改为中文单位（亿/万）；统计卡片从 Card 网格改为分割式紧凑布局（参照数据看板 LogStatCards 风格：单行 border 容器、divide-x 分隔、图标+大写标签+等宽数字+描述行），移除外层 Card 包裹；统计卡片费用展示改用后端按汇率换算后的人民币金额；骨架屏 key 提取为静态数组避免重复渲染；queryFn 增加参数非空断言；UsageAnalysisSection 移除时间参数传入；部门选择器提取为变量简化 JSX
- `web/default/src/features/data-overview/components/department-tree-select.tsx` — 级联展开/搜索部门树选择器
- `web/default/src/features/data-overview/components/department-users-table.tsx` — 部门用户表格，内嵌用户消耗排行图表；启用手动服务端排序，排序变化时重置到第一页；总费用右侧新增每百万 Token 均价列并映射到后端均价排序字段；「已用额度/总额度」列头新增说明图标，提示额度数据固定为当前自然月且不受筛选时间影响；新增「统计」按钮列，点击打开用户统计弹窗；标题右侧新增「日志」按钮，打开当前部门所有员工在数据总览选中时间内的使用日志；新增注册状态列（含下拉筛选器：全部/已注册/未注册），服务端按 registration_status 参数过滤；未注册用户禁用统计按钮
- `web/default/src/features/data-overview/components/user-consumption-charts.tsx` — 用户消耗排行 Top 10（水平柱状图）和用户消耗占比 Top 10（环形饼图），并排展示
- `web/default/src/features/data-overview/components/sub-department-stats.tsx` — 子部门统计组件：柱状图改为纵向、坐标轴格式化大数值；表头「用户数」改为「已注册/总人数」居中对齐；费用列、排序和图表改用后端返回的人民币金额；总费用右侧新增均价列展示每百万 Token 均价；均价列头新增贴近列名的说明图标，悬停表头可查看每百万 Token 均价说明；表格新增「统计」和「日志」按钮列（pinned right），可分别打开子部门统计弹窗和子部门员工使用日志弹窗
- `web/default/src/features/data-overview/components/sub-department-stats-dialog.tsx` — 新增子部门统计弹窗：展示指定子部门的统计卡片（DepartmentStatsCards）与使用分析（UsageAnalysisSection），独立查询 stats 和 usage-analysis 接口；弹框高度统一为视口 85%
- `web/default/src/features/data-overview/components/department-stats-cards.tsx` — 从 index.tsx 提取为独立组件，展示部门统计指标卡片（Token/费用/均价/请求数/注册数/未注册数/响应时间/错误率），支持 Tooltip 展示 Token 详情
- `web/default/src/features/data-overview/components/usage-analysis.tsx` — 使用分析组件：模型排行/费用占比（tab 切换条形图/饼图）改为纵向柱状图；新增模型使用趋势折线图（ModelUsageTrend，按 Top N 模型展示每日 Token 量）；每日用量趋势新增「费用」指标切换；新增均价趋势折线图（AvgPriceTrendChart，计算每日平均单价并补全无数据日期）；费用和均价计算改用后端返回的 quota_to_cny 换算率；请求趋势图高度调整；重构为纯展示组件（移除 startTimestamp/endTimestamp 参数），移除均价趋势和 Token 分布图表，模型调用排行改为饼图分布，费用排行标题改为「模型消耗排行」，费用趋势标题改为「额度消耗趋势」
- `web/default/src/features/data-overview/components/user-stats-dialog.tsx` — 新增用户统计弹窗：展示单用户独立时间筛选、使用分析图表与近期调用日志；日志查询改为传递不可变 user_id；弹窗宽度调整为 1360px、高度统一为视口 85%，并保留视口宽度自适应
- `web/default/src/features/data-overview/components/user-logs-section.tsx` — 新增用户日志列表组件，复用 usage-logs 公共列定义；抽取通用 LogsSection 并新增 DepartmentLogsSection 复用同一使用日志表格；用户日志改调独立接口并按 user_id 精确查询，避免用户名包含匹配串入其他用户日志；补充 RequestMessagesProvider 以加载并显示近期调用日志中的请求内容；请求内容加载同步遵循超级管理员可见性限制；数据总览中的日志表格按超级管理员权限决定是否启用管理员用户详情拉取，避免 AI BP/中心 BP hover 用户头像时触发管理员接口导致无权限提示；部门日志表格改为自动撑满弹框剩余区域，中间列表滚动并固定底部分页
- `web/default/src/features/usage-logs/components/columns/common-logs-columns.tsx` — useCommonLogsColumns 增加 canFetchUserDetails 选项，拆分“显示用户列”和“拉取管理员用户详情”能力；默认保持管理员日志页原行为，数据总览可禁用详情拉取并仅展示日志自带的基础用户信息
- `web/default/src/features/data-overview/components/department-logs-dialog.tsx` — 新增部门使用日志弹窗，复用 DepartmentLogsSection 展示当前部门或子部门员工在数据总览选中时间内的使用日志，不额外提供时间选择器；弹框高度统一为视口 85%
- `web/default/src/hooks/use-sidebar-config.ts` — 侧边栏配置新增 data_overview 模块及 URL 映射
- `web/default/src/hooks/use-sidebar-data.ts` — 「数据总览」菜单从管理员分区移至控制台分区，添加 requiredRole ADMIN
- `web/default/src/features/data-overview/components/department-users-table.tsx` — 请求次数格式化统一
- `web/default/src/features/data-overview/components/sub-department-stats.tsx` — 请求次数格式化统一
- `web/default/src/features/data-overview/components/user-consumption-charts.tsx` — Token 详情支持 tooltip 展示
- `web/default/src/features/data-overview/lib/export-excel.ts` — 注册状态判断改用 is_registered 字段，状态文本国际化；getWorksheet 非空断言提取为 getRequiredWorksheet 辅助函数
- `web/default/src/i18n/static-keys.ts` — 新增 Registration Status、Registered、Unregistered 静态键
- `web/default/src/i18n/locales/*.json` — 新增 Model Usage Trend、Avg Price Trend、Registered/Total、Total Requests、User Consumption Ranking Top 10、User Consumption Share Top 10、额度统计周期说明、User Statistics、Recent Usage Logs、No Logs Found、Statistics、Usage Logs、Department User List、Model Call Distribution、Model Consumption Ranking、Quota Consumption Trend、Registration Status、Registered、Unregistered 等翻译（6 语言）；补齐每百万 Token 均价相关翻译
- `service/feishu_department.go` — 新增 departmentMemberCacheTTL（30 分钟），部门成员列表和详情缓存 TTL 独立于部门树（5 分钟）；GetDepartmentUsers/GetDepartmentUserRankings 统一走 getAllMemberDetailsUnderDepts 单次查询，移除冗余的 getAllMembersUnderDepts 调用；DepartmentUsersResponse 新增 total_users、registered_users、unregistered_users，接口返回部门总人数、已注册人数与未注册人数
- `web/default/src/features/data-overview/components/department-users-table.tsx` — 操作列 pinned right；默认按 quota 降序排序；额度列头 headerDescription 改为 undefined（tooltip 逻辑移至通用 column-header）；标题右侧新增总人数、已注册、未注册彩色统计标签
- `web/default/src/features/data-overview/types.ts` — DepartmentUsersResponse 类型补充 total_users、registered_users、unregistered_users 字段
- `web/default/src/components/data-table/core/column-header.tsx` — DataTableColumnHeader 新增 DescriptionTooltip，通过 column.columnDef.meta.description 渲染列头说明图标
- `web/default/src/features/users/components/shared-user-columns.tsx` — userQuotaColumn 与共享均价列改为贴近列名的内联说明图标，悬停表头可查看当前自然月额度统计说明和每百万 Token 均价说明；共享列新增均价列，显示 `/MT` 单位并保留排序入口
- `.env.example` — 新增 `DATA_OVERVIEW_ACTIVE_USER_THRESHOLD_FORMULA`，支持用 `days` 按统计区间天数配置活跃用户请求阈值公式，并保留旧固定阈值配置作为兼容兜底
- `model/log.go` — 部门统计新增使用人数、使用占比、人均 Token 和阈值字段；按筛选时间内用户请求次数严格大于动态阈值聚合使用人数
- `service/feishu_department.go` — 解析和校验活跃用户阈值公式，按统计区间天数计算阈值；公式缺失或无效时回退固定阈值，并向部门与子部门统计结果下发阈值和公式说明
- `service/feishu_department_stats_test.go` — 覆盖动态公式阈值边界、固定阈值兜底、时间与用户范围过滤，以及空部门统计行为
- `web/default/src/features/data-overview/components/activity-formula-tooltip.tsx` — 新增活跃用户公式说明 Tooltip，展示实际生效的动态阈值计算方式
- `web/default/src/features/data-overview/components/department-stats-cards.tsx` — 统计卡片新增使用人数/占比与人均 Token，并展示活跃用户公式说明
- `web/default/src/features/data-overview/components/sub-department-stats.tsx` — 子部门表格新增使用人数/占比与人均 Token 列，支持按使用人数排序并展示活跃用户公式说明
- `web/default/src/features/data-overview/index.tsx` — 数据总览主统计区域补充使用人数指标卡片及对应骨架布局
- `web/default/src/features/data-overview/types.ts` — 部门与子部门统计类型补充使用人数、占比、人均 Token 和阈值字段
- `web/default/src/i18n/locales/*.json` — 补齐使用人数、使用占比、人均 Token、请求阈值说明等各语言文案
- `model/log_user_filter_test.go` — 覆盖按 user_id 精确过滤、排除相似用户名用户及起止时间边界包含行为
- `.env.example` — 新增 `DATA_OVERVIEW_MODEL_MAPPING` 数组映射格式说明，以展示模型名关联多个原始模型别名
- `docker-compose.yml` — 将 `DATA_OVERVIEW_MODEL_MAPPING` 注入服务环境变量
- `model/log.go` — 模型统计支持获取完整聚合结果，并按合并后的 Top N 模型集合查询每日趋势数据
- `service/feishu_department.go` — 解析“展示模型名 → 原始模型名数组”映射，统一合并模型 Token、额度、调用次数和每日趋势，并在合并后执行 Top 10 排名
- `service/feishu_department.go` — 注册人数、注册状态、部门/子部门统计、使用分析及部门日志统一按筛选结束时间判断；`users.created_at` 晚于筛选结束时间的员工在该时间范围内视为未注册
