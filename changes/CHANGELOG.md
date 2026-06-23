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
| 009 | 2026-06-19 | Toast 关闭按钮位置由左上角改为右上角 | `web/default/src/styles/index.css` |
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

