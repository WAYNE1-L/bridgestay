---
name: safe-patch-reviewer
description: Use this skill when the codebase is already working and the priority is to make a narrow fix without destabilizing existing flows.
---

# Purpose

Use this skill when:
- the user says "do not refactor unrelated code"
- the system already works mostly end-to-end
- the remaining work is integration polish, reliability, or UX refinement
- regression risk is more important than theoretical cleanliness

# Core rule

Protect the existing flow first. Improve second.

# Workflow

1. Identify what must remain unchanged.
2. Identify the smallest safe layer for the patch.
3. Make additive, reversible edits.
4. Avoid touching persistence, routing, or core business logic unless required.
5. Prefer best-effort optional behavior over hard dependencies.
6. Verify that the original happy path still works.
7. Call out caveats honestly.

# Required checks

Before finishing, verify:
- no unrelated behavior was changed
- the main happy path still works
- new logic fails safely
- the patch is reviewable in isolation

# Response style

Return:
1. What changed
2. Why it was safe
3. Verification
4. Remaining caveat
5. Next smallest step

# Guardrails

Do not:
- widen scope casually
- overwrite user input unnecessarily
- make optional AI paths block the main UX
- add automation that removes user control unless explicitly requested
