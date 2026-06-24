# 变更日志

仅记录二开修改，用于追踪本地定制与上游的差异。详细文件列表见 [details/](details/) 目录。

| 编号 | 日期 | 说明 | 详情 |
|------|------|------|------|
| 001 | 2026-06-18 | 启动默认主题改为 default | `common/constants.go`、`setting/system_setting/theme.go` |
| 002 | 2026-06-18 | 全局品牌重命名 New API → AI Hub | [详情](details/002-brand-rename.md) |
| 003 | 2026-06-18 ~ 06-23 | 首页定制：移除 Footer/区块/开源卡片/CTA推广区，HeroViewPricing 按钮，模型标签替换，三步上手优化与连接线动画，Hero 右侧轨道动画替换 Terminal Demo，底部飞书联系信息，统计微光动画与 glass 卡片 UI，加宽 Header 与内容区，轨道动画左移，Hero 渐变标题微光扫光，Footer/CTA/Hero 相关翻译清理 | [详情](details/003-homepage-customization.md) |
| 004 | 2026-06-19 | 修复前端 dev server 端口冲突 | `web/default/rsbuild.config.ts` |
| 005 | 2026-06-19 | 移除开发环境 devtools 面板 | `web/default/src/routes/__root.tsx` |
| 006 | 2026-06-19 | 删除 About 页面及所有相关引用 | [详情](details/007-remove-about.md) |
| 007 | 2026-06-19 | 删除兑换码管理界面及前端引用 | [详情](details/008-remove-redemption-frontend.md) |
| 008 | 2026-06-19 | 删除后端兑换码功能及数据库表 | [详情](details/009-remove-redemption-backend.md) |
| 009 | 2026-06-24 | Toast UI 优化：关闭按钮移至右上角；状态色替换为固定配色（不再跟随主题预设） | `web/default/src/styles/index.css`、`web/default/src/components/ui/sonner.tsx` |
| 010 | 2026-06-19 | 移除 Anthropic 和 Simple Large-font 主题颜色预设 | [详情](details/011-remove-theme-presets.md) |
| 011 | 2026-06-19 | 侧边栏样式默认值改为 floating，选项顺序调整为浮动→侧边栏→内嵌 | `web/default/src/context/layout-provider.tsx`、`web/default/src/components/config-drawer.tsx` |
| 012 | 2026-06-19 | 侧边栏背景色改为透明（所有主题预设、明暗模式） | `web/default/src/styles/theme.css`、`web/default/src/styles/theme-presets.css` |
| 013 | 2026-06-19 | 主题预设定制：新增碧空并设为默认、移除海风、侧边栏选中色改主题色、移除预设文字标签及翻译、调整预设顺序、修复预设属性 Bug | [详情](details/014-theme-preset-customization.md) |
| 014 | 2026-06-20 | 侧边栏「聊天」菜单重命名为「快捷方式」，含 6 语言翻译 | [详情](details/015-sidebar-chat-to-shortcuts.md) |
| 015 | 2026-06-20 | 弹出层和卡片背景色不再混入主题色，浅/深模式各用纯净底色；dialog footer 去掉背景色，与内容区域统一 | [详情](details/016-dialog-theme-color.md) |
| 016 | 2026-06-20 | Lake View 主题预设配色改为 #233633 / #63e2b7 薄荷绿色系 | `web/default/src/styles/theme-presets.css`、`web/default/src/lib/theme-customization.ts` |
| 017 | 2026-06-20 | Lake View 侧边栏选中文字颜色改为 #18a058 | `web/default/src/components/ui/sidebar.tsx`、`web/default/src/styles/theme-presets.css` |
| 018 | 2026-06-20 | 修复侧边栏选中项悬停时文字颜色被覆盖的问题，保持主题色 | `web/default/src/components/ui/sidebar.tsx` |
| 019 | 2026-06-20 | 移除邀请人/邀请码功能（后端模型/控制器/路由、前端组件/类型/i18n、数据库迁移、计费设置默认值残留字段修复） | [详情](details/020-remove-invitation.md) |
| 020 | 2026-06-20 | 移除概览页「开始使用」和「推荐操作」区域 | `web/default/src/features/dashboard/components/overview/overview-dashboard.tsx` |
| 021 | 2026-06-20 | 个人资料页内联展示订阅详情（计划名、状态、剩余天数、配额进度条等），皇冠图标改为金色 | `web/default/src/features/profile/components/profile-header.tsx` |
| 022 | 2026-06-21 | 渠道页默认视图改为列表，视图切换按钮顺序调整为列表→卡片 | `web/default/src/features/channels/components/channels-table.tsx`、`web/default/src/components/data-table/toolbar/view-mode-toggle.tsx` |
| 023 | 2026-06-22 | 新增 LDAP 登录与用户同步（飞书同步）：后端 LDAP 认证/绑定/解绑、飞书用户同步服务、前端登录弹窗与系统设置、6 语言翻译 | [详情](details/024-ldap-login.md) |
| 024 | 2026-06-23 | 登录页默认使用 LDAP 登录：LDAP 表单内联展示替代弹窗，视图切换（LDAP/密码/OAuth）布局；用户名输入框下添加示例提示；删除未使用的 LDAPLoginDialog 组件 | [详情](details/025-ldap-default-login.md) |
| 025 | 2026-06-22 | 移除 User 表 name 字段，飞书同步的姓名改写入 display_name；LDAP 注册 email 改为 username + FEISHU_EMAIL_SUFFIX 拼接 | `model/user.go`、`service/feishu_sync.go`、`controller/ldap.go` |
| 026 | 2026-06-23 | Feishu 凭据改为惰性读取（sync.OnceValue），避免包导入时 .env 未加载导致同步失败 | `setting/system_setting/feishu.go`、`service/feishu_sync.go`、`controller/ldap.go` |
| 027 | 2026-06-23 | 用户头像改用 avatar_url 字段：后端 API 下发 avatar_url，前端头像组件优先展示图片、无图时回退首字母 | [详情](details/028-avatar-url.md) |
| 028 | 2026-06-23 | LDAP 注册时飞书同步改为同步调用，确保首次登录响应即包含头像；SyncFeishuUser 回写 user 指针字段 | `controller/ldap.go`、`service/feishu_sync.go` |
| 029 | 2026-06-23 | 前端类型检查改为 git pre-commit hook 自动执行，移除 Cursor Hook 方案，适用于所有 git 客户端 | `.githooks/pre-commit`、`.cursor/hooks.json`、`web/default/AGENTS.md` |
| 029 | 2026-06-23 | 移除 GitHub、Discord、Telegram、LinuxDO OAuth 登录：删除 User 表 4 个 ID 字段、后端提供商实现、前端设置/登录/绑定界面及所有语言翻译 | [详情](details/029-remove-github-discord-telegram-linuxdo-oauth.md) |
| 030 | 2026-06-23 | 修复 LDAP 系统设置不回显配置，并在保存 LDAP 登录状态后刷新前端状态缓存 | `web/default/src/features/system-settings/auth/section-registry.tsx`、`web/default/src/features/system-settings/hooks/use-update-option.ts` |
| 031 | 2026-06-23 | 清理认证系统设置中已移除 OAuth 提供商的残留前端参数 | `web/default/src/features/system-settings/auth/section-registry.tsx` |
| 032 | 2026-06-23 | 前端更新（home） | `web/default/src/features/home/components/sections/cta.tsx` |
| 033 | 2026-06-23 | 登录页切换按钮与登录按钮大小统一，去掉多余的 h-11 rounded-lg | `web/default/src/features/auth/sign-in/components/user-auth-form.tsx` |
| 034 | 2026-06-23 | 用户头像下拉菜单增强：头像旁显示用户名、角色标签前加图标（👑🏅🧑‍💼）、下拉菜单改为悬停触发、移除分组显示 | [详情](details/034-profile-dropdown-enhance.md) |
| 035 | 2026-06-24 | 常见问答面板重构：移除问答列表，改为插画图标+外链按钮跳转飞书文档；经典前端注释掉 FAQ 面板 | [详情](details/035-faq-panel-redesign.md) |
| 036 | 2026-06-24 | 系统公告弹窗宽度由 26rem 加大到 36rem | `web/default/src/components/notification-popover.tsx` |
| 037 | 2026-06-24 | 订阅管理新增「全员订阅」功能：管理员可一键为所有启用用户绑定指定套餐，含后端批量处理、前端确认弹窗及 6 语言翻译 | [详情](details/037-subscribe-all-users.md) |
