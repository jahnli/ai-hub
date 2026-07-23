# 新增用户演示模式并隐藏渠道与定价敏感信息

**日期**: 2026-07-23

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
- `web/src/i18n/locales/en.json` — 补充英文演示模式文案
- `web/src/i18n/locales/fr.json` — 补充法文演示模式文案
- `web/src/i18n/locales/ja.json` — 补充日文演示模式文案
- `web/src/i18n/locales/ru.json` — 补充俄文演示模式文案
- `web/src/i18n/locales/vi.json` — 补充越南文演示模式文案
- `web/src/i18n/locales/zh-TW.json` — 补充繁体中文演示模式文案
- `web/src/i18n/locales/zh.json` — 补充简体中文演示模式文案
