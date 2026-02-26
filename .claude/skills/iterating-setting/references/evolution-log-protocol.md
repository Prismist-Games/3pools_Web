# Evolution Log Protocol

Operational details for maintaining `setting-evolution-log.md` — the single
source of truth for the setting's history and current state.

## Files

| File | Purpose | When to read |
|------|---------|-------------|
| `setting-evolution-log.md` | Everything: dead ends, current state, reasoning chain, sessions | Every session start |
| `setting-evolution-archive.md` | Full narratives of archived sessions | Only when reviewing old details |

## Log Structure

```
# 设定演变记录

## 死胡同登记          ← permanent, never deleted
## 当前状态            ← all confirmed decisions, open questions, design principles
## 当前思考链          ← the active reasoning chain and next step
## 近期会话            ← full detail, last ~3 sessions
## 归档               ← compressed, key takeaways only
```

**死胡同登记**: Table of rejected directions with reasons and dates. Checked before
proposing any new direction. If your idea is structurally similar to a dead end,
don't propose it — or explicitly acknowledge the similarity and explain why this
time is different.

**当前状态**: Organized by topic (主题, 机器, 不安, 异品, 部门, etc.). Contains
all confirmed decisions, all open questions, and design principles. Updated whenever
a decision is confirmed, reversed, or a new question opens. This replaces the
former `setting-design-notes.md`.

**当前思考链**: The active line of reasoning — what's been established step by step,
and what the next question is. The most important section for picking up mid-problem.

**近期会话**: Full session narratives with step-by-step reasoning. Keep last ~3 sessions.

**归档**: Compressed summaries of older sessions. Full narratives moved to
`setting-evolution-archive.md`.

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
2. Move the full narrative to `setting-evolution-archive.md`

## Maintenance

At the start of each session, after reading the log:
1. Check if there are more than ~3 full session entries in 近期会话
2. If so, compress the oldest into 归档 format
3. Move its full narrative to `setting-evolution-archive.md`
4. Ensure dead ends are in 死胡同登记
5. Ensure 当前状态 and 当前思考链 are up to date
