# 订阅管理增强：全员订阅与单用户额度增加

**日期**: 2026-08-02

## 涉及文件

- `controller/subscription.go` — 新增按公司全员订阅、已启用公司选项及单用户人民币额度增加接口；套餐按用户公司过滤可见范围。
- `model/subscription.go` — 全员订阅按所选启用公司覆盖全部用户（含禁用、注销），取消同套餐有效订阅后按最新额度/周期创建替代订阅，保留已用额度且不叠加总额；按旧订阅结束与新订阅开始的精确接续关系恢复旧版误清零用量；批量操作校验套餐公司范围；仅允许 active 且未到期订阅增加额度，并按 USDExchangeRate 将人民币换算为 quota；套餐支持 company 字段、可见性及购买前校验。
- `model/subscription_subscribe_all_test.go` — 覆盖所选公司用户（启用、禁用、注销）订阅、旧版误清零用量恢复及越界公司套餐拒绝。
- `router/api-router.go` — 注册公司选项、全员订阅和单用户额度增加路由。
- `middleware/audit.go` — 新增 subscribe_all 审计动作。
- `web/src/features/subscriptions/api.ts` — 全员订阅增加 company_id 参数并新增公司选项查询。
- `web/src/features/subscriptions/types.ts` — 增加公司选项与结果类型。
- `web/src/components/confirm-dialog.tsx` — `isLoading` 时确认按钮显示旋转图标，确认/取消按钮均禁用。
- `web/src/components/__tests__/confirm-dialog.test.tsx` — 覆盖加载图标与按钮禁用。
- `web/src/features/subscriptions/components/dialogs/subscribe-all-dialog.tsx` — 弹窗加宽加高，底部操作栏固定；增加必选公司、加载失败/无公司状态，并提示覆盖同套餐有效订阅、保留额度且包含禁用/注销用户。
- `web/src/features/subscriptions/components/dialogs/__tests__/company-selection.test.tsx` — 覆盖公司展示及未选公司时禁用确认。
- `web/src/i18n/locales/{en,zh,zh-TW,fr,ja,ru,vi}.json` — 补充公司范围全员订阅的 7 语言翻译。
