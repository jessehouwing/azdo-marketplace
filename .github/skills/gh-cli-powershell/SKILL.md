---
name: gh-cli-powershell
description: 'Avoid mangled/garbled text when passing multi-line or backtick-containing content (PR/issue bodies, commit messages, comments) to gh CLI or git on Windows PowerShell. USE WHEN: gh pr create, gh pr edit, gh issue create, gh pr comment, git commit -m, PowerShell backtick escaping, mangled PR description, missing backticks in body, unicode/garbled characters in PR body, `n or `r appearing literally, --body vs --body-file, multi-line strings in PowerShell.'
---

# gh CLI / git on Windows PowerShell — avoid mangled text

## The problem

PowerShell's escape character is the backtick (`` ` ``), NOT the backslash.
When a `--body`, `-m`, or similar argument is passed as a quoted string that
contains Markdown backticks (for code spans like `` `npm install` ``), or
sequences like `` `n ``, `` `r ``, `` `t ``, PowerShell interprets them as
escape sequences (newline, carriage return, tab, etc.) instead of literal
characters. This silently corrupts the text: code-formatting backticks
disappear, and letters following `` `n``/`` `r`` can be swallowed or replaced
(e.g. `` `pm run bundle` `` losing its `n`, or unicode artifacts appearing).

This has repeatedly mangled PR descriptions, commit messages, and comments
created via `gh pr create --body "..."`, `gh pr edit --body "..."`, or
similar inline-string invocations in this repo's environment.

## The fix: always use a file for multi-line or backtick-containing content

Never pass Markdown body text (anything with backticks, code spans, or
multiple lines) as an inline `--body` string argument. Instead:

1. Write the content with the `create` tool (or `Set-Content`) to a plain
   file — do NOT build it via PowerShell string interpolation/concatenation.
2. Pass it with the `--body-file` (or equivalent) flag.
3. Delete the temp file afterward.

```powershell
gh pr create --title "My title" --body-file "D:\path\to\body.md"
gh pr edit 276 --body-file "D:\path\to\body.md"
gh issue create --title "..." --body-file "D:\path\to\body.md"
gh pr comment 123 --body-file "D:\path\to\body.md"
Remove-Item "D:\path\to\body.md"
```

Use a scratch path such as `.git\<name>.md` (already git-ignored) or the
session workspace, and always remove it once the command succeeds.

## Commit messages

`git commit -m "..."` has the same risk if the message contains backticks or
`` `n``/`` `r``-like sequences. For any commit message with Markdown code
spans or multiple lines, write the message to a file and use
`git commit -F <file>` instead of `-m`, then delete the file.

## Quick rule of thumb

- Plain single-line text with no backticks → inline `-m "..."` /
  `--body "..."` is fine.
- Anything with backticks (code spans), or intentionally multi-line content
  → always write to a file first and use `-F` / `--body-file`.
- If a `gh`/`git` command already ran with inline text containing backticks,
  verify the result (e.g. `gh pr view <n> --json body -q .body`) before
  assuming it rendered correctly.
