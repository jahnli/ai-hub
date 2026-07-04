# 数据看板筛选优化

**日期**: 2026-07-04

## 涉及文件

- `web/default/src/features/dashboard/index.tsx` — 模型分析与 Flow 共用顶部筛选栏，支持时间范围、时间粒度和超级管理员用户名称筛选；默认筛选时间范围改为当天；筛选区与模块 Tab 位置互换并保持同一行显示，微调时间选择器宽度，移除模型偏好设置按钮并新增重置按钮；统计卡片加载骨架屏顺序同步调整，补充均价卡片占位。
- `web/default/src/features/dashboard/hooks/use-dashboard-config.tsx` — 数据看板统计卡片顺序调整为 Token、总费用、均价、请求次数、平均 RPM、平均 TPM；总额度文案更名为总费用；均价按总费用 / 总 Token 数 × 1,000,000 计算。
- `web/default/src/features/dashboard/components/models/log-stat-cards.tsx` — 均价卡片使用与总费用一致的格式化方式展示为金额/MT，并将统计卡片大屏布局扩展为 6 列。
- `web/default/src/features/dashboard/lib/filters.ts` — 数据看板默认时间范围从滚动 1 天改为当天 00:00:00 到 23:59:59。
- `model/usedata.go` — 模型调用分析用户名筛选支持通过用户表匹配 username 与 display_name 后回查 quota_data。
- `model/usedata_flow.go` — Flow 数据查询复用用户名/display_name 筛选逻辑，保持与模型分析筛选行为一致。
- `web/default/src/i18n/locales/en.json` — 新增用户名称文案并清理数据看板筛选相关英文翻译。
- `web/default/src/i18n/locales/zh.json` — 新增用户名称文案并清理数据看板筛选相关中文翻译。
- `web/default/src/i18n/locales/fr.json` — 新增用户名称文案并清理数据看板筛选相关法文翻译。
- `web/default/src/i18n/locales/ja.json` — 新增用户名称文案并清理数据看板筛选相关日文翻译。
- `web/default/src/i18n/locales/ru.json` — 新增用户名称文案并清理数据看板筛选相关俄文翻译。
- `web/default/src/i18n/locales/vi.json` — 新增用户名称文案并清理数据看板筛选相关越南文翻译。
