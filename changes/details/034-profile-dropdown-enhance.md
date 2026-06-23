# 用户头像下拉菜单增强：角色图标、用户名显示、悬停交互

**日期**: 2026-06-23

## 涉及文件

- `web/default/src/lib/roles.ts` — 新增 `ROLE_ICONS` 映射和 `getRoleIcon()` 函数（👑超级管理员、🏅管理员、🧑‍💼用户、👁️访客）
- `web/default/src/hooks/use-user-display.ts` — hook 新增返回 `roleIcon` 字段
- `web/default/src/components/profile-dropdown.tsx` — 头像旁显示用户名（响应式隐藏）、角色标签前加图标、下拉菜单改为悬停触发（150ms 延迟关闭）、移除分组显示
- `web/default/src/components/layout/components/public-header.tsx` — 代码格式化
