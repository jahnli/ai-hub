# 使用日志表格用户列增强：头像、悬停资料卡片、列标题与列顺序优化

**日期**: 2026-07-01

## 涉及文件

- `model/log.go` — Log 结构体新增 DisplayName/AvatarUrl 只读字段；GetAllLogs 批量查询用户头像和显示名填充日志列表
- `web/default/src/features/usage-logs/components/columns/common-logs-columns.tsx` — 用户列重写：显示头像+显示名+悬停资料卡片（UserProfileHoverCard），列顺序调整（用户→模型→耗时→渠道→Token）；费用列订阅抵扣记录改为直接显示抵扣金额，悬停提示订阅来源
- `web/default/src/features/usage-logs/data/schema.ts` — Zod schema 新增 display_name、avatar_url 字段
- `web/default/src/features/usage-logs/types.ts` — UserInfo 接口扩展完整用户详情字段（供悬停卡片使用）
- `web/default/src/i18n/locales/en.json` — 新增 "Timing / First Token" 翻译
- `web/default/src/i18n/locales/zh.json` — 新增 "耗时 / 首字" 翻译
