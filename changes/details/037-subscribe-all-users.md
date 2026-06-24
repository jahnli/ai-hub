# 订阅管理增强：全员订阅与单用户额度增加

**日期**: 2026-06-24

## 涉及文件

- `controller/subscription.go` — 新增 AdminSubscribeAllUsersToPlan 控制器；新增 AdminIncreaseUserSubscriptionQuota 控制器，按人民币金额请求增加单个用户订阅额度
- `model/subscription.go` — 新增 AdminSubscribeAllUsers 函数；新增 AdminIncreaseUserSubscriptionQuota 函数，仅允许 active 且未到期订阅增加额度，并按 USDExchangeRate 将人民币金额换算为 quota
- `router/api-router.go` — 注册 POST `/plans/:id/subscribe-all` 路由和 POST `/user_subscriptions/:id/increase-quota` 路由
- `middleware/audit.go` — 新增 subscribe_all 审计动作
- `web/default/src/features/subscriptions/api.ts` — 新增 subscribeAllUsers API 调用函数和 increaseUserSubscriptionQuota API 调用函数
- `web/default/src/features/subscriptions/types.ts` — SubscriptionsDialogType 新增 `subscribe-all` 类型
- `web/default/src/features/subscriptions/components/dialogs/subscribe-all-dialog.tsx` — 新增全员订阅确认弹窗组件
- `web/default/src/features/subscriptions/components/dialogs/user-subscriptions-dialog.tsx` — 用户订阅管理侧栏加宽，并在单条订阅操作中新增「增加」按钮与人民币金额输入确认框
- `web/default/src/features/subscriptions/components/subscriptions-dialogs.tsx` — 引入 SubscribeAllDialog
- `web/default/src/features/subscriptions/components/data-table-row-actions.tsx` — 套餐行操作菜单新增「全员订阅」按钮
- `web/default/src/i18n/locales/{en,zh,fr,ja,ru,vi}.json` — 补充全员订阅和增加额度相关 6 语言翻译
