# Current-State File Protocol

Format and management rules for `design_docs/setting-current-state.md`.

## File Structure

```
## 已确定        ← confirmed decisions, organized by topic
## 死胡同        ← rejected directions with failure types and boundary tests
## 搁置中        ← items waiting on current exploration to resolve
## 未解决        ← open questions (not same as 搁置中: these are actively being worked on)
## 设计原则      ← guiding principles for decision-making
## 当前思考链    ← active reasoning chain, answer shape, and next step
```

## Reading

Once, at the start of a NEW conversation. Already in context after that.

## Writing

Silently, without announcing it. Update only the relevant section.

**Triggers:**
- User explicitly accepts a direction: "好，就这样", "定了", "有道理，用这个"
- User rejects or reverses something previously accepted
- A new dead end is identified — add to the dead-end registry immediately
- A new open question surfaces or gets resolved
- The reasoning chain moves to a new step

**Do NOT write** after every exchange. Exploration and back-and-forth is not a decision.
"有意思", "嗯", "继续说" are engagement signals, not acceptance. Only write to 已确定
when the user gives clear, unambiguous confirmation. When in doubt, it's not a confirmation.

**When a confirmed decision is reversed**, check whether other confirmed decisions
were built on it. Flag any that lose their foundation — they may need to move to
搁置中 or be re-examined. Don't silently keep dependent decisions that no longer
have support.

**Periodic review:** When writing to evolution-log at a topic-unit boundary, briefly
mention to the user what was added to 已确定 during this topic unit (if anything).
This catches misclassification at a natural pause — the user can correct without
every individual write interrupting the conversation flow.

## 搁置中

Items that were discussed but can't be resolved until the current exploration concludes.
Move items here when they depend on an unresolved question — they're not confirmed,
not rejected, just waiting. Move them out when the blocking question is resolved:
either into 已确定 (if accepted) or 死胡同 (if rejected).

## Dead-End Registry

### Format

Organize dead ends by **failure type**, not by the specific direction proposed.
Each failure type requires three parts:

1. **Header** — the failure category name
2. **Description** — what makes a direction fall into this type, specific enough to
   distinguish clear matches from surface-similar-but-different directions
3. **Boundary test** — one sentence: "A new direction escapes this type if it can
   show [X]." This prevents the type from expanding to exclude things it shouldn't.

Individual entries are historical record only — you should never need to read them
to judge a new direction.

### Example

```
### 需要解释"为什么"
机制或效果需要额外的世界逻辑来解释，不能从设定前提自然推出。
边界测试：如果新方向能说明"为什么"从已确定的世界规则里直接可得，不需要新增逻辑，则不属于此类。
| 方向 | 具体原因 | 日期 |
| 物品有放大效果 | 缺少"为什么有这种效果"的解释 | 2026-02-26 |
```

### How to use when proposing a direction

- **Clear match**: the new direction fails the boundary test of an existing type for
  the same specific reason → don't propose it, generate a different direction
- **Ambiguous match**: surface similarity exists, but the failure reason might not
  apply → propose it, and explicitly note the overlap and why this direction is
  different. Let the user decide.
- **No match**: propose freely.

Don't block ambiguous directions internally. A direction wrongly excluded wastes more
time than one quickly rejected by the user.

**Example of ambiguous match:**
Dead-end type "需要解释'为什么'" has boundary test: "新方向能逃出此类，如果它的运作方式
从已确认的世界规则里直接可得。" A new direction proposes "获得物品会在人际间产生义务关系。"
This is surface-similar (物品产生效果 → 需要解释为什么), but the failure reason might not
apply if the obligation comes from an existing social norm in the setting rather than
requiring new logic. Propose it, note the overlap, let the user decide.

### Answer shape priority

Once the answer shape is established, it becomes the primary filter. Before checking
dead ends, first ask: does this direction fit the answer shape? If no, discard. If yes,
then check for clear repeats. This limits how many dead ends need checking per proposal.

### Adding new dead ends

File under an existing type (if the failure reason matches) or create a new one. Write
the boundary test carefully — a vague boundary test will over-exclude future directions.
