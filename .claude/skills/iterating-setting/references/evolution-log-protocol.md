# Evolution Log Protocol

Operational details for maintaining setting design documents.

## Files

| File | Purpose | When to read |
|------|---------|-------------|
| `design_docs/setting-current-state.md` | Snapshot: confirmed decisions, open questions, design principles, reasoning chain | Every session start |
| `design_docs/setting-evolution-log.md` | Process: dead ends, session narratives | Every session start |
| `design_docs/setting-evolution-archive.md` | Full narratives of archived sessions | Only when reviewing old details |

## Current State File Structure

```
# 设定当前状态

## 已确定              ← all confirmed decisions, organized by topic
## 未解决              ← all open questions
## 设计原则            ← guiding principles for decision-making
## 当前思考链          ← the active reasoning chain and next step
```

Update this file in real-time when:
- A decision is confirmed or reversed
- A new open question is identified or one gets resolved
- The reasoning chain advances to a new step
- A design principle is added or modified

## Evolution Log Structure

```
# 设定演变记录

## 死胡同登记          ← permanent, never deleted
## 近期会话            ← full detail, last ~3 sessions
## 归档               ← compressed, key takeaways only
```

**死胡同登记**: Table of rejected directions with reasons and dates. Checked before
proposing any new direction. If your idea is structurally similar to a dead end,
don't propose it — or explicitly acknowledge the similarity and explain why this
time is different.

**近期会话**: Full session narratives with step-by-step reasoning. Keep last ~3 sessions.

**归档**: Compressed summaries of older sessions. Full narratives moved to
`design_docs/setting-evolution-archive.md`.

## Session Entry Format

```markdown
### [YYYY-MM-DD] 简短标题
**起点**: 这次从哪个问题/方向开始
**演变**:
1. [想法/方向] → [结果/发现]
2. [下一步] → [结果/发现]
...
**确认**: 确认了什么（如果有）
**否定**: 否定了什么，以及为什么
**纠正**: 用户纠正了什么错误方向（最重要的部分——这些是不能重复的错误）
**打开的问题**: 留下了什么未解决的
```

## Archive Format

When compressing a session for 归档:

```markdown
### [YYYY-MM-DD] 简短标题 (归档)
**关键发现**: [one line]
**关键纠正**: [one line, if any]
```

Before archiving:
1. Move any dead ends into the 死胡同登记 table
2. Move the full narrative to `design_docs/setting-evolution-archive.md`

## Maintenance

At the start of each session, after reading both files:
1. Check if there are more than ~3 full session entries in 近期会话
2. If so, compress the oldest into 归档 format
3. Move its full narrative to `design_docs/setting-evolution-archive.md`
4. Ensure dead ends are in 死胡同登记
5. Ensure current state file is up to date
