# CLAUDE.md — AI Gateway 项目规范

上游项目：new-api

## 强制要求：使用 Read 工具读取 AGENTS.md

不得将 `@AGENTS.md` 视为已加载；Claude Code 无法可靠地内联该导入。

在进行任何规划、编码、审查或回答项目问题之前，必须先使用 Read 工具完整读取仓库根目录的 `AGENTS.md`，并等待读取完成。这是每个会话和每个新任务的首个动作。

规则：

- 不得仅依赖记忆、摘要或本文件开始工作。
- 即使之前的轮次提及过 `AGENTS.md`，也不得跳过读取。
- 不得用 grep、glob 或局部浏览代替完整读取。
- 读取后，在后续工作中遵守 `AGENTS.md` 的全部规则。
- 如果任务涉及 `web/`，编辑前还必须完整读取 `web/AGENTS.md`。
