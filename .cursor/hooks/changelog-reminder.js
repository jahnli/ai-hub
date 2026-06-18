// changelog-reminder.js — Cursor stop 钩子
// 检查 git 是否有实质性代码变更，有则提醒 AI 追加 CHANGELOG 记录。
const { execSync } = require('child_process')
const path = require('path')

function getChangedFiles() {
  const files = new Set()
  try {
    execSync('git diff --cached --name-only', { encoding: 'utf8', cwd: process.cwd() })
      .trim().split('\n').filter(Boolean).forEach(f => files.add(f))
    execSync('git diff --name-only', { encoding: 'utf8', cwd: process.cwd() })
      .trim().split('\n').filter(Boolean).forEach(f => files.add(f))
    execSync('git ls-files --others --exclude-standard', { encoding: 'utf8', cwd: process.cwd() })
      .trim().split('\n').filter(Boolean).forEach(f => files.add(f))
  } catch {
    // 非 git 仓库或无变更
    return []
  }
  return [...files]
}

// 不需要记录 changelog 的文件
const trivialPatterns = [
  /^changes\/CHANGELOG\.md$/,
  /^\.cursor\//,
  /^\.gitignore$/,
  /package-lock\.json$/,
  /bun\.lockb$/,
]

function hasSubstantiveChanges(files) {
  return files.some(f => {
    const rel = f.replace(/\\/g, '/')
    return !trivialPatterns.some(p => p.test(rel))
  })
}

const changedFiles = getChangedFiles()

if (changedFiles.length === 0) {
  process.exit(0)
}

if (!hasSubstantiveChanges(changedFiles)) {
  // 仅有无关文件变更，跳过
  process.exit(0)
}

const preview = changedFiles.slice(0, 5).join(', ')
const suffix = changedFiles.length > 5 ? ` …（共 ${changedFiles.length} 个文件）` : ''

process.stdout.write(JSON.stringify({
  followup_message: `检测到代码变更：${preview}${suffix}。请按照 AGENTS.md 规则 6 在 changes/CHANGELOG.md 追加变更记录。`,
}))
