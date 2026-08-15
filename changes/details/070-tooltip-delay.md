# 全系统 UI Tooltip 延迟统一

**日期**: 2026-08-15

## 涉及文件

- `web/src/components/ui/tooltip.tsx` — 将公共 `TooltipProvider` 的默认弹出延迟由 0ms 调整为 100ms
- `web/src/components/ui/sidebar.tsx` — 将侧边栏 Tooltip 的显式延迟统一为 100ms
- `web/src/components/long-text.tsx` — 将长文本完整内容 Tooltip 的延迟统一为 100ms
- `web/src/features/data-overview/index.tsx` — 将数据总览页面 Tooltip 的延迟统一为 100ms
- `web/src/features/channels/components/channels-columns.tsx` — 将渠道表格中原有 200ms、300ms 延迟统一为 100ms
- `web/src/features/usage-logs/components/columns/common-logs-columns.tsx` — 将使用日志中原有 300ms 延迟统一为 100ms
- `web/src/features/playground/components/message/message-actions.tsx` — 将 Playground 消息操作 Tooltip 的延迟由 300ms 调整为 100ms
- `web/src/features/image-studio/lib/model-params/seedream/params.tsx` — 将在线生图参数说明 Tooltip 的延迟统一为 100ms
