---
name: pixel-outlaw-verify
description: Verify completed Pixel Outlaw code changes before declaring success. Use after bug fixes, features, refactors, save/lifecycle changes, UI/input changes, and code reviews; require fresh build, diff, status, and runtime evidence appropriate to the change.
---

# Pixel Outlaw Verification Before Completion

Use this workflow after meaningful code changes and before saying that work is complete, fixed, safe, or ready to merge.

## 1. Re-read the requested contract

Restate the accepted:

- 本次目标
- 不做什么
- 验收标准

Compare the final patch against that contract. Flag scope creep instead of silently accepting it.

## 2. Inspect the actual final change

Run and read:

```bash
git diff --check
git diff --stat
git diff
git status
```

Check for:

- unrelated edits;
- duplicated state;
- gameplay or numerical changes hidden inside a refactor;
- generated `dist/` or `node_modules/` changes;
- temporary scripts, workflows, logs, or debug files left behind;
- documentation that no longer matches the source;
- claims in the handoff that are stronger than the available evidence.

Do not verify from an old diff or an earlier build. Evidence must be produced after the final edit.

## 3. Build verification

Run:

```bash
npm run build
```

If it fails:

1. Report the first actionable error.
2. Explain the likely cause.
3. Apply only the minimum correction needed.
4. Run the full build again.

A successful build proves compilation and bundling only. It does not prove Phaser runtime behavior, canvas input, Scene lifecycle, or save correctness.

## 4. Runtime verification

For changes involving gameplay, UI, input, save data, Scene restart, timers, tweens, controllers, areas, or levels, run:

```bash
npm run dev
```

Then provide or execute a focused regression checklist.

Each checklist must include:

1. the changed behavior;
2. an unchanged neighboring behavior;
3. a repeated execution to detect leaked state;
4. a browser-console check for the first red error;
5. cleanup or exit behavior where relevant.

For Phaser canvas behavior, do not infer success from DOM presence alone.

## 5. Lifecycle regression matrix

When changes touch Restart, Save & Quit, Continue, New Game, checkpoints, or Scene recreation, verify the relevant rows:

| Path | Expected result |
|---|---|
| Title → click START | Clean new run starts |
| Title → Space | Same clean new run starts |
| ESC → Restart | Current level returns to its entry checkpoint |
| ESC → Save & Quit | Save is written and a responsive title screen appears |
| Continue | Saved progression restores exactly once |
| New Game with an existing save | New run starts without deleting or inheriting runtime state |
| Repeat Restart | No duplicated enemies, markers, timers, tweens, or rewards |
| Repeat Save → Continue | No accumulated rewards or stale controller references |

Add area-specific rows when the patch affects Dusty Outskirts or Town Road.

## 6. Documentation and handoff

Check whether the change requires updates to:

- `PROJECT_CONTEXT.md` for durable design decisions;
- `docs/AI_HANDOFF.md` for the current state, evidence, risks, and pending manual checks;
- `docs/NEXT_TASK.md` when the planned task has changed.

Do not mark manual browser testing as completed unless it was actually performed.

## 7. Completion report

Report separately:

### Verified

- commands run;
- build result;
- diff and status result;
- runtime paths actually exercised.

### Not yet verified

- browser paths requiring the user;
- environment limitations;
- remaining lifecycle or compatibility risks.

### Repository state

- committed or uncommitted;
- pushed or not pushed;
- exact commit message when applicable.

Never use phrases equivalent to “everything is fine” when only the build was run.

Do not commit or push unless the user explicitly requested it.
