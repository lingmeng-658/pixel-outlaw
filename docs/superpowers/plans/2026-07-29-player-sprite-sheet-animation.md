# Player Sprite Sheet Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the experimental two-frame player animation with the formal 48×48 sprite-sheet directional idle and run animations.

**Architecture:** Keep Phaser-specific loading and playback in `MainScene`, while placing velocity-to-facing selection in a small pure TypeScript module that can be tested without Phaser. `MainScene` stores only the last facing direction, derives the animation key and horizontal flip from that direction, and leaves movement, shooting, and collision values unchanged.

**Tech Stack:** TypeScript 6, Phaser 4, Vite 8, Node built-in test runner

## Global Constraints

- Load `src/assets/sprites/player/player-sprite-sheet.png` as 48×48 frames.
- Create five idle and five run animations for down, down-right, right, up-right, and up.
- Reuse right-side frames with `flipX` for left, down-left, and up-left.
- Preserve the last movement facing while idle.
- Do not modify player speed, shooting, enemies, levels, saves, or collision values.
- Do not add dependencies, perform broad refactoring, commit, or push.

---

### Task 1: Direction selection

**Files:**
- Create: `src/playerDirection.ts`
- Create: `src/playerDirection.test.mjs`

**Interfaces:**
- Produces: `PlayerFacing`, `getPlayerFacing(vx, vy, fallback)`, `getPlayerAnimationDirection(facing)`, and `shouldFlipPlayer(facing)`.

- [x] Write table-driven tests for all eight movement directions, zero-velocity fallback, animation-direction reuse, and left-side flipping.
- [x] Compile the not-yet-created module to `/tmp` and run the Node test to verify RED because the production module is missing.
- [x] Implement the minimal pure direction helpers.
- [x] Compile and rerun the test to verify GREEN.

### Task 2: Phaser sprite-sheet integration

**Files:**
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: the direction helpers from Task 1.
- Produces: formal `player-idle-*` and `player-run-*` Phaser animations plus last-facing state.

- [x] Replace three image imports and loads with one `load.spritesheet()` call using 48×48 frames.
- [x] Create five two-frame idle animations and five two-frame run animations from the documented frame rows.
- [x] Create the player from the sprite sheet, retain the 28×28 centered Arcade body, and initialize facing down.
- [x] Update facing only for non-zero final velocity; select idle/run animation and `flipX` without changing movement or shooting.
- [x] Ensure pause, transition, Game Over, restart, and title states settle on the correct directional idle animation.
- [x] Run `npm run build` and fix only integration errors within scope.

### Task 3: Handoff and final verification

**Files:**
- Modify: `docs/AI_HANDOFF.md`

**Interfaces:**
- Records the exact implementation, commands, risks, manual checks, and uncommitted status.

- [x] Update the handoff with animation keys, direction state, frame mapping, validation, and playtest focus.
- [x] Run the pure direction test, `npm run build`, and `git diff --check`.
- [x] Inspect `git diff --stat`, full relevant diff, and `git status`.
- [x] Report gameplay scope, build result, known visual risks, and the manual `npm run dev` checklist.
