# 注册后自动订阅套餐

**日期**: 2026-07-04

## 涉及文件

- `setting/system_setting/registration.go` — 新增注册后自动化配置模块，持久化 `registration.auto_subscribe_plan_id`
- `controller/user.go` — 普通密码注册创建用户后读取注册配置，自动绑定指定订阅套餐且失败不阻断注册
- `model/subscription.go` — 让后台绑定订阅支持传入来源标记，注册自动订阅记录为 `register_auto`
- `web/default/src/features/system-settings/auth/basic-auth-section.tsx` — 在基础认证设置中新增注册后自动订阅套餐选择控件
- `web/default/src/features/system-settings/auth/index.tsx`、`web/default/src/features/system-settings/auth/section-registry.tsx`、`web/default/src/features/system-settings/types.ts` — 串接注册自动订阅设置默认值与类型
- `web/default/src/i18n/locales/*.json` — 补充新增设置项的 6 语言翻译
