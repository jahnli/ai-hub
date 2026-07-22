# 用户管理表格统计增强

**日期**: 2026-06-30 ~ 07-22（最后更新 07-22）

## 涉及文件

- `controller/user.go` — 用户列表和搜索接口返回订阅额度、月度总消耗、Token、请求次数和常用模型统计。
- `common/page_info.go` — 分页参数新增 sort_by/sort_order 解析和白名单 ORDER BY 生成，支持计算列排序识别，并将月度每百万 Token 均价列纳入计算列排序白名单。
- `controller/user.go` — 用户列表和搜索接口支持按订阅额度、月度/累计用量、Token、请求次数和每百万 Token 均价等计算列进行服务端排序。
- `model/log.go` — 新增按用户和模型从 `logs` 表聚合月度用量的查询，支撑常用模型统计。
- `model/subscription.go` — 新增按用户批量查询有效订阅额度汇总，用于用户管理表格展示订阅额度进度。
- `model/user.go` — 用户查询支持安全排序字段白名单和排序方向参数。
- `web/default/src/features/users/api.ts` — 用户列表 API 透传排序字段和方向；移除用户删除 API 封装。
- `web/default/src/features/users/components/users-table.tsx` — 用户管理表格启用手动服务端排序，排序变化时重置到第一页，并将均价列映射到后端月度均价排序字段。
- `web/default/src/features/users/types.ts` — 用户列表查询参数补充 sort_by/sort_order。
- `web/default/src/features/users/components/users-columns.tsx` — 用户管理表格新增月度总消耗、Token、请求次数、常用模型列，并将请求数提示改为使用 `logs` 聚合结果。
- `web/default/src/features/users/components/shared-user-columns.tsx` — 请求次数格式化统一（与数据总览保持一致）；抽取 `useSharedUserColumns` hook 统一用户管理与数据总览部门用户表格列定义；用户名列头像点击支持通过 open_id 跳转飞书且悬停仍显示资料卡片；调整用户列表 ID、用户名、总费用、Token、请求次数、部门、最后登录等列宽；部门列超出省略并悬停显示完整路径；调整列顺序为部门、职级、最后登录、常用模型；总费用右侧新增每百万 Token 均价列，显示 `/MT` 单位并接入排序表头；额度和均价列头新增贴近列名的说明图标，悬停表头可查看当前自然月额度统计说明和每百万 Token 均价说明
- `web/default/src/components/long-text.tsx` — 移动端长文本弹出层使用非按钮元素作为触发器时显式关闭 nativeButton，消除 Base UI 可访问性警告
- `web/default/src/features/data-overview/components/department-users-table.tsx` — 改用 `useSharedUserColumns` hook，移除独立的列定义
- `web/default/src/features/users/components/users-table.tsx` — 默认排序由 quota 降序改为 created_at 降序；getRowClassName 改为 early-return 写法
- `web/default/src/features/users/components/data-table-row-actions.tsx` — 操作列新增「统计」按钮（BarChart3 图标），点击打开 UserStatsDialog 查看用户使用分析；移除三点菜单中的删除项。
- `web/default/src/features/users/index.tsx` — 不再挂载用户删除确认弹窗。
- `web/default/src/features/users/components/users-delete-dialog.tsx` — 删除用户删除确认弹窗组件。
- `web/default/src/features/users/types.ts` — 用户类型补充订阅额度与月度统计字段；用户弹窗类型与管理动作类型移除 delete。
- `web/default/src/features/users/lib/user-actions.ts` — 删除用户删除成功提示动作映射。
- `web/default/src/i18n/locales/en.json` — 补充用户管理新增统计列英文文案。
- `web/default/src/i18n/locales/fr.json` — 补充用户管理新增统计列法文文案。
- `web/default/src/i18n/locales/ja.json` — 补充用户管理新增统计列日文文案。
- `web/default/src/i18n/locales/ru.json` — 补充用户管理新增统计列俄文文案。
- `web/default/src/i18n/locales/vi.json` — 补充用户管理新增统计列越南文文案。
- `web/default/src/i18n/locales/zh.json` — 补充用户管理新增统计列中文文案。

## 2026-07-20 公司筛选

- `model/user.go` — 新增 `GetUserCompanies` 查询去重且非空的用户公司列表（按公司升序）；`SearchUsers` 新增 `company` 参数，非空时按 `company` 精确过滤。
- `controller/user.go` — 新增 `GetUserCompanies` 接口；`SearchUsers` 读取 `company` 查询参数并透传给 model 层。
- `router/api-router.go` — 管理端用户路由新增 `GET /api/user/companies`。
- `web/default/src/features/users/api.ts` — `searchUsers` 透传 `company` 查询参数；新增 `getUserCompanies` 获取去重公司列表。
- `web/default/src/features/users/types.ts` — `SearchUsersParams` 新增 `company` 字段。
- `web/default/src/routes/_authenticated/users/index.tsx` — URL 搜索 schema 新增 `company` 数组参数。
- `web/default/src/features/users/components/users-columns.tsx` — 新增 `company` 列（默认隐藏、不可排序），用于承载「公司」筛选。
- `web/default/src/features/users/components/users-table.tsx` — 在「角色」筛选旁新增「公司」单选筛选（Building2 图标），公司选项来自 `getUserCompanies`，公司列默认隐藏并参与筛选与搜索请求。
- `web/default/src/i18n/locales/{en,fr,ja,ru,vi,zh-TW,zh}.json` — 补充「Company」（公司）翻译。

## 2026-07-22 额度列展示优化

- `web/src/features/users/components/shared-user-columns.tsx` — 缩短额度数字与进度条展示区域，已用额度固定保留两位小数，将额度说明图标移至标题外并与均价列保持一致，修复说明悬停不显示，并将列名由「已用额度/总额度」精简为「已用/总额」及进一步收窄默认列宽与内容宽度。
- `web/src/components/data-table/core/column-header.tsx` — 通用列头支持将说明图标放在列名后、排序图标前，同时保留原有默认布局。
- `web/src/lib/currency.ts` — 货币与额度格式化支持配置最少保留的小数位数。
- `web/src/i18n/locales/{en,fr,ja,ru,vi,zh-TW,zh}.json` — 同步更新精简后的额度列名翻译。
