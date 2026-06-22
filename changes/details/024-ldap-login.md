# 新增 LDAP 登录与用户同步

**日期**: 2026-06-22

## 涉及文件

- `.env.example` — 新增 LDAP 相关环境变量示例
- `controller/ldap.go` — 新增 LDAP 登录控制器（认证、绑定、解绑）
- `controller/misc.go` — 状态接口暴露 LDAP 启用标志
- `controller/option.go` — 系统设置保存时处理 LDAP 配置项
- `controller/user.go` — 用户模型适配 LDAP 字段
- `go.mod`、`go.sum` — 引入 LDAP 依赖包
- `i18n/keys.go` — 新增 LDAP 相关后端 i18n key
- `i18n/locales/en.yaml`、`i18n/locales/zh-CN.yaml`、`i18n/locales/zh-TW.yaml` — LDAP 后端翻译（英/简中/繁中）
- `model/user.go` — User 模型新增 LDAP 相关字段与查询方法
- `router/api-router.go` — 注册 LDAP 登录/绑定/解绑路由
- `service/feishu_sync.go` — 新增飞书用户同步服务
- `service/ldap.go` — LDAP 认证与用户查找核心逻辑
- `setting/system_setting/feishu.go` — 飞书同步相关系统设置
- `setting/system_setting/ldap.go` — LDAP 连接相关系统设置（服务器、BaseDN、BindDN 等）
- `web/default/src/features/auth/api.ts` — 前端 LDAP 登录 API 调用
- `web/default/src/features/auth/components/ldap-login-dialog.tsx` — LDAP 登录弹窗组件
- `web/default/src/features/auth/components/oauth-providers.tsx` — OAuth 登录区域集成 LDAP 入口
- `web/default/src/features/auth/sign-in/components/user-auth-form.tsx` — 登录表单集成 LDAP 按钮
- `web/default/src/features/auth/types.ts` — 新增 LDAP 相关类型定义
- `web/default/src/features/system-settings/auth/index.tsx` — 系统设置认证页新增 LDAP 配置区
- `web/default/src/features/system-settings/auth/oauth-section.tsx` — OAuth 设置区适配 LDAP/飞书同步配置
- `web/default/src/features/system-settings/types.ts` — 系统设置类型新增 LDAP 字段
- `web/default/src/i18n/locales/{en,zh,fr,ja,ru,vi}.json` — 前端 6 语言翻译同步更新
