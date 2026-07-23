---
name: pixel-outlaw-debug
description: Diagnose and minimally fix Pixel Outlaw bugs, freezes, save/restart/continue failures, Phaser scene lifecycle errors, input problems, and gameplay regressions. Use for bug reports and runtime failures; do not use for feature work or broad refactors.
---

# Pixel Outlaw Systematic Debugging

Use this workflow whenever the user reports a bug, freeze, crash, incorrect state, save failure, restart failure, input failure, or gameplay regression.

## 1. Establish the current truth

Before proposing a fix:

1. Read `AGENTS.md`.
2. Read `PROJECT_CONTEXT.md`.
3. Read `docs/AI_HANDOFF.md` and `docs/NEXT_TASK.md` when present.
4. Read the current Git diff and recent commits.
5. Read the exact current source files on the failing path. Do not rely on memory or an earlier conversation snapshot.

## 2. Define the debugging round

Before editing, state:

- 本次目标
- 不做什么
- 验收标准
- 预计修改文件
- 主要风险

A bug-fix round must not include unrelated feature work or structural refactoring.

## 3. Reproduce and trace before changing code

Collect the smallest reproducible sequence, for example:

```text
START GAME
→ ESC
→ S
→ freeze
```

Then:

1. Check the browser console and report the first relevant error when available.
2. Trace the complete shared call path from input to failure.
3. Inspect recent changes touching that path.
4. Identify which state or object first becomes invalid.
5. Form one explicit root-cause hypothesis.
6. Test that hypothesis against every symptom it is meant to explain.

Do not create separate speculative fixes for multiple symptoms until checking whether they share one root cause.

## 4. Phaser lifecycle checks

For Scene restart, Save & Quit, Continue, Game Over, and area transitions, explicitly inspect:

- whether `create()` reuses the same Scene instance;
- whether old Groups, GameObjects, Timers, Tweens, keyboard keys, or controller references survive shutdown;
- whether reset code runs before new Phaser objects are created;
- whether code reads an already destroyed Group or GameObject;
- whether `time.paused`, physics pause, or paused tweens are restored before changing Scene;
- whether pure visual cleanup mutates progression or gameplay state;
- whether new-run reset, current-level reset, and save restoration are distinct operations.

Prefer correcting lifecycle ordering or ownership. Do not use a broad `try/catch` merely to hide an unknown runtime error. Lifecycle tolerance is acceptable only when the invalid-object case is understood and intentionally harmless.

## 5. Make the smallest supported fix

The patch should:

- address the identified root cause;
- preserve gameplay, numerical configuration, save schema, and unrelated behavior;
- avoid `any`;
- avoid duplicate state sources;
- avoid adding a general manager or service unless the task explicitly requires one;
- avoid cleaning up unrelated code.

If the evidence contradicts the hypothesis, stop and investigate again instead of stacking more edits.

## 6. Verify the fix

Run fresh verification after the final edit:

```bash
npm run build
git diff --check
git diff --stat
git diff
git status
```

For runtime bugs, also run:

```bash
npm run dev
```

List a focused manual regression sequence covering:

1. the original reproduction;
2. the immediately adjacent path;
3. one repeated execution to detect leaked state;
4. browser console errors.

For lifecycle changes, consider at minimum:

- Start Game by click and Space;
- ESC → Restart;
- ESC → Save & Quit;
- Continue Saved Game;
- repeated Restart / Save / Continue;
- returning between areas when relevant.

Do not claim the bug is fixed solely because TypeScript builds.

## 7. Handoff

Update `docs/AI_HANDOFF.md` with:

- the reproduced symptom;
- the root cause;
- the exact files changed;
- commands run and their results;
- runtime checks completed or still pending;
- remaining risks.

Do not commit or push unless the user explicitly requested it. Use a concise Chinese commit message such as:

```text
fix: 修复 xxx
```
