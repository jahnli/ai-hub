# 数据看板筛选优化

**日期**: 2026-07-02

## 涉及文件

- `web/default/src/features/dashboard/index.tsx` — 模型分析与 Flow 共用顶部筛选栏，支持时间范围、时间粒度和超级管理员用户名称筛选；筛选区与模块 Tab 位置互换，微调时间选择器宽度，移除模型偏好设置按钮并新增重置按钮。
- `model/usedata.go` — 模型调用分析用户名筛选支持通过用户表匹配 username 与 display_name 后回查 quota_data。
- `model/usedata_flow.go` — Flow 数据查询复用用户名/display_name 筛选逻辑，保持与模型分析筛选行为一致。
- `web/default/src/i18n/locales/en.json` — 新增用户名称文案并清理数据看板筛选相关英文翻译。
- `web/default/src/i18n/locales/zh.json` — 新增用户名称文案并清理数据看板筛选相关中文翻译。
- `web/default/src/i18n/locales/fr.json` — 新增用户名称文案并清理数据看板筛选相关法文翻译。
- `web/default/src/i18n/locales/ja.json` — 新增用户名称文案并清理数据看板筛选相关日文翻译。
- `web/default/src/i18n/locales/ru.json` — 新增用户名称文案并清理数据看板筛选相关俄文翻译。
- `web/default/src/i18n/locales/vi.json` — 新增用户名称文案并清理数据看板筛选相关越南文翻译。
