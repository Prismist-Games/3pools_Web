---
description: >
  Manually trigger a write to the setting design documents. Use when the user types
  /save-setting, or says "更新文档", "保存设定", "写入文档".
---

# /save-setting

## Steps

1. Read `design_docs/setting-current-state.md`.

2. Scan the conversation since the last document write. Identify unwritten changes:
   - Confirmed decisions (user gave clear acceptance: "好", "定了", "就这样")
   - New dead ends
   - Reasoning chain or answer shape updates
   - Open questions surfaced or resolved
   - Items moved to/from 搁置中

3. If the file content doesn't match what you expect from the conversation (possible
   user edit outside the conversation), mention this before writing. Don't silently
   overwrite.

4. Update `setting-current-state.md`. Format:
   ```
   ## 已确定        ← confirmed decisions, by topic (ONLY on explicit user confirmation)
   ## 死胡同        ← rejected directions by failure type
   ## 搁置中        ← waiting on current exploration to resolve
   ## 未解决        ← open questions actively being worked on
   ## 设计原则      ← guiding principles
   ## 当前思考链    ← reasoning chain, answer shape, next step
   ```
   Dead-end entries need: **failure type header** + **description** + **boundary test**
   ("新方向能逃出此类，如果…") + table of specific entries.

5. Check whether a **topic unit concluded** during this conversation (an open question
   got resolved, a direction was confirmed or rejected, the user shifted to a new
   question). If yes, also read and update `design_docs/setting-evolution-log.md`
   using the format in `references/evolution-log-protocol.md`.
   If no topic unit concluded, skip the evolution log.

6. Tell the user what was written, in one or two sentences.

If nothing has changed since the last write, say so.
