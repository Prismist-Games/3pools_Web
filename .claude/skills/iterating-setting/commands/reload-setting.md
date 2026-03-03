---
description: >
  Re-read the setting design documents to sync after the user edited them directly.
  Use when the user types /reload-setting, or says "我改了文档", "重新读文档", "同步一下".
---

# /reload-setting

## Steps

1. Read both files fresh:
   - `design_docs/setting-current-state.md`
   - `design_docs/setting-evolution-log.md`

2. Briefly confirm what's now in current-state — just the headlines, not a full
   summary. Something like: "已确定 has N topic groups, 死胡同 has M failure types,
   当前思考链 is at [current step]. Noted."

   Don't try to diff against your memory of the previous version — that's unreliable
   after a long conversation. The user knows what they changed; they just need
   confirmation you're now working from the updated files.

3. If anything in the files seems inconsistent with what was discussed in the
   conversation (e.g., a decision you remember confirming is now missing), flag it
   briefly so the user can clarify whether it was intentional.

4. From this point on, use the newly read versions as the source of truth.
