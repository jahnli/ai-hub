# 删除兑换码管理界面及所有前端引用

**日期**: 2026-06-19

## 删除的目录/文件

- `features/redemption-codes/` — 整个功能模块（16 文件）
- `routes/_authenticated/redemption-codes/` — 路由定义
- `features/wallet/hooks/use-redemption.ts` — 兑换码 hook

## 修改的文件

- `features/wallet/api.ts` — 删除 `redeemTopupCode` 函数及 `RedemptionRequest`/`RedemptionResponse` 类型导入
- `features/wallet/types.ts` — 删除 `RedemptionRequest`/`RedemptionResponse` 类型定义
- `features/wallet/index.tsx` — 移除兑换码状态、逻辑和组件传参
- `features/wallet/components/recharge-form-card.tsx` — 移除兑换码输入区域、相关 props、`topupLink`；无在线充值提示文案改为仅"联系管理员"
- `features/wallet/hooks/index.ts` — 移除 `use-redemption` 导出
- `hooks/use-sidebar-data.ts` — 移除兑换码导航入口及 `Ticket` 图标
- `hooks/use-sidebar-config.ts` — 移除 `redemption` 模块配置及 `/redemption-codes` URL 映射
- `features/system-settings/maintenance/sidebar-modules-section.tsx` — 移除 `redemption` 模块元数据
- `features/usage-logs/lib/format.ts` — 移除 `redemption.*` 审计模板 4 条
- `features/system-settings/integrations/payment-settings-section.tsx` — 合规提示移除 "redemption codes"
- `i18n/static-keys.ts` — 移除兑换码相关静态 key
- `i18n/locales/{en,zh,fr,ja,ru,vi}.json` — 移除 ~34 个兑换码翻译 key × 6 语言，新增 2 个替代文案翻译
