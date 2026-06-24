# 订阅管理新增「全员订阅」功能

**日期**: 2026-06-24

## 涉及文件

- `controller/subscription.go` — 新增 AdminSubscribeAllUsersToPlan 控制器，校验 ID 后调用 model 层批量订阅
- `model/subscription.go` — 新增 AdminSubscribeAllUsers 函数，分批查询启用状态用户并逐一绑定订阅，返回 created/skipped/failed 统计
- `router/api-router.go` — 注册 POST `/plans/:id/subscribe-all` 路由
- `middleware/audit.go` — 新增 subscribe_all 审计动作
- `web/default/src/features/subscriptions/api.ts` — 新增 subscribeAllUsers API 调用函数
- `web/default/src/features/subscriptions/types.ts` — SubscriptionsDialogType 新增 `subscribe-all` 类型
- `web/default/src/features/subscriptions/components/dialogs/subscribe-all-dialog.tsx` — 新增全员订阅确认弹窗组件
- `web/default/src/features/subscriptions/components/subscriptions-dialogs.tsx` — 引入 SubscribeAllDialog
- `web/default/src/features/subscriptions/components/data-table-row-actions.tsx` — 套餐行操作菜单新增「全员订阅」按钮
- `web/default/src/i18n/locales/{en,zh,fr,ja,ru,vi}.json` — 6 语言翻译
