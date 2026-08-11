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
| 022 | 2026-06-21 | 渠道页默认视图改为列表，视图切换按钮顺序调整为列表→卡片；桌面端默认分页调整为每页 50 条 | `web/default/src/features/channels/components/channels-table.tsx`、`web/default/src/components/data-table/toolbar/view-mode-toggle.tsx`、`web/src/features/channels/components/channels-table.tsx` |
| 023 | 2026-07-20 | 新增 LDAP 登录与飞书/钉钉同步：支持认证、绑定/解绑、按公司 OU 选择同步平台、配置凭据/邮箱后缀/自动订阅套餐及 7 语言界面；钉钉从 extensionAttribute12 读取 userid 并回填资料与部门层级。公司配置支持显示名称映射，登录、注册、绑定时写入并可按原名或显示名匹配，留空则使用 LDAP 公司名；LDAP 建号采用目录标准用户名，修复配置按钮遮挡、多公司套餐误匹配，并在保存配置时迁移已有用户公司字段 | [详情](details/024-ldap-login.md) |
| 024 | 2026-07-15 | 登录页默认使用 LDAP 登录：LDAP 表单内联展示替代弹窗，视图切换（LDAP/密码/OAuth）布局；用户名输入框下添加示例提示；删除未使用的 LDAPLoginDialog 组件；移除注册入口提示并简化标题布局 | [详情](details/025-ldap-default-login.md) |
| 025 | 2026-07-21 | 移除 User 表 name 字段，飞书同步的姓名改写入 display_name；LDAP 注册邮箱在配置飞书邮箱后缀时优先使用 username + 后缀拼接，未配置后缀时回退 LDAP 邮箱属性 | `model/user.go`、`service/feishu_sync.go`、`controller/ldap.go` |
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
| 037 | 2026-08-02 | 订阅管理增强：全员订阅按所选公司覆盖全部用户（含禁用、注销），重复执行覆盖同套餐有效订阅、保留已用额度且不叠加总额，并可恢复旧逻辑误清零的用量；确认框优化加载态与禁用状态；管理员可按人民币金额增加单个有效用户额度；套餐选择显示额度；套餐按公司限制可见范围，购买与批量订阅同步校验 | [详情](details/037-subscribe-all-users.md) |
| 038 | 2026-06-24 | 系统设置侧边栏菜单默认展开：新增 NavCollapsible.defaultOpen 属性，系统设置下所有分组设为默认展开 | `web/default/src/components/layout/types.ts`、`web/default/src/components/layout/components/nav-group.tsx`、`web/default/src/components/layout/config/system-settings.config.ts` |
| 039 | 2026-08-08 | 用户管理表格增强：用户名列展示头像、display_name、username，头像支持 open_id 跳转飞书并保留悬停资料卡；新增订阅额度、月度消耗、Token、请求次数、常用模型及每百万 Token 均价统计，均支持服务端排序；从 logs 聚合统计并抽取 useSharedUserColumns 供用户管理与数据总览共用；默认按注册时间降序，新增统计入口并移除删除入口；优化列顺序、列宽、部门省略提示和移动端弹出层警告；新增公司筛选与去重公司接口，公司列默认隐藏；无有效订阅时按自然月消耗加钱包余额展示额度；分页区按搜索/筛选条件展示启用、禁用人数 Badge，移除重复总计并补充多语言状态翻译 | [详情](details/039-user-management-table.md) |
| 040 | 2026-07-17 | 日志筛选日期范围选择器快捷预设从 5 个扩展为 13 个（含季度、半年等），新增 dayjs quarterOfYear 插件及 6 语言翻译；周范围统一按周一至周日计算，避免受 locale 的周起始日影响 | [详情](details/040-date-picker-presets.md) |
| 041 | 2026-06-25 | 飞书同步改用 directory/v1/employees/mget 单接口（替代原用户详情/工号/部门 3 个接口）；User 表飞书字段重构：employee_number→job_number，新增 description、gender、leader_id、mobile、job_title、departments、department_name、background_image、custom_field_values、join_date，移除旧部门拆分字段；custom_field_values 扁平化为 {field_key: text_value} 格式存储；修复 background_image 结构体类型错误（应为纯字符串） | `service/feishu_sync.go`、`model/user.go`、`controller/ldap.go` |
| 042 | 2026-08-05 | 用户管理表格头像悬停资料卡片：飞书风格（背景图 Banner + 大头像 + 姓名角色），展示职级、部门、入职日期、邮箱、工号、职务、职位描述等字段；手机号、出生日期、民族、探亲地仅超级管理员可见；支持 custom_field_values 解析；支持 gender 字段展示性别图标与悬浮提示；新增公司名称展示（右上角，用户类型补充 company 字段）；6 语言翻译；字段列表改为数据驱动，字段全部为空时一并隐藏分隔横线与字段区域；无背景图时默认 Banner 渐变统一改为蓝色系 rgb(0, 90, 210) → rgb(160, 210, 255) | [详情](details/042-user-profile-hover-card.md) |
| 043 | 2026-08-07 | 数据总览增强：完善部门统计、使用分析、排行、日志、导出和权限裁剪；新增飞书、钉钉、无平台多公司配置与数据隔离；钉钉接口限 30 QPS，90018 时有限退避并脱敏错误；目录限并发，成员统计批量聚合，部门树按需懒加载；统一公司模式并优化首屏并行加载、缓存和成员分桶；总 Token 按四类字段合计；平台成员按主部门去重；BP/部门负责人按公司范围查看统计；修复租户查询、Token 过期、禁用账号统计及无订阅额度展示；新增固定筛选器、未搜索引导和模型系列关键字聚合，四张系列/模型图表置顶 | [详情](details/043-data-overview.md) |
| 044 | 2026-07-08 | 新增「事业部 AI BP」（role=2）和「中心 AI BP」（role=3）两个用户角色，用户编辑界面支持角色修改，6 语言翻译 | [详情](details/044-add-bp-roles.md) |
| 045 | 2026-07-07 | 数据总览权限开放：BP 角色和部门负责人可访问数据总览，部门树按角色层级自动裁剪；部门负责人判定改为动态计算（open_id 匹配 departments 中 leader_id），不再依赖 is_dept_leader 字段；部门负责人改用 departments 中精确 department_id 定位，避免同名末级部门串路径 | [详情](details/045-data-overview-access.md) |
| 046 | 2026-06-30 | 概览页汇总卡片右侧面板改为订阅详情：展示当前订阅用量与总额、用量进度条（按百分比变色）、下次重置时间；无订阅时显示空状态；移除余额健康状态和续航天数；订阅计划名称以标签形式展示在标题右侧 | `web/default/src/features/dashboard/components/overview/summary-cards.tsx` |
| 047 | 2026-08-04 | 数据总览通知功能增强：支持数据报告周期推送、部门超额与请假超额提醒；新增供飞书报表通知服务调用的 HMAC 签名内部接口，按 BP 层级和显式部门负责人关系返回可访问公司/部门统计与接收人 open_id，避免管理员权限扩张，并支持合并用户同时具有的 BP 与负责人范围 | [详情](details/047-notify-settings.md) |
| 048 | 2026-07-02 | 数据总览导出功能增强：支持导出当前部门统计数据和图表为 Excel（含子部门详情页和用户列表页两个可选项）；图表通过 VChart 离屏渲染嵌入并优化尺寸与标题；导出费用按系统汇率换算人民币；用户列表导出支持仅在 Excel 中补充飞书未注册员工姓名，并优化未注册行样式、列宽与使用分析色带；导出弹窗与使用分析组件重构，6 语言翻译；修复使用分析图表费用换算变量作用域导致导出失败，并将子部门详情导出改为逐部门加载以避免并发查询错误 | [详情](details/048-data-overview-export.md) |
| 049 | 2026-07-01 | 模型定价编辑器支持本地货币输入：可切换以本地货币（如 ¥）输入价格，按系统汇率自动换算，保存时转回 USD；浮点精度优化；表达式阶梯定价模式同步支持本地货币输入与显示 | [详情](details/049-model-pricing-local-currency.md) |
| 050 | 2026-07-01 | 渠道表格移除「已使用 / 剩余」列及卡片视图中的余额展示，清理相关翻译 | [详情](details/050-remove-channel-balance-column.md) |
| 051 | 2026-07-02 | 个人资料页设置调整：移除邮箱旁分组显示、用户 ID 徽章改为默认色、API 请求数万前加空格；记录使用和错误日志 IP 地址默认开启且仅超级管理员可见并可切换 | [详情](details/051-profile-settings.md) |
| 052 | 2026-07-01 | 全站进度条分阶段变色统一：阈值统一为 50%/80%（绿→橙→红），涉及概览订阅、用户表格、数据总览；修复子部门统计 formatCNY 传入 undefined 导致崩溃 | [详情](details/052-progress-bar-color-unify.md) |
| 053 | 2026-07-23 | 新增或编辑未设置定价的模型时，补全价格和缓存读取价格默认开启，并补充定价通道初始化回归测试 | `web/src/features/system-settings/models/model-pricing-core.ts`、`web/src/features/system-settings/models/__tests__/pricing-initialization.test.ts` |
| 054 | 2026-07-01 | 模型广场与模型定价编辑器默认分页大小从 20 改为 100 | `web/default/src/features/pricing/constants.ts`、`web/default/src/features/system-settings/models/model-ratio-visual-editor.tsx` |
| 055 | 2026-08-07 | 模型广场优化：动态计费标签改为主题色；管理员可查看全部分组、分组倍率及 API 速率限制，普通用户在模型详情中仅能查看所属分组，并隐藏倍率与自动分组链；模型卡片计费标签旁改为显示当前用户所在分组 | [详情](details/055-pricing-square.md) |
| 056 | 2026-08-11 | 使用日志与请求内容功能优化：增强用户信息、权限控制、分页筛选、列布局和详情弹框；新增 IP、User-Agent、请求内容及生图 Prompt 展示，支持头像资料卡与飞书跳转；请求内容支持参数并排查看、独立滚动、复制和违规通知，相关接口收紧为仅超级管理员可用；优化费用、渠道标签、敏感信息显示及管理员「仅自己」视图；安全审计设置响应式布局，非工作时间请求支持违规通知；请求内容弹框折叠触发器改为 div，避免生成原生 button | [详情](details/056-usage-logs-user-column.md) |
| 057 | 2026-07-25 | 数据看板筛选与统计优化：顶部统一提供当天默认的时间范围、粒度、超级管理员用户名筛选及搜索/重置，模型分析与 Flow 共用；调整筛选区、Tab、统计卡片和模型分析布局，整合消耗分布、用户排行/趋势，用户消耗 Tab 仅管理员可见且普通用户不请求管理员接口；取消普通用户一个月查询限制；用户名匹配 username/display_name；quota_data 补充四类 Token，文本、音频、Realtime 与 Flow 聚合、看板汇总和图表统一按四类 Token 求和 | [详情](details/057-dashboard-filters.md) |
| 058 | 2026-07-23 ~ 08-04 | 新增在线生图功能：支持图片生成/编辑、参数配置、提示词预设、历史记录和 Playground 图片中继接口；补充 gpt-image-2 参数适配、模型专属参数、4K 尺寸预设、自定义尺寸校验、最多 8 张生成、生成进度/停止按钮与结果参数翻译优化；优化加载态、历史记录选中态、弹窗遮罩和大图性能；使用日志详情支持结构化展示图片生成参数并补齐翻译；侧边栏入口及 6 语言文案调整为“在线生图”；修复 OpenAI 图生图 JSON 转 multipart 上传、历史图一键带入图生图、生成进度与重置交互；生成历史改为服务端持久化存储：新增 ImageStudioGeneration 数据库模型与文件存储控制器，前端历史记录从 localStorage 迁移至服务端 API；图片文件存储由本地磁盘迁移至 MinIO，Bucket 支持环境变量配置且对象目录固定为 image；在线生图生成数量上限收紧为最多 4 张，并在后端图片请求校验中同步限制；在线生图生成/编辑请求不再发送 n 参数，多张生成改为并行单图请求，支持部分成功保留、灰色失败占位展示及消费汇总，不再弹出部分失败 warning toast；安全审计新增图片审计页，支持按时间和用户筛选全员生图记录、预览与下载图片、查看请求内容及生成详情，用户头像支持悬停资料卡片；生成详情与请求内容弹框统一为最大 78rem、视口 85% 高度，放大详情文字并将图片数量改为主题色标签；在线生图与图片审计大图预览统一图片和提示词宽度，整体按视口居中并优化图片区、提示词与操作栏间距；图片审计由独立开关控制并默认启用，安全审计入口、页面与接口收紧为仅超级管理员可访问，关闭开关时隐藏图片审计区块并拒绝查询；图片审计表格默认分页调整为每页 10 条，预览界面精简提示词展示并统一详情标签尺寸；图片审计请求内容列支持点击打开完整内容弹框，参考使用日志采用左右布局展示提示词与生成参数，并支持复制请求内容；弹框底部增加最多 4 张完整比例图片预览，点击可叠层查看大图且保留请求内容弹框，头像悬停加载用户资料卡片；移除图片审计表格详情列；图片审计默认选中本月，非工作时间请求默认筛选当天；新增原生 API 生图自动归档开关（默认关闭），成功响应可异步保存至在线生图历史且跳过 Playground 重复记录；生图记录新增 User-Agent 采集：在线生图 UI 存储路径取浏览器请求头、原生 API 中继路径取 RelayInfo.ClientApp，图片审计请求内容弹框在头像右侧单独一行完整展示 User-Agent（与使用日志口径一致，仅记录原始值不做映射）；历史上限拆分为独立的在线生图展示上限和存储上限，用户移除或清空历史仅隐藏记录并保留数据库与 MinIO 数据，只有超过存储上限时才永久裁剪最旧记录及图片 | [详情](details/058-online-image-generation.md) |
| 059 | 2026-07-04 | 排行榜 Token 可见性与热门模型 Tooltip 优化：所有 Token 数字仅超级管理员可见，热门模型悬停提示右侧显示连续排行编号，并更新 Token 排行相关 6 语言文案 | [详情](details/059-rankings-token-visibility.md) |
| 060 | 2026-08-05 | API 密钥界面优化：表格名称列改用截断单元格，创建密钥默认选择用户所属分组，表格与创建/编辑界面的分组倍率仅超级管理员可见；IP 限制列右侧新增「快速导入」下拉列（含 CC Switch 选项），将 CC Switch 从三点菜单迁移至新列；CC Switch 导入的官网和 API 端点改用当前页面 Origin，Codex 端点保留 `/v1`；6 语言翻译 | [详情](details/060-api-keys-name-truncate.md) |
| 061 | 2026-07-06 | 新增用户创建后自动订阅套餐：系统设置可选择自动绑定套餐，普通注册、LDAP 首次创建和后台新增用户后创建订阅并记录来源；设置选择框回显套餐名称 | [详情](details/061-registration-auto-subscribe.md) |
| 062 | 2026-07-05 | 渠道、模型、订阅管理、系统信息和系统设置入口权限收紧为仅超级管理员可见，普通管理员访问相关路由时跳转 403 | [详情](details/062-admin-entry-permissions.md) |
| 063 | 2026-07-06 | 本地访问限流默认关闭：全局 API/Web、关键接口和搜索限流默认禁用 | `common/init.go` |
| 064 | 2026-07-25 | 新增 AI 中转站周报统计脚本：按使用日志历史计费快照拆分输入、输出与缓存 Token/费用，汇总均价、缓存命中率及费用 Top 5 模型；支持上周/本周周期选择、内置模型归一化映射，并补充 Claude Sonnet 5；修正 Anthropic 缓存写入统计，优先采用显式 cache_write_tokens 并增强 Claude 语义识别，避免缓存 Token 重复计算 | `scripts/weekly_stats.py` |
| 065 | 2026-08-04 | 用户演示模式：个人设置开启后即时生效；渠道页隐藏分组/模型，模型广场遮罩价格、动态计费表达式/分组倍率，使用日志遮罩渠道；用户管理、数据总览、使用日志和安全审计统一以 `***` 脱敏用户名，并隐藏真实头像、资料卡和飞书跳转；更新通知配置不覆盖其他用户设置 | [详情](details/065-user-demo-mode.md) |
| 066 | 2026-07-26 | 合并 upstream/main 的 13 个提交：引入腾讯 TokenHub、Gemini 图片模型、统一 JSON 编辑器、渠道字段更新稳定性及模型定价保存修复；逐文件解决 6 个冲突，并保留品牌、渠道余额移除、演示模式和本地货币定价等二开功能 | [详情](details/066-upstream-merge.md) |
| 067 | 2026-08-10 | 全站分页参数隔离：各界面独立保存 pageSize，Usage Logs 与 Security Audit 的不同分区使用独立页码和每页数量；渠道桌面端默认每页 50 条 |
| 068 | 2026-08-10 | 图片审计新增实际使用渠道列：从请求日志回写真实渠道 ID，查询渠道名称并以使用日志样式展示彩色渠道标签；调整表格列顺序为时间、用户、耗时、图片、请求内容、渠道、模型、模式、参数、费用；耗时拆分为独立列 | `model/image_studio.go`、`controller/image_studio_storage.go`、`relay/image_studio_hook.go`、`web/src/features/security-audit/components/image-audit-columns.tsx`、`web/src/features/image-studio/api.ts`、`web/src/features/image-studio/hooks/use-image-studio.ts`、`web/src/features/image-studio/lib/storage.ts` | [详情](details/067-pagination-isolation.md) |
