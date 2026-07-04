# 使用日志表格用户列增强：头像、悬停资料卡片、列标题与列顺序优化

**日期**: 2026-07-04

## 涉及文件

- `model/log.go` — Log 结构体新增 DisplayName/AvatarUrl 只读字段；GetAllLogs 批量查询用户头像和显示名填充日志列表
- `web/default/src/features/usage-logs/components/columns/common-logs-columns.tsx` — 用户列重写：显示头像+显示名+悬停资料卡片（UserProfileHoverCard），列顺序调整（用户→模型→耗时→渠道→Token）；时间、渠道、令牌和详情列宽度微调；费用列订阅抵扣记录改为直接显示抵扣金额，悬停提示订阅来源；新增 IP 地址列，支持敏感信息隐藏、复制和完整内容悬浮提示；详情列固定在表格右侧；错误日志详情文字显示错误色；渠道标签自动配色排除红色
- `web/default/src/features/usage-logs/components/dialogs/details-dialog.tsx` — 日志详情弹框桌面端宽度调整为屏幕宽度 50%
- `web/default/src/features/usage-logs/components/usage-logs-mobile-card.tsx` — 移动端使用日志卡片在令牌前展示 IP 地址字段
- `web/default/src/features/usage-logs/components/usage-logs-table.tsx` — 自定义行渲染合并固定列样式，确保详情列的表头和内容单元格都固定在右侧
- `web/default/src/features/usage-logs/data/schema.ts` — Zod schema 新增 display_name、avatar_url 字段
- `web/default/src/features/usage-logs/types.ts` — UserInfo 接口扩展完整用户详情字段（供悬停卡片使用）
- `web/default/src/i18n/locales/en.json` — 新增 "Timing / First Token" 翻译
- `web/default/src/i18n/locales/zh.json` — 新增 "耗时 / 首字" 翻译
