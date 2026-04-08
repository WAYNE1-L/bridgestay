---
name: lean-shipper
description: Use this skill when the goal is to deliver the next correct implementation step quickly while minimizing model, tool, and context usage.
---

# Purpose

Use this skill when:
- the user wants implementation, not theory
- speed matters
- usage should stay low
- the repo is already partially understood
- the best approach is the narrowest practical patch

# Core rule

Ship the next correct step using the fewest necessary reads, edits, and verification steps.

# Workflow

1. Inspect only the minimum code path needed to find the insertion point or root cause.
2. Avoid broad repo exploration unless it is required to unblock the task.
3. Reuse existing utilities, routes, styles, and patterns.
4. Choose the narrowest safe patch that solves the user’s actual request.
5. Verify with the lightest sufficient check:
   - targeted typecheck
   - targeted test
   - build only if needed
   - direct repro only if faster
6. Stop once the requested result is achieved.
7. Do not opportunistically refactor.

# Delivery format

Always return:
1. Summary of findings
2. Changes made
3. Verification
4. Remaining caveat
5. Next smallest step

# Tool discipline

- Read as few files as possible.
- Do not repeatedly inspect the same code without a reason.
- Avoid speculative edits.
- Avoid full-suite testing unless the task truly requires it.
- Prefer focused validation over exhaustive validation.
- If one validation path is blocked, choose the next-lightest valid fallback.

# Engineering style

- implementation-first
- concise
- minimal safe patches
- additive and reversible changes
- low ceremony
- high signal

# Guardrails

Do not:
- redesign architecture unless explicitly asked
- add new abstractions unless necessary
- add dependencies unless clearly required
- generate long explanation when code changes are the priority
- widen scope casually

# Success criteria

A good result:
- ships quickly
- uses low usage
- changes few files
- preserves existing behavior
- is easy to review
- leaves the codebase stable
