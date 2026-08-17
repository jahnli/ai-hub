# 数据总览可见部门级别改为按成员 bp_level 配置

**日期**: 2026-08-17

## 涉及文件

- `common/constants.go` — 新增 `BpLevelUnset=0` 常量与 `IsValidBpLevel` 校验（非负即可，不设上限）
- `model/user.go` — `User` 结构体新增 `bp_level` 字段（int，默认 0），GORM AutoMigrate 自动加列不改动既有数据；`EditWithTx` 的 updates map 写入 `bp_level`
- `controller/user.go` — `CreateUser` 白名单支持 `bp_level`；`UpdateUser` 校验 `IsValidBpLevel`（非负整数）；创建/更新时按 `department_name` 层级深度钳制 `bp_level`（超过最深级自动收敛为最深级）；`buildSelfUserData` 下发 `bp_level` 供前端入口判断
- `middleware/auth.go` — `DataOverviewAccessCheck` 改为 `canAccessDataOverview`：管理员/超级管理员放行、BP 角色要求 `bp_level > 0`、其余用户要求部门负责人；BP 且 `bp_level=0` 时连入口也拒绝（403）
- `middleware/data_overview_access_test.go` — 新增入口判定表驱动测试：管理员/超级管理员放行、BP 需配置级别、BP 未配置即使兼负责人也拒绝、普通用户仅负责人放行
- `service/feishu_department.go` — 删除 `trimTreeForBP` 中按角色固定级别（中心BP→第1级、AI BP→第2级）的 switch，改为纯 `bp_level` 驱动：0 无可见部门、1~N 取第 N 级、超过本人部门层级时收敛到最深级；`trimTreeForUser` 增加 `bpLevel` 参数；新增 `NormalizeBpLevelForDepartment` 钳制函数，写入（创建/更新用户）与读取（树裁剪、报表推送）共用同一口径
- `service/data_overview_company.go` — 部门树、子树懒加载与 `ensureDepartmentAccessible` 权限校验 3 处裁剪调用传入 `user.BpLevel`，所有数据总览接口随之生效
- `service/report_notify.go` — BP 日报推送范围由按角色取段改为按 `bp_level` 取段（越界收敛），`bp_level<=0` 且非部门负责人时无推送范围
- `service/feishu_department_test.go` — 新增 `trimTreeForBP` 表驱动测试：0/负数不可见、各级裁剪、越界收敛、空部门名与未命中节点，以及不修改输入树
- `service/report_notify_test.go` — 范围测试 fixtures 改为显式设置 `BpLevel`，新增未配置无范围与越界收敛用例
- `web/src/lib/roles.ts` — 新增 `canAccessDataOverview` 入口判定函数（管理员放行、BP 需 `bp_level>0`、其余需部门负责人）
- `web/src/lib/__tests__/data-overview-access.test.ts` — 覆盖入口判定的 5 组用例
- `web/src/stores/auth-store.ts` — `AuthUser` 增加 `bp_level`
- `web/src/routes/_authenticated/data-overview/index.tsx` — 路由守卫改用 `canAccessDataOverview`，BP 且未配置时跳转 403
- `web/src/hooks/use-sidebar-data.ts` — 侧边栏「数据总览」菜单改用同一判定，BP 且未配置时不显示入口
- `web/src/features/users/types.ts` — `userSchema` 与 `UserFormData` 增加 `bp_level`
- `web/src/features/users/lib/user-form.ts` — 表单 schema 增加 `bp_level`（非负整数，不设上限），默认值 0，创建/更新 payload 与回显转换均携带该字段；新增 `clampBpLevelToDepartment` 输入钳制函数（超过本人部门层级深度时按最深级保存）
- `web/src/features/users/lib/__tests__/user-form-bp-level.test.ts` — 覆盖 schema 边界（非负整数、负数/小数拒绝）、默认值、payload、回显转换与越界钳制
- `web/src/features/users/components/users-mutate-drawer.tsx` — 目标角色为 AI BP/中心 BP 时展示「数据总览可见级别」下拉框，根据成员 `department_name` 动态列出 `0 级：不可见任何部门`及各级对应部门名称；角色与级别选择框限制在抽屉可用宽度内并截断超长选中值；管理员权限文案允许收缩换行，避免切换角色后撑宽抽屉
- `web/src/components/drawer-layout.ts` — 抽屉表单与分区增加最小宽度和横向溢出保护，动态角色区域不再扩大表单滚动宽度
- `web/src/components/__tests__/drawer-layout.test.ts` — 新增抽屉表单横向溢出保护和分区收缩行为回归测试
- `web/src/i18n/locales/{en,zh,zh-TW,fr,ja,ru,vi}.json` — 补齐级别下拉框、不可见部门选项和部门层级的 7 语言文案；简体中文级别显示统一为 `x 级`
