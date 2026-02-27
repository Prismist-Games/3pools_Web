# Evolution Log Protocol

Operational details for maintaining setting design documents.

## Files

| File | Purpose | When to read |
|------|---------|-------------|
| `design_docs/setting-current-state.md` | Snapshot: confirmed decisions, dead ends, open questions, design principles, reasoning chain | Every new session start |
| `design_docs/setting-evolution-log.md` | Session history: how reasoning unfolded over time | New session start if needed; on demand when user asks about history |

There is no separate archive file. Everything lives in these two files.

## Current State File Structure

```
# 设定当前状态

## 已确认              ← confirmed decisions, organized by topic
## 死胡同              ← rejected directions with reasons and dates; checked before proposing anything new
## 未解决              ← open questions
## 设计原则            ← guiding principles for decision-making
## 当前思考链          ← the active reasoning chain and next step
```

Update this file silently when:
- A decision is confirmed or reversed → update 已确认
- A direction is rejected → add to 死胡同 immediately
- A new open question is identified or one gets resolved → update 未解决
- The reasoning chain advances → update 当前思考链
- A design principle is added or modified → update 设计原则

## Evolution Log Structure

```
# 设定演变记录

[entries in chronological order, oldest first]
```

Write when a topic unit concludes — an open question gets resolved, a direction gets
rejected, or the user shifts to a different question. Don't wait for the conversation
to end. Each entry covers one topic unit. Write what matters — the key turn, what was
tried, what was concluded, what was corrected. Skip narration of exploration that
didn't lead anywhere significant.

## Session Entry Format

```markdown
### [YYYY-MM-DD] 简短标题
**起点**: 这次从哪个问题/方向开始
**演变**:
1. [想法/方向] → [结果/发现]
2. [下一步] → [结果/发现]
**确认**: 确认了什么（如果有）
**否定**: 否定了什么，以及为什么（also add these to 死胡同 in current-state）
**纠正**: 用户纠正了什么错误方向（最重要——这些是不能重复的错误）
**打开的问题**: 留下了什么未解决的
```

Only include sections that have content. An entry with no corrections doesn't need a
**纠正** line.

## Maintenance

When writing to the evolution log, review older entries. If an entry's detail has
become redundant — because the decisions it records are already captured in
current-state and there's nothing in the reasoning path worth preserving — trim it
to a single summary line. Do this in place; do not move content to a separate file.

Trim aggressively only when the log is getting long enough to be unwieldy. A log
with 5-10 full entries is fine. Don't compress just for the sake of it.
