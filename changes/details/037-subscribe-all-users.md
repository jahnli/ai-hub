# 订阅管理增强：全员订阅与单用户额度增加

**日期**: 2026-08-02

## 涉及文件

- `controller/subscription.go` — 新增 AdminSubscribeAllUsersToPlan 控制器和管理员可访问的已启用公司选项接口；全员订阅请求必须指定公司；新增 AdminIncreaseUserSubscriptionQuota 控制器，按人民币金额请求增加单个用户订阅额度；订阅套餐列表按当前用户公司过滤可见范围
- `model/subscription.go` — AdminSubscribeAllUsers 按所选已启用公司筛选全部用户（包含已禁用和已注销用户），重复执行时先取消同套餐现有有效订阅，再按套餐最新总额度和周期创建替代订阅，同时累计保留旧有效订阅的已用额度；针对已被旧版覆盖逻辑误清零的订阅，可通过旧订阅结束时间与新订阅开始时间的精确接续关系自动恢复历史已用额度，避免总额度叠加或用量清零；批量处理前校验套餐公司范围；新增 AdminIncreaseUserSubscriptionQuota 函数，仅允许 active 且未到期订阅增加额度，并按 USDExchangeRate 将人民币金额换算为 quota；套餐新增 company 字段、可见性判断和购买前校验
- `model/subscription_subscribe_all_test.go` — 覆盖所选公司的启用、禁用和已注销用户均可订阅，以及从旧版误清零链路中把 1800 总额度旧订阅的已用 300 恢复到 1500 总额度新订阅，并拒绝超出套餐公司范围的批量订阅
- `router/api-router.go` — 注册 GET `/company-options`、POST `/plans/:id/subscribe-all` 和 POST `/user_subscriptions/:id/increase-quota` 路由
- `middleware/audit.go` — 新增 subscribe_all 审计动作
- `web/src/features/subscriptions/api.ts` — 全员订阅接口增加 company_id 请求参数，并新增公司选项查询
- `web/src/features/subscriptions/types.ts` — 增加全员订阅公司选项与结果类型
- `web/src/components/confirm-dialog.tsx` — 通用确认弹框在 `isLoading` 时于确认按钮内显示旋转加载图标，并保持确认和取消按钮禁用
- `web/src/components/__tests__/confirm-dialog.test.tsx` — 覆盖加载期间旋转图标展示及两个操作按钮禁用
- `web/src/features/subscriptions/components/dialogs/subscribe-all-dialog.tsx` — 全员订阅弹窗加宽至 `sm:max-w-2xl`、最小高度增加至 `min-h-80`，底部操作栏通过自动外边距固定到弹框底部；增加必选公司下拉框、加载失败和无可用公司状态，并明确提示将覆盖同套餐现有有效订阅、保留已用额度且包含已禁用和已注销用户
- `web/src/features/subscriptions/components/dialogs/__tests__/company-selection.test.tsx` — 覆盖公司选项展示与未选择公司时禁用确认操作
- `web/src/i18n/locales/{en,zh,zh-TW,fr,ja,ru,vi}.json` — 补充公司范围全员订阅相关 7 语言翻译
