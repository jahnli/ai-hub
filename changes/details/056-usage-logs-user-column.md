# 使用日志表格用户列增强：头像、悬停资料卡片、飞书跳转、列标题与列顺序优化、请求内容记录

**日期**: 2026-07-06

## 涉及文件

- `model/log.go` — Log 结构体新增 DisplayName/AvatarUrl/OpenId 只读字段；GetAllLogs 批量查询用户头像、显示名和 open_id 填充日志列表，支持前端通过头像跳转飞书聊天
- `model/task.go` — Task 临时展示字段补充 open_id，供任务日志用户列跳转飞书使用
- `model/user.go` — UserBase 缓存结构生成时同步写入 open_id，保证任务列表填充用户信息时可复用缓存
- `model/user_cache.go` — 用户基础缓存结构和 DB 回源填充补充 open_id
- `controller/task.go` — 管理端任务列表批量填充用户 open_id
- `dto/task.go` — TaskDto 增加 open_id 响应字段
- `relay/relay_task.go` — 任务模型转 DTO 时透传 open_id
- `web/default/src/lib/utils.ts` — 新增 buildFeishuUserChatUrl 工具，统一构造飞书 openId 聊天链接
- `web/default/src/features/home/components/sections/cta.tsx` — 首页底部飞书联系卡复用统一的飞书聊天链接构造函数
- `web/default/src/features/usage-logs/components/columns/common-logs-columns.tsx` — 用户列重写：显示头像+显示名+悬停资料卡片（UserProfileHoverCard），头像点击改为按 open_id 跳转飞书；列顺序调整（用户→模型→耗时→渠道→Token）；时间、渠道、令牌和详情列宽度微调；费用列订阅抵扣记录改为直接显示抵扣金额，悬停提示订阅来源；新增 IP 地址列，支持敏感信息隐藏、复制和完整内容悬浮提示；详情列固定在表格右侧；错误日志详情文字显示错误色；渠道标签自动配色排除红色并将 slate 映射为 neutral，避免不受支持的 Badge variant 类型错误；请求内容列收紧为仅超级管理员可见；新增 User-Agent 列展示原始请求头且仅超级管理员可见；Token 与请求内容列超出时省略显示；请求内容和详情字段的下划线改为仅悬停对应文本时显示，避免悬停同一行时多个字段同时出现下划线
- `web/default/src/features/usage-logs/components/columns/task-logs-columns.tsx` — 任务日志用户列头像点击改为通过 open_id 跳转飞书，不再打开用户信息弹框
- `web/default/src/features/usage-logs/components/dialogs/details-dialog.tsx` — 日志详情弹框桌面端宽度调整为屏幕宽度 50%
- `web/default/src/features/usage-logs/components/usage-logs-mobile-card.tsx` — 移动端使用日志卡片在令牌前展示 IP 地址字段
- `web/default/src/features/usage-logs/components/usage-logs-table.tsx` — 自定义行渲染合并固定列样式，确保详情列的表头和内容单元格都固定在右侧；默认分页大小统一改为每页 10 条
- `web/default/src/features/usage-logs/components/logs-filter-toolbar.tsx` — 高级筛选默认展开，避免筛选条件入口默认折叠
- `web/default/src/features/usage-logs/index.tsx` — 普通日志页不再渲染冗余页标题，任务日志仍保留任务日志标题与子分类切换
- `web/default/src/features/usage-logs/section-registry.tsx` — 普通日志导航标题统一为 Usage Logs
- `web/default/src/components/layout/components/section-page-layout.tsx` — 页面布局在无标题、操作区和面包屑时跳过顶部 header 容器，避免空元素继续占据空间
- `web/default/src/features/usage-logs/data/schema.ts` — Zod schema 新增 display_name、avatar_url、open_id 字段
- `web/default/src/features/usage-logs/types.ts` — UserInfo 接口扩展完整用户详情字段并补充 open_id，TaskLog 补充 open_id
- `web/default/src/i18n/locales/en.json` — 新增 "Timing / First Token"、"Request Content"、"Record request content" 等翻译
- `web/default/src/i18n/locales/zh.json` — 新增 "耗时 / 首字"、"请求内容"、"记录请求内容" 等翻译
- `model/request_message.go` — 新增 RequestMessage 模型（request_id 关联 logs 表），存储用户提示词和模型参数
- `controller/request_message.go` — 管理员和普通用户批量查询 request_message 接口；新增 POST body 批量查询解析，避免分页 100 时 request_ids 拼入 URL 导致线上网关 502
- `service/request_message.go` — 中继请求后异步记录用户输入：提取多模态内容为占位符、截断超长对话、序列化参数
- `controller/relay.go` — 中继入口调用 RecordRequestMessage 记录请求内容
- `router/api-router.go` — 新增 /api/request_message 和 /api/request_message/self 路由；管理端批量查询接口改为 RootAuth，仅超级管理员可读取任意用户请求内容；补充 /batch 与 /self/batch POST 路由承载批量 request_ids
- `common/constants.go` — 新增 RecordRequestMessageEnabled 全局开关
- `model/option.go` — 系统选项注册和运行时更新 RecordRequestMessageEnabled
- `model/main.go` — AutoMigrate 注册 RequestMessage 模型
- `web/default/src/features/usage-logs/components/dialogs/request-content-dialog.tsx` — 请求内容详情弹窗，展示完整用户消息列表和请求参数；模型/格式/时间信息移至请求 ID 上方，请求 ID 字号放大并去除两行之间多余间距
- `web/default/src/features/usage-logs/components/request-messages-provider.tsx` — RequestMessagesProvider 上下文，按当前页 request_id 批量加载请求内容；新增 canViewRequestContent 控制，非超级管理员不发起请求内容批量查询
- `web/default/src/features/usage-logs/api.ts` — 新增 getRequestMessages API 调用；请求内容批量查询改为 POST /batch 并通过 body 传递 request_ids，避免分页 100 时 query 过长
- `web/default/src/features/usage-logs/types.ts` — 新增 RequestMessage 接口定义；LogOtherData 复用 user_agent 字段承载中继请求的原始 User-Agent
- `web/default/src/features/usage-logs/components/usage-logs-table.tsx` — 包裹 RequestMessagesProvider，按当前页日志批量加载请求内容；基于当前用户角色传入请求内容可见性，仅超级管理员允许加载
- `web/default/src/features/system-settings/maintenance/log-settings-section.tsx` — 日志设置新增「记录请求内容」开关
- `web/default/src/features/system-settings/operations/section-registry.tsx` — 运维设置传入 RecordRequestMessageEnabled 默认值
- `web/default/src/features/system-settings/operations/index.tsx` — 运维设置默认值补充 RecordRequestMessageEnabled
- `web/default/src/features/system-settings/types.ts` — OperationsSettings 类型补充 RecordRequestMessageEnabled
- `relay/common/relay_info.go` — RelayInfo 新增 ClientApp 字段，在基础中继信息生成时保存原始 User-Agent
- `relay/common/client_app.go` — 新增 DetectClientApp，返回请求携带的原始 User-Agent，不做客户端名称映射
- `relay/common/client_app_test.go` — 覆盖 DetectClientApp 原始 User-Agent 返回、缺失头与 nil 安全场景
- `service/log_info_generate.go` — 文本类使用日志 other 字段写入 user_agent，供前端表格展示
- `web/default/src/i18n/locales/en.json`、`web/default/src/i18n/locales/zh.json`、`web/default/src/i18n/locales/fr.json`、`web/default/src/i18n/locales/ja.json`、`web/default/src/i18n/locales/ru.json`、`web/default/src/i18n/locales/vi.json` — 新增 User-Agent 表头翻译
- `web/default/src/components/dialog.tsx` — Dialog 组件样式调整
