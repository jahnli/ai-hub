# 模型广场优化

**日期**: 2026-08-03

## 涉及文件

- `web/default/src/features/pricing/components/model-card.tsx` — 「动态计费」标签颜色从橙色改为主题色。
- `web/default/src/components/status-badge.tsx` — 新增 primary variant 支持主题色状态标签。
- `controller/pricing.go` — 超级管理员可查看全部分组。
- `web/src/features/pricing/index.tsx` — 根据当前用户角色判断是否展示分组倍率，并将用户所属分组传入模型详情。
- `web/default/src/features/pricing/components/pricing-toolbar.tsx` — 向筛选侧边栏透传分组倍率可见性。
- `web/default/src/features/pricing/components/pricing-sidebar.tsx` — 分组筛选项按权限显示或隐藏倍率后缀。
- `web/src/features/pricing/components/model-details.tsx` — 模型详情按权限过滤分组：管理员可查看全部分组与倍率，普通用户仅能查看所属分组，并隐藏倍率与自动分组链。
