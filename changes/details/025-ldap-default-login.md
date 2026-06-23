# 登录页默认使用 LDAP 登录，视图切换布局

**日期**: 2026-06-22

## 涉及文件

- `web/default/src/features/auth/sign-in/components/user-auth-form.tsx` — 重写登录表单：引入 `LoginView` 类型（`ldap` / `password` / `oauth`）和 `activeView` 状态；LDAP 启用时默认展示 LDAP 表单；LDAP 登录由弹窗改为内联表单；底部通过分隔线 + 切换按钮在三种视图间导航；移除 `LDAPLoginDialog` 引用，直接调用 `ldapLogin` API
- `web/default/src/features/auth/components/oauth-providers.tsx` — 移除 `onLDAPLogin` prop 和 LDAP 按钮（LDAP 已提升为独立视图）；移除未使用的 `Building2` 图标导入
- `web/default/src/i18n/locales/en.json` — 新增 5 个翻译 key：`Or`、`Sign in with LDAP`、`Sign in with username or email`、`Other sign in options`、`Username or password is empty`
- `web/default/src/i18n/locales/zh.json` — 新增对应 5 个中文翻译
