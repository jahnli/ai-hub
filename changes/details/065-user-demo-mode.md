# 新增用户演示模式并隐藏渠道、定价与用户身份敏感信息

**日期**: 2026-07-23 ~ 08-04

## 涉及文件

- `controller/user.go` — 支持保存用户演示模式，并基于现有设置更新通知配置，避免覆盖语言、侧边栏和扣费偏好等独立设置
- `dto/user_settings.go` — 在用户设置中新增演示模式字段
- `web/src/features/channels/components/channel-card.tsx` — 卡片视图在演示模式下遮罩渠道分组信息
- `web/src/features/channels/components/channels-columns.tsx` — 表格列在演示模式下遮罩渠道分组与模型信息
- `web/src/features/channels/components/channels-provider.tsx` — 向渠道页组件提供当前用户的演示模式状态
- `web/src/features/channels/components/channels-table.tsx` — 演示模式开启时禁用敏感信息显示切换
- `web/src/features/channels/lib/index.ts` — 导出渠道敏感信息遮罩工具
- `web/src/features/channels/lib/channel-visibility.ts` — 集中定义渠道敏感信息遮罩及可见性判断
- `web/src/features/pricing/components/dynamic-pricing-breakdown.tsx` — 遮罩动态计费表达式和阶梯价格
- `web/src/features/pricing/components/model-card-grid.tsx` — 将价格遮罩状态传递到模型卡片
- `web/src/features/pricing/components/model-card.tsx` — 遮罩卡片中的价格、动态计费表达式和分组倍率
- `web/src/features/pricing/components/model-details.tsx` — 遮罩模型详情中的价格、计费表达式和分组倍率
- `web/src/features/pricing/components/pricing-columns.tsx` — 遮罩定价表格中的各类价格和动态计费表达式
- `web/src/features/pricing/components/pricing-sidebar.tsx` — 遮罩定价侧边栏中的分组倍率
- `web/src/features/pricing/components/pricing-table.tsx` — 将价格遮罩状态传递到定价表格列
- `web/src/features/pricing/components/pricing-toolbar.tsx` — 演示模式开启时禁用价格显示切换
- `web/src/features/pricing/index.tsx` — 读取演示模式并统一控制模型广场敏感信息展示
- `web/src/features/profile/components/tabs/notification-tab.tsx` — 在个人设置中新增演示模式开关
- `web/src/features/profile/hooks/use-profile.ts` — 更新资料后同步刷新认证用户设置，使演示模式立即生效
- `web/src/features/profile/types.ts` — 补充演示模式相关前端类型
- `web/src/hooks/use-demo-mode.ts` — 新增响应式演示模式 Hook
- `web/src/lib/demo-mode.ts` — 解析用户演示模式设置并定义统一价格遮罩
- `web/src/features/usage-logs/components/columns/common-logs-columns.tsx` — 使用日志渠道列接入演示模式，开启时遮罩渠道名称及悬停提示中的名称
- `web/src/features/usage-logs/lib/channel-visibility.ts` — 集中处理使用日志渠道名称在演示模式和敏感信息关闭状态下的显示规则
- `web/src/i18n/locales/en.json` — 补充英文演示模式文案
- `web/src/i18n/locales/fr.json` — 补充法文演示模式文案
- `web/src/i18n/locales/ja.json` — 补充日文演示模式文案
- `web/src/i18n/locales/ru.json` — 补充俄文演示模式文案
- `web/src/i18n/locales/vi.json` — 补充越南文演示模式文案
- `web/src/i18n/locales/zh-TW.json` — 补充繁体中文演示模式文案
- `web/src/i18n/locales/zh.json` — 补充简体中文演示模式文案

## 2026-08-04 用户身份脱敏扩展

- `web/src/lib/demo-mode.ts` — 新增统一的演示模式用户名遮罩，将用户名固定显示为 `***`
- `web/src/features/users/components/shared-user-columns.tsx` — 用户管理与数据总览部门用户列表共用的用户名列接入演示模式，隐藏显示名、用户名、备注、头像、资料悬停和飞书跳转
- `web/src/features/usage-logs/components/columns/common-logs-columns.tsx` — 普通使用日志用户列在演示模式下仅显示 `***`，并停止加载用户详情及隐藏头像和跳转入口
- `web/src/features/usage-logs/components/columns/task-logs-columns.tsx`、`web/src/features/usage-logs/components/usage-logs-mobile-card.tsx` — 任务日志与移动端使用日志同步遮罩用户名和身份入口
- `web/src/features/security-audit/components/off-hours-columns.tsx`、`web/src/features/security-audit/components/off-hours-detail-dialog.tsx` — 非工作时段审计用户列及日志详情标题遮罩用户名，同时保留原始用户名用于后台查询
- `web/src/features/security-audit/components/image-audit-columns.tsx` — 图片审计用户列遮罩用户名，并禁用真实头像和资料悬停请求
- `web/src/lib/__tests__/demo-mode.test.ts`、`web/src/features/users/components/__tests__/username-visibility.test.tsx`、`web/src/features/security-audit/components/__tests__/user-visibility.test.tsx` — 覆盖 `***` 遮罩、普通模式原值保留，以及用户管理和安全审计不泄露姓名、头像与链接的回归测试
