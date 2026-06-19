# 删除后端兑换码功能及数据库表

**日期**: 2026-06-19

## 删除的文件

- `model/redemption.go` — `Redemption` 结构体及全部 CRUD/兑换逻辑
- `controller/redemption.go` — 兑换码管理 handler（7 个）

## 修改的文件

- `model/main.go` — `migrateDB`/`migrateDBFast` 移除 `&Redemption{}`；新增启动时 `DROP TABLE redemptions`
- `model/errors.go` — 移除 `ErrRedeemFailed`
- `model/user.go` — 默认侧边栏配置移除 `"redemption": true`（2 处）
- `controller/user.go` — 移除 `TopUp` 函数及 `topUpRequest`/锁机制/`"redemption"` 权限配置（2 处）；清理未用 import `sync`、`operation_setting`
- `controller/topup.go` — `enable_redemption` 硬编码为 `false`
- `controller/audit.go` — 移除 `redemption.create` 审计模板
- `router/api-router.go` — 移除 `/api/redemption` 路由组（7 条）+ `/api/user/topup` 路由
- `common/constants.go` — 移除 `RedemptionCodeStatus*` 常量（3 个）
- `middleware/audit.go` — 移除 `redemption.*` 审计路由映射（3 条）
- `i18n/keys.go` — 移除 `MsgRedemption*`（10 个）+ `MsgRedeemFailed`
- `i18n/locales/{en,zh-CN,zh-TW}.yaml` — 移除 `redemption.*`/`redeem.*` 翻译（11 条 × 3 语言）
