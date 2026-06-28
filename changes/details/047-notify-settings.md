# 数据总览通知设置

**日期**: 2026-06-28

## 涉及文件

- `model/report_notify_setting.go` — 新增 ReportNotifySetting GORM 模型（report_notify_settings 表），含 GetByUserId 和 Upsert 方法
- `model/main.go` — AutoMigrate 注册新模型
- `controller/report_notify_setting.go` — 新增 GET/PUT /api/report-notify-setting/self 接口，含 frequency/quota/quota_leave 验证
- `router/api-router.go` — 注册 report-notify-setting 路由组，使用 UserAuth + DataOverviewAccessCheck 中间件
- `web/default/src/features/data-overview/types.ts` — 新增 ReportNotifySetting 类型
- `web/default/src/features/data-overview/api.ts` — 新增 getReportNotifySetting / updateReportNotifySetting API 函数
- `web/default/src/features/data-overview/components/notify-settings-dialog.tsx` — 新增通知设置弹窗组件（数据报告周期、部门超额提醒、请假超额提醒）
- `web/default/src/features/data-overview/index.tsx` — 数据总览标题栏搜索按钮旁新增通知设置按钮
- `web/default/src/i18n/locales/{en,zh,fr,ja,ru,vi}.json` — 6 语言翻译（13 个新 key）
