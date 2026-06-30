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
| 032 | 2026-06-27 | 首页底部飞书卡片支持点击跳转飞书聊天：后端通过 FEISHU_SUPPORT_OPEN_ID 环境变量暴露 openId，前端动态构造 applink 链接；未配置时隐藏卡片 | `setting/system_setting/feishu.go`、`controller/misc.go`、`web/default/src/features/home/components/sections/cta.tsx` |
| 033 | 2026-06-23 | 登录页切换按钮与登录按钮大小统一，去掉多余的 h-11 rounded-lg | `web/default/src/features/auth/sign-in/components/user-auth-form.tsx` |
| 034 | 2026-06-23 | 用户头像下拉菜单增强：头像旁显示用户名、角色标签前加图标（👑🏅🧑‍💼）、下拉菜单改为悬停触发、移除分组显示 | [详情](details/034-profile-dropdown-enhance.md) |
| 035 | 2026-06-24 | 常见问答面板重构：移除问答列表，改为插画图标+外链按钮跳转飞书文档；经典前端注释掉 FAQ 面板 | [详情](details/035-faq-panel-redesign.md) |
| 036 | 2026-06-24 | 系统公告弹窗宽度由 26rem 加大到 36rem | `web/default/src/components/notification-popover.tsx` |
| 037 | 2026-06-24 | 订阅管理增强：支持全员订阅，并允许管理员按人民币金额为单个有效用户订阅增加额度 | [详情](details/037-subscribe-all-users.md) |
| 038 | 2026-06-24 | 系统设置侧边栏菜单默认展开：新增 NavCollapsible.defaultOpen 属性，系统设置下所有分组设为默认展开 | `web/default/src/components/layout/types.ts`、`web/default/src/components/layout/components/nav-group.tsx`、`web/default/src/components/layout/config/system-settings.config.ts` |
| 039 | 2026-06-30 | 用户管理表格调整：用户名列增加头像、display_name 与 username 展示位置互换；列顺序优化；新增订阅额度、月度总消耗、Token、请求次数和常用模型统计，统计数据改从 logs 表聚合；支持服务端排序订阅额度与用量统计列 | [详情](details/039-user-management-table.md) |
| 040 | 2026-06-24 | 日志筛选日期范围选择器快捷预设从 5 个扩展为 13 个（含季度、半年等），新增 dayjs quarterOfYear 插件及 6 语言翻译 | [详情](details/040-date-picker-presets.md) |
| 041 | 2026-06-25 | 飞书同步改用 directory/v1/employees/mget 单接口（替代原用户详情/工号/部门 3 个接口）；User 表飞书字段重构：employee_number→job_number，新增 description、gender、leader_id、mobile、job_title、departments、department_name、background_image、custom_field_values、join_date，移除旧部门拆分字段；custom_field_values 扁平化为 {field_key: text_value} 格式存储；修复 background_image 结构体类型错误（应为纯字符串） | `service/feishu_sync.go`、`model/user.go`、`controller/ldap.go` |
| 042 | 2026-06-25 | 用户管理表格头像悬停资料卡片：飞书风格（背景图 Banner + 大头像 + 姓名角色），展示职级、部门、入职日期、邮箱、工号、职务、职位描述等字段；手机号、出生日期、民族、探亲地仅超级管理员可见；支持 custom_field_values 解析；6 语言翻译 | [详情](details/042-user-profile-hover-card.md) |
| 043 | 2026-06-30 | 数据总览页增强：新增子部门统计与使用分析板块（模型排行/费用占比/每日趋势/模型趋势/均价趋势）；图表改为纵向柱状图；加载骨架屏；侧边栏移至「控制台」分区；Token 格式化使用中文单位；统计卡片改为分割式紧凑布局（参照数据看板风格）；部门用户板块新增用户消耗排行 Top 10 柱状图和用户消耗占比 Top 10 饼图；部门用户表格支持服务端排序 | [详情](details/043-data-overview.md) |
| 044 | 2026-06-27 | 新增「事业部 BP」（role=2）和「中心 BP」（role=3）两个用户角色，用户编辑界面支持角色修改，6 语言翻译 | [详情](details/044-add-bp-roles.md) |
| 045 | 2026-06-30 | 数据总览权限开放：BP 角色和部门负责人可访问数据总览，部门树按角色层级自动裁剪；部门负责人判定改为动态计算（open_id 匹配 departments 中 leader_id），不再依赖 is_dept_leader 字段 | [详情](details/045-data-overview-access.md) |
| 046 | 2026-06-27 | 概览页汇总卡片右侧面板改为订阅详情：展示当前订阅用量与总额、用量进度条（按百分比变色）、下次重置时间；无订阅时显示空状态；移除余额健康状态和续航天数 | `web/default/src/features/dashboard/components/overview/summary-cards.tsx` |
| 047 | 2026-06-28 | 数据总览新增通知设置：支持数据报告周期推送（按周/按月/每周每月）、部门超额提醒和请假超额提醒（仅部门负责人可见）；含后端 CRUD 接口与前端弹窗组件，6 语言翻译 | [详情](details/047-notify-settings.md) |
| 048 | 2026-06-29 | 数据总览新增导出功能：支持导出当前部门统计数据和图表为 Excel（含子部门详情页和用户列表页两个可选项），图表通过 VChart 离屏渲染嵌入，6 语言翻译 | [详情](details/048-data-overview-export.md) |
| 049 | 2026-06-30 | 模型定价编辑器支持本地货币输入：可切换以本地货币（如 ¥）输入价格，按系统汇率自动换算，保存时转回 USD；浮点精度优化 | [详情](details/049-model-pricing-local-currency.md) |
