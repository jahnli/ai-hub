---
name: git-push-skip-lint
description: >-
  当执行 git push 到 GitHub 或 GitLab 因提交信息不规范、commit message lint、commitlint、push rule、server-side hook
  等提交信息校验失败时使用。先正常推送；仅在失败原因明确是提交信息/lint 校验时，自动使用 `-o skip-lint` 重试同一远程和分支。
---

# Git Push Skip Lint Fallback

用于处理 GitHub/GitLab 推送时因为提交信息不规范或远端 lint/push rule 拒绝导致的失败。

## 适用场景

当用户要求推送分支，或普通推送命令失败，并且错误输出明确包含以下含义之一时使用：

- `commit message`、`commit-msg`、`commitlint`
- `message does not follow`、`invalid commit message`
- `push rule`、`pre-receive hook declined`
- `lint`、`lint failed`、`skip-lint`
- GitLab/GitHub 远端 hook 因提交信息格式拒绝推送

## 不适用场景

不要因为以下错误使用 `-o skip-lint`：

- 远端有新提交导致 `fetch first`、`non-fast-forward`、`rejected`、`behind`
- 权限、认证、网络、远端不存在、分支保护要求 PR
- 测试失败、构建失败、安全扫描失败
- 用户没有要求推送，或当前操作不是 git push

这些情况应按正常 Git 流程处理，不要跳过校验。

## 工作流程

1. 先执行普通推送命令，保持用户指定的 remote、branch 和 refspec 不变。

   示例：

   ```bash
   git push origin dev2
   ```

2. 如果普通推送成功，直接结束。

3. 如果普通推送失败，读取完整错误输出，判断是否明确是提交信息不规范或 lint/push rule 拒绝。

4. 只有在确认是提交信息/lint 校验失败时，使用同一 remote、branch/refspec，加上 `-o skip-lint` 重试。

   示例：

   ```bash
   git push origin dev2 -o skip-lint
   ```

   或等价写法：

   ```bash
   git push -o skip-lint origin dev2
   ```

5. 如果 `-o skip-lint` 仍失败，停止并把错误原因告知用户，不要继续尝试 force push 或修改 Git 配置。

## 安全规则

- 不要自动使用 `--force`、`--force-with-lease`。
- 不要修改 git config。
- 不要改写提交历史、不要 amend、不要 rebase，除非用户明确要求。
- `-o skip-lint` 只用于远端 hook 支持 push option 的场景。
- 如果错误是远端落后或冲突，必须先 fetch/merge/rebase 并让用户确认策略，不要用 `skip-lint` 掩盖。

## 输出格式

成功时简洁说明：

- 普通推送是否失败
- 是否已用 `-o skip-lint` 重试
- 最终推送到哪个 remote/branch

失败时说明：

- 普通推送失败原因
- 是否符合 `skip-lint` 条件
- 如果重试也失败，给出远端返回的关键错误
