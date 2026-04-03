# Architecture

- Do NOT use `crypto.randomUUID()` — it is not available in all browser environments (e.g. non-HTTPS contexts, older WebViews). Use `Math.random().toString(36)` based UID generation instead.
