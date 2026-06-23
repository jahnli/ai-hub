# 用户头像改用 avatar_url 字段

**日期**: 2026-06-23

## 涉及文件

- `controller/user.go` — `setupLogin` 和 `GetSelf` 响应数据中新增 `avatar_url` 字段，将数据库中的头像 URL 下发给前端
- `web/default/src/stores/auth-store.ts` — `AuthUser` 接口新增 `avatar_url?: string` 字段
- `web/default/src/features/profile/types.ts` — `UserProfile` 接口新增 `avatar_url?: string` 字段
- `web/default/src/components/profile-dropdown.tsx` — 导入 `AvatarImage`，导航栏触发器和下拉菜单头像在 `avatar_url` 存在时优先展示图片，无图时回退彩色首字母
- `web/default/src/features/profile/components/profile-header.tsx` — 导入 `AvatarImage`，个人资料页头像在 `avatar_url` 存在时优先展示图片
- `web/default/src/components/layout/components/mobile-drawer.tsx` — 移动端抽屉头像由硬编码 `/avatars/01.png` 改为使用用户的 `avatar_url`，无图时回退首字母
