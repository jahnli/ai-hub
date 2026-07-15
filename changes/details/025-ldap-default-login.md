# 登录页默认使用 LDAP 登录，视图切换布局

**日期**: 2026-06-22 ~ 07-15（最后更新 07-15）

## 涉及文件

- `web/default/src/features/auth/sign-in/components/user-auth-form.tsx` — 重写登录表单：引入 `LoginView` 类型（`ldap` / `password` / `oauth`）和 `activeView` 状态；LDAP 启用时默认展示 LDAP 表单；LDAP 登录由弹窗改为内联表单；底部通过分隔线 + 切换按钮在三种视图间导航；移除 `LDAPLoginDialog` 引用，直接调用 `ldapLogin` API；用户名输入框下添加示例提示
- `web/default/src/features/auth/components/oauth-providers.tsx` — 移除 `onLDAPLogin` prop 和 LDAP 按钮（LDAP 已提升为独立视图）；移除未使用的 `Building2` 图标导入
- `web/default/src/features/auth/components/ldap-login-dialog.tsx` — 删除：未被任何组件引用的独立 LDAP 登录弹窗组件
- `web/default/src/i18n/locales/en.json` — 新增翻译 key：`Or`、`Sign in with LDAP`、`Sign in with username or email`、`Other sign in options`、`Username or password is empty`、`Example: {{example}}`
- `web/default/src/i18n/locales/zh.json` — 新增对应中文翻译
- `web/default/src/i18n/locales/fr.json` — 新增对应法语翻译
- `web/default/src/i18n/locales/ja.json` — 新增对应日语翻译
- `web/default/src/i18n/locales/ru.json` — 新增对应俄语翻译
- `web/default/src/i18n/locales/vi.json` — 新增对应越南语翻译
- `web/default/src/features/auth/sign-in/index.tsx` — 移除“没有账号？注册”提示及注册链接，并将登录标题简化为左对齐布局
