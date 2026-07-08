# 模型广场优化

**日期**: 2026-07-08

## 涉及文件

- `web/default/src/features/pricing/components/model-card.tsx` — 将「动态计费」标签颜色从橙色改为主题色
- `web/default/src/components/status-badge.tsx` — 新增 primary variant 供主题色标签复用
- `controller/pricing.go` — 超级管理员可查看全部分组
- `web/default/src/features/pricing/components/pricing-sidebar.tsx` — 分组筛选项移除倍率后缀显示
- `web/default/src/features/pricing/components/pricing-toolbar.tsx` — 移动端筛选抽屉不再传递分组倍率
- `web/default/src/features/pricing/index.tsx` — 模型广场侧栏和工具栏不再传递分组倍率
