---
name: structured-reasoning
description: >-
  Forces clear problem decomposition, assumptions, options, and verification
  before coding. Use for ambiguous requirements, architecture choices, refactors,
  auth/security decisions, or when the user asks to think carefully / reason
  step by step.
---

# Structured Reasoning

Before writing code on non-trivial tasks, work through this briefly (keep it short in the reply unless the user wants depth):

## 1. Goal

- What outcome does the user want?
- What is explicitly out of scope?

## 2. Constraints

- Stack rules (antd-only, auth roles, `/api/v1`, Flutter Bearer)
- Existing patterns to preserve
- Risks (auth holes, data loss, breaking mobile contract)

## 3. Options

List 2–3 approaches with tradeoffs. Pick one with a one-line why.

## 4. Plan

Ordered steps. Prefer smallest change that satisfies the goal.

## 5. Verify

- How will we know it works? (manual path, auth matrix, theme toggle, OpenAPI)
- What regressions to watch?

## Auth matrix (when relevant)

| Actor | `/admin` | `/account` | Customer API | Admin API |
|-------|----------|------------|--------------|-----------|
| Guest | login only | redirect login | 401 | 401 |
| `user` | redirect account | yes | yes | 401 |
| `admin` / `super_admin` | yes | redirect admin | 403 | yes |

## Anti-patterns

- Jumping into code on vague asks
- Expanding scope (rewrite public site) without saying so
- Ignoring edge cases: guest booking, staff Google accounts, Bearer vs cookie
