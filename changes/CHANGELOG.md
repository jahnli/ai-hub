# 变更日志

仅记录二开修改，用于追踪本地定制与上游的差异。详细文件列表见 [details/](details/) 目录。

| 编号 | 日期 | 说明 | 详情 |
|------|------|------|------|
| 001 | 2026-07-05 | 默认前端固定为 default 并彻底移除 classic：后端主题切换、classic embed、Docker 构建阶段和前端 workspace 均清理 | [详情](details/001-default-frontend-only.md) |
| 002 | 2026-07-09 | 全局品牌重命名 New API → AI Gateway，并补齐后端中继、文档、Electron 与前端脚本中的品牌残留 | [详情](details/002-brand-rename.md) |
| 003 | 2026-06-18 ~ 06-23 | 首页定制：移除 Footer/区块/开源卡片/CTA推广区，HeroViewPricing 按钮，模型标签替换，三步上手优化与连接线动画，Hero 右侧轨道动画替换 Terminal Demo，底部飞书联系信息，统计微光动画与 glass 卡片 UI，加宽 Header 与内容区，轨道动画左移，Hero 渐变标题微光扫光，Footer/CTA/Hero 相关翻译清理 | [详情](details/003-homepage-customization.md) |
| 004 | 2026-06-19 | 修复前端 dev server 端口冲突 | `web/default/rsbuild.config.ts` |
| 005 | 2026-06-19 | 移除开发环境 devtools 面板 | `web/default/src/routes/__root.tsx` |
| 006 | 2026-06-19 | 删除 About 页面及所有相关引用 | [详情](details/007-remove-about.md) |
| 007 | 2026-06-19 | 删除兑换码管理界面及前端引用 | [详情](details/008-remove-redemption-frontend.md) |
| 008 | 2026-06-19 | 删除后端兑换码功能及数据库表 | [详情](details/009-remove-redemption-backend.md) |
| 009 | 2026-07-16 | Toast UI 优化：关闭按钮移至右上角；状态色替换为固定配色并统一由全局语义颜色变量管理（不再跟随主题预设） | `web/default/src/styles/index.css`、`web/default/src/components/ui/sonner.tsx`、`web/default/src/styles/theme.css` |
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
| 021 | 2026-07-01 | 个人资料页订阅列表重构：从 ProfileHeader 内嵌改为独立卡片组件，横向网格布局（sm:2列 lg:3列），每个订阅独立圆角卡片展示状态、剩余天数、配额进度；进度条按用量分阶段变色（绿→橙→红） | `web/default/src/features/profile/components/subscription-card.tsx`、`web/default/src/features/profile/components/profile-header.tsx`、`web/default/src/features/profile/index.tsx` |
| 022 | 2026-06-21 | 渠道页默认视图改为列表，视图切换按钮顺序调整为列表→卡片 | `web/default/src/features/channels/components/channels-table.tsx`、`web/default/src/components/data-table/toolbar/view-mode-toggle.tsx` |
| 023 | 2026-07-20 | 新增 LDAP 登录与用户同步（飞书/钉钉）：后端 LDAP 认证/绑定/解绑及平台用户同步服务、前端登录与系统设置、7 语言翻译；支持按公司 OU 读取 LDAP 用户公司并选择飞书或钉钉同步，钉钉从 LDAP extensionAttribute12 获取 userid 并回填用户资料与部门层级；支持配置平台凭据、邮箱后缀和自动订阅套餐；LDAP 登录创建账号时改用目录返回的标准用户名并取消登录输入值兜底；修复 LDAP 公司同步添加配置按钮滚动到底部时被页面底部区域遮挡导致无法点击 | [详情](details/024-ldap-login.md) |
| 024 | 2026-07-15 | 登录页默认使用 LDAP 登录：LDAP 表单内联展示替代弹窗，视图切换（LDAP/密码/OAuth）布局；用户名输入框下添加示例提示；删除未使用的 LDAPLoginDialog 组件；移除注册入口提示并简化标题布局 | [详情](details/025-ldap-default-login.md) |
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
| 037 | 2026-07-09 | 订阅管理增强：支持全员订阅，并允许管理员按人民币金额为单个有效用户订阅增加额度；用户订阅管理选择套餐时显示套餐额度而非价格；订阅套餐支持按公司限制可见范围，购买入口同步校验用户公司 | [详情](details/037-subscribe-all-users.md) |
| 038 | 2026-06-24 | 系统设置侧边栏菜单默认展开：新增 NavCollapsible.defaultOpen 属性，系统设置下所有分组设为默认展开 | `web/default/src/components/layout/types.ts`、`web/default/src/components/layout/components/nav-group.tsx`、`web/default/src/components/layout/config/system-settings.config.ts` |
| 039 | 2026-07-08 | 用户管理表格调整：用户名列增加头像、display_name 与 username 展示位置互换，头像点击支持通过 open_id 跳转飞书且悬停仍显示资料卡片；列顺序优化；新增订阅额度、月度总消耗、Token、请求次数和常用模型统计，统计数据改从 logs 表聚合；支持服务端排序订阅额度与用量统计列；总费用右侧新增每百万 Token 均价列并支持服务端排序，均价列头新增说明图标；请求次数格式化统一；抽取 useSharedUserColumns hook，用户管理与数据总览部门用户表格共用同一列定义；默认排序由额度降序改为注册时间降序；操作列新增「统计」按钮打开用户统计弹窗；移除用户管理三点菜单中的删除入口及删除弹窗；调整用户列表列顺序与列宽，部门列超出省略并悬停显示完整路径；修复表格长文本移动端弹出层触发器的 Base UI 警告 | [详情](details/039-user-management-table.md) |
| 040 | 2026-07-17 | 日志筛选日期范围选择器快捷预设从 5 个扩展为 13 个（含季度、半年等），新增 dayjs quarterOfYear 插件及 6 语言翻译；周范围统一按周一至周日计算，避免受 locale 的周起始日影响 | [详情](details/040-date-picker-presets.md) |
| 041 | 2026-06-25 | 飞书同步改用 directory/v1/employees/mget 单接口（替代原用户详情/工号/部门 3 个接口）；User 表飞书字段重构：employee_number→job_number，新增 description、gender、leader_id、mobile、job_title、departments、department_name、background_image、custom_field_values、join_date，移除旧部门拆分字段；custom_field_values 扁平化为 {field_key: text_value} 格式存储；修复 background_image 结构体类型错误（应为纯字符串） | `service/feishu_sync.go`、`model/user.go`、`controller/ldap.go` |
| 042 | 2026-07-08 | 用户管理表格头像悬停资料卡片：飞书风格（背景图 Banner + 大头像 + 姓名角色），展示职级、部门、入职日期、邮箱、工号、职务、职位描述等字段；手机号、出生日期、民族、探亲地仅超级管理员可见；支持 custom_field_values 解析；支持 gender 字段展示性别图标与悬浮提示；6 语言翻译 | [详情](details/042-user-profile-hover-card.md) |
| 043 | 2026-07-18 | 数据总览页增强：新增子部门统计与使用分析板块（模型排行/费用占比/每日趋势/模型趋势/均价趋势）；图表改为纵向柱状图；加载骨架屏；侧边栏移至「控制台」分区；Token 格式化使用中文单位；统计卡片改为分割式紧凑布局（参照数据看板风格）；部门用户板块新增用户消耗排行 Top 10 柱状图和用户消耗占比 Top 10 饼图；部门用户表格支持服务端排序；统计聚合改用 quota_data 并按系统汇率换算人民币费用；部门均价改为基于人民币费用计算；Token 详情支持 tooltip 展示；请求趋势图高度修复；请求次数格式化统一；部门用户表格「已用额度/总额度」列头新增说明图标，提示额度数据固定为当前自然月且不受筛选时间影响；部门用户表格新增「统计」按钮，点击打开用户统计弹窗：独立时间筛选、个人使用分析图表（模型调用分布饼图替代柱状图、移除均价/Token 分布图表）与近期调用日志；用户统计弹窗的近期调用日志改用独立接口按 user_id 精确查询，避免用户名包含匹配串入其他用户日志并兼容用户改名后的历史日志；近期调用日志补充请求内容加载；统计弹窗宽度加宽为 1360px；使用分析组件重构为纯展示组件，移除内部时间参数依赖；部门用户表格新增注册状态筛选（全部/已注册/未注册），后端支持 registration_status 参数过滤；未注册用户禁用统计按钮；部门用户列表类型补充 open_id 以复用头像飞书跳转；导出 Excel 注册状态列国际化；部门成员缓存 TTL 独立为 30 分钟（原共用部门树 5 分钟），GetDepartmentUsers/Rankings 统一复用详情缓存减少重复请求；部门用户表格操作列固定右侧、默认按额度降序排序；额度列头说明图标改为通用 DataTableColumnHeader description 机制；部门用户标题右侧新增总人数、已注册、未注册彩色统计标签；子部门统计表格新增「统计」按钮，点击打开子部门统计弹窗展示统计卡片与使用分析；部门用户列表和子部门统计新增部门级使用日志弹窗，展示选中时间内部门员工日志；DepartmentStatsCards 提取为独立组件复用；子部门统计表格新增均价列并下发子部门每百万 Token 均价，均价列头新增说明图标；部门用户表格总费用右侧新增每百万 Token 均价列并支持排序；新增使用人数、使用占比和人均 Token 指标，活跃阈值支持按统计区间天数通过环境变量公式动态计算并展示公式说明，子部门表格支持按使用人数排序；使用分析支持通过环境变量将多个原始模型合并为统一模型，并在合并后统计模型趋势、调用分布和消耗排行；修复 AI BP/中心 BP 打开部门用户统计后近期调用日志触发管理员用户详情接口导致无权限提示的问题；注册人数、注册状态及相关统计改为按筛选结束时间与 users.created_at 判断，筛选结束后注册的员工标记为未注册 | [详情](details/043-data-overview.md) |
| 044 | 2026-07-08 | 新增「事业部 AI BP」（role=2）和「中心 AI BP」（role=3）两个用户角色，用户编辑界面支持角色修改，6 语言翻译 | [详情](details/044-add-bp-roles.md) |
| 045 | 2026-07-07 | 数据总览权限开放：BP 角色和部门负责人可访问数据总览，部门树按角色层级自动裁剪；部门负责人判定改为动态计算（open_id 匹配 departments 中 leader_id），不再依赖 is_dept_leader 字段；部门负责人改用 departments 中精确 department_id 定位，避免同名末级部门串路径 | [详情](details/045-data-overview-access.md) |
| 046 | 2026-06-30 | 概览页汇总卡片右侧面板改为订阅详情：展示当前订阅用量与总额、用量进度条（按百分比变色）、下次重置时间；无订阅时显示空状态；移除余额健康状态和续航天数；订阅计划名称以标签形式展示在标题右侧 | `web/default/src/features/dashboard/components/overview/summary-cards.tsx` |
| 047 | 2026-06-28 | 数据总览新增通知设置：支持数据报告周期推送（按周/按月/每周每月）、部门超额提醒和请假超额提醒（仅部门负责人可见）；含后端 CRUD 接口与前端弹窗组件，6 语言翻译 | [详情](details/047-notify-settings.md) |
| 048 | 2026-07-02 | 数据总览导出功能增强：支持导出当前部门统计数据和图表为 Excel（含子部门详情页和用户列表页两个可选项）；图表通过 VChart 离屏渲染嵌入并优化尺寸与标题；导出费用按系统汇率换算人民币；用户列表导出支持仅在 Excel 中补充飞书未注册员工姓名，并优化未注册行样式、列宽与使用分析色带；导出弹窗与使用分析组件重构，6 语言翻译；修复使用分析图表费用换算变量作用域导致导出失败，并将子部门详情导出改为逐部门加载以避免并发查询错误 | [详情](details/048-data-overview-export.md) |
| 049 | 2026-07-01 | 模型定价编辑器支持本地货币输入：可切换以本地货币（如 ¥）输入价格，按系统汇率自动换算，保存时转回 USD；浮点精度优化；表达式阶梯定价模式同步支持本地货币输入与显示 | [详情](details/049-model-pricing-local-currency.md) |
| 050 | 2026-07-01 | 渠道表格移除「已使用 / 剩余」列及卡片视图中的余额展示，清理相关翻译 | [详情](details/050-remove-channel-balance-column.md) |
| 051 | 2026-07-02 | 个人资料页设置调整：移除邮箱旁分组显示、用户 ID 徽章改为默认色、API 请求数万前加空格；记录使用和错误日志 IP 地址默认开启且仅超级管理员可见并可切换 | [详情](details/051-profile-settings.md) |
| 052 | 2026-07-01 | 全站进度条分阶段变色统一：阈值统一为 50%/80%（绿→橙→红），涉及概览订阅、用户表格、数据总览；修复子部门统计 formatCNY 传入 undefined 导致崩溃 | [详情](details/052-progress-bar-color-unify.md) |
| 053 | 2026-07-01 | 新增模型定价时补全价格和缓存读取价格默认开启 | `web/default/src/features/system-settings/models/model-pricing-core.ts` |
| 054 | 2026-07-01 | 模型广场与模型定价编辑器默认分页大小从 20 改为 100 | `web/default/src/features/pricing/constants.ts`、`web/default/src/features/system-settings/models/model-ratio-visual-editor.tsx` |
| 055 | 2026-07-08 | 模型广场优化：「动态计费」标签颜色从橙色改为主题色，超级管理员可查看全部分组并可查看分组倍率；StatusBadge 新增 primary variant | [详情](details/055-pricing-square.md) |
| 056 | 2026-07-14 | 使用日志表格、详情弹框与筛选区优化：用户列增强，API 直接返回头像、显示名和 open_id，头像悬停资料卡片并支持点击跳转飞书；任务日志用户头像点击改为飞书跳转；「耗时」列标题改为「耗时 / 首字」、列顺序优化；时间、渠道、令牌和详情列宽度微调；费用列订阅抵扣记录改为直接显示费用金额，悬停提示订阅来源；新增 IP 地址列并在移动端展示；详情列固定在右侧，错误日志详情文字显示错误色；渠道标签自动配色排除红色并兼容 slate 颜色；日志详情弹框宽度调整为屏幕 50%；默认分页大小统一改为每页 10 条；普通日志页隐藏冗余页标题并默认展开高级筛选；新增请求内容记录功能：后端新增 request_message 表存储每次中继请求的用户提示词与模型参数，前端表格新增「请求内容」列（位于 IP 列前）展示最近一条用户消息并支持点击查看完整对话；系统设置新增开关控制是否记录请求内容；列宽微调（用户名缩短、模型列加宽、费用列收窄）；修复请求内容列在「查看」列可见性下拉中不显示的问题（补充 accessorFn）；请求内容列联动敏感信息开关，眼睛图标关闭时隐藏内容；记录原始 User-Agent 到使用日志并仅向超级管理员展示，Token 和请求内容列超出省略；请求内容弹框将模型/格式/时间信息移至请求 ID 上方并优化请求 ID 字号与间距；请求内容列与管理端批量查询接口收紧为仅超级管理员可见；请求内容批量查询改为 POST body 传参，避免分页 100 时 request_ids 过长导致线上网关 502；请求内容和详情字段改为仅悬停对应文本时显示下划线；请求内容弹框新增违规通知，可向用户发送飞书安全审计提醒；请求内容弹框改为请求内容与请求参数左右并排展示，请求参数默认展开并缩窄宽度，弹框高度可按场景放大；请求参数区域支持独立滚动并保留 JSON 横向阅读格式；使用日志 schema 补充 gender 字段供资料卡片展示性别图标；普通日志高级筛选移除令牌名称筛选，角色筛选改为可输入角色名称且下拉仅显示角色名称；普通日志筛选区改为两排紧凑布局，调整时间与类型控件宽度及筛选项顺序，并将全部/仅自己范围切换移至第二排；模型名称筛选改为忽略首尾空格的包含匹配；修复请求内容弹框高度计算，左右区域均支持独立滚轮滚动 | [详情](details/056-usage-logs-user-column.md) |
| 057 | 2026-07-17 | 数据看板筛选与统计卡片优化：顶部前置时间范围、时间粒度、超级管理员用户名称筛选和搜索/重置按钮，模型分析与 Flow 共用筛选条件，默认时间范围改为当天；统计卡片顺序调整为 Token、总费用、均价、请求次数、平均 RPM、平均 TPM，并将总额度更名为总费用；用户名筛选支持匹配 display_name，筛选区与模块 Tab 位置互换并保持同一行显示，微调时间选择器宽度，移除模型偏好设置按钮并清理相关翻译；补齐总费用统计描述翻译；模型调用分析整合消耗分布、用户消耗排行和用户消耗趋势为 Tab，并统一使用顶部时间筛选器；用户消耗图表支持头像和 display_name 展示，排行与趋势合并为「用户消耗」左右布局；用户消耗 Tab 限制为管理员和超级管理员可见，并阻止普通用户请求管理员接口；移除普通用户数据看板 1 个月查询限制 | [详情](details/057-dashboard-filters.md) |
| 058 | 2026-07-16 | 新增在线生图功能：支持图片生成/编辑、参数配置、提示词预设、历史记录和 Playground 图片中继接口；补充 gpt-image-2 参数适配、模型专属参数、4K 尺寸预设、自定义尺寸校验、最多 8 张生成、生成进度/停止按钮与结果参数翻译优化；优化加载态、历史记录选中态、弹窗遮罩和大图性能；使用日志详情支持结构化展示图片生成参数并补齐翻译；侧边栏入口及 6 语言文案调整为“在线生图”；修复 OpenAI 图生图 JSON 转 multipart 上传、历史图一键带入图生图、生成进度与重置交互；生成历史改为服务端持久化存储：新增 ImageStudioGeneration 数据库模型与文件存储控制器，前端历史记录从 localStorage 迁移至服务端 API；图片文件存储由本地磁盘迁移至 MinIO，Bucket 支持环境变量配置且对象目录固定为 image；在线生图生成数量上限收紧为最多 4 张，并在后端图片请求校验中同步限制；在线生图生成/编辑请求不再发送 n 参数，多张生成改为并行单图请求，支持部分成功保留、灰色失败占位展示及消费汇总，不再弹出部分失败 warning toast | [详情](details/058-online-image-generation.md) |
| 059 | 2026-07-04 | 排行榜 Token 可见性与热门模型 Tooltip 优化：所有 Token 数字仅超级管理员可见，热门模型悬停提示右侧显示连续排行编号，并更新 Token 排行相关 6 语言文案 | [详情](details/059-rankings-token-visibility.md) |
| 060 | 2026-07-10 | API 密钥界面优化：表格名称列改用截断单元格，创建密钥默认选择用户所属分组，表格与创建/编辑界面的分组倍率仅超级管理员可见；IP 限制列右侧新增「快速导入」下拉列（含 CC Switch 选项），将 CC Switch 从三点菜单迁移至新列；6 语言翻译 | [详情](details/060-api-keys-name-truncate.md) |
| 061 | 2026-07-06 | 新增用户创建后自动订阅套餐：系统设置可选择自动绑定套餐，普通注册、LDAP 首次创建和后台新增用户后创建订阅并记录来源；设置选择框回显套餐名称 | [详情](details/061-registration-auto-subscribe.md) |
| 062 | 2026-07-05 | 渠道、模型、订阅管理、系统信息和系统设置入口权限收紧为仅超级管理员可见，普通管理员访问相关路由时跳转 403 | [详情](details/062-admin-entry-permissions.md) |
| 063 | 2026-07-06 | 本地访问限流默认关闭：全局 API/Web、关键接口和搜索限流默认禁用 | `common/init.go` |
| 064 | 2026-07-16 | 新增 AI 中转站周报统计脚本：按使用日志历史计费快照拆分输入、输出与缓存 Token/费用，汇总均价、缓存命中率及费用 Top 5 模型；支持上周/本周周期选择、内置模型归一化映射，并补充 Claude Sonnet 5 | `scripts/weekly_stats.py` |
