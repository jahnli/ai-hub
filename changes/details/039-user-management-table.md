# 用户管理表格统计增强

**日期**: 2026-06-29

## 涉及文件

- `controller/user.go` — 用户列表和搜索接口返回订阅额度、月度总消耗、Token、请求次数和常用模型统计。
- `model/log.go` — 新增按用户和模型从 `logs` 表聚合月度用量的查询，支撑常用模型统计。
- `model/subscription.go` — 新增按用户批量查询有效订阅额度汇总，用于用户管理表格展示订阅额度进度。
- `web/default/src/features/users/components/users-columns.tsx` — 用户管理表格新增月度总消耗、Token、请求次数、常用模型列，并将请求数提示改为使用 `logs` 聚合结果。
- `web/default/src/features/users/types.ts` — 用户类型补充订阅额度与月度统计字段。
- `web/default/src/i18n/locales/en.json` — 补充用户管理新增统计列英文文案。
- `web/default/src/i18n/locales/fr.json` — 补充用户管理新增统计列法文文案。
- `web/default/src/i18n/locales/ja.json` — 补充用户管理新增统计列日文文案。
- `web/default/src/i18n/locales/ru.json` — 补充用户管理新增统计列俄文文案。
- `web/default/src/i18n/locales/vi.json` — 补充用户管理新增统计列越南文文案。
- `web/default/src/i18n/locales/zh.json` — 补充用户管理新增统计列中文文案。
