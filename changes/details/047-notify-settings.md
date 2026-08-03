# 数据总览通知设置与报表服务接口

**日期**: 2026-08-03

## 涉及文件

- `model/report_notify_setting.go` — 新增 ReportNotifySetting GORM 模型（report_notify_settings 表），含 GetByUserId 和 Upsert 方法
- `model/main.go` — AutoMigrate 注册新模型
- `controller/report_notify_setting.go` — 新增 GET/PUT /api/report-notify-setting/self 接口，含 frequency/quota/quota_leave 验证
- `router/api-router.go` — 注册 report-notify-setting 路由组，以及使用 HMAC 签名认证的 `/api/internal/report-notify/user-reports` 内部接口
- `web/default/src/features/data-overview/types.ts` — 新增 ReportNotifySetting 类型
- `web/default/src/features/data-overview/api.ts` — 新增 getReportNotifySetting / updateReportNotifySetting API 函数
- `web/default/src/features/data-overview/components/notify-settings-dialog.tsx` — 新增通知设置弹窗组件（数据报告周期、部门超额提醒、请假超额提醒）
- `web/default/src/features/data-overview/index.tsx` — 数据总览标题栏搜索按钮旁新增通知设置按钮
- `web/default/src/i18n/locales/{en,zh,fr,ja,ru,vi}.json` — 6 语言翻译（13 个新 key）
- `.env.example` — 新增飞书报表通知服务 HMAC 签名密钥配置说明
- `controller/report_notify_internal.go` — 校验内部报表请求参数并返回用户可访问的统计报表
- `middleware/report_notify.go` — 新增 HMAC-SHA256 签名认证、时间戳防重放及请求体大小限制
- `middleware/report_notify_test.go` — 覆盖有效签名、签名异常、过期时间戳、缺少配置与超大请求体
- `service/report_notify.go` — 按用户角色和部门负责人权限解析数据总览范围，复用部门统计逻辑生成报表与飞书接收人 open_id
- `service/report_notify_test.go` — 覆盖事业部 BP、部门负责人和超级管理员的范围解析及统计结果
