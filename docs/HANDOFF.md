# Portfolio Stability Hardening — Handoff

**Updated:** 2026-09-01

**Repository:** `https://github.com/feiaaa1/YY-CV.git`

**Branch:** `fix/portfolio-stability`
**Current HEAD:** `f7587fc wip: begin live reduced motion support`

## Handoff Summary

This branch hardens the existing Three.js portfolio without changing its visual identity or navigation hierarchy. Tasks 1–3 are implemented, tested, committed, and independently reviewed. Task 4 was interrupted after its first reusable APIs and tests were completed; that partial work is intentionally preserved in a clearly labeled WIP commit. Tasks 5–7 have not started.

Do not treat this branch as release-ready yet. Resume from Task 4, finish the remaining plan, run the full browser matrix, and complete the final branch review before merging.

## Source of Truth

- Design: [`docs/superpowers/specs/2026-08-31-portfolio-stability-hardening-design.md`](superpowers/specs/2026-08-31-portfolio-stability-hardening-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-08-31-portfolio-stability-hardening.md`](superpowers/plans/2026-08-31-portfolio-stability-hardening.md)
- This handoff summarizes the local SDD ledger because `.superpowers/sdd/` is intentionally ignored and will not be available from GitHub.

## Completed Work

### Task 1 — Responsive layout and render profile

Status: **complete; review clean**

- Added mobile cover fitting so the wide cover does not clip at 390×844.
- Removed the unused `geometrySegments` render-profile field.
- Applied the profile's shadow-map size to the retained directional light.
- Added layout regressions for portrait and desktop viewports.

Commit:

- `4ca0bd9 fix: fit mobile scenes and apply render profile`

### Task 2 — Canvas text layout

Status: **complete; review clean after three fix rounds**

- Added measured title truncation and subtitle wrapping.
- Preserved explicit `\n`/`\r\n` lines.
- Added CJK and long-token wrapping.
- Added `Intl.Segmenter` grapheme support plus a dependency-free fallback.
- Fallback tests cover combining marks, ZWJ emoji, flags, emoji modifiers, Prepend, controls, spacing marks, and Hangul transitions.

Commits:

- `f89d76f fix: wrap canvas text across scripts`
- `90d3a36 fix: preserve grapheme text layout`
- `e7260ad fix: complete fallback grapheme rules`
- `8d127dc fix: classify fallback grapheme controls`

### Task 3 — Pointer, swipe, and wheel gestures

Status: **complete; review clean after two fix rounds**

- Added horizontal-dominance swipe classification.
- Added one-emission-per-burst wheel gating and `deltaMode` normalization.
- Added single-pointer ownership so unrelated pointers cannot replace or cancel the active gesture.
- Routed pointer up/cancel/lost capture through shared cleanup.
- Cancellation cannot activate targets or change projects.
- Terminal cleanup resets drag distance and detail rotation.
- Named gesture listeners have matching removals.

Commits:

- `77cb13e fix: make pointer and wheel navigation intentional`
- `48c3ecd fix: preserve pointer gesture ownership`
- `1a6c0f7 test: cover pointer terminal cleanup`

Known minor: some integration regressions use source-structure assertions because the Node test environment cannot construct the WebGL experience. These tests are intentionally refactor-sensitive and should be updated alongside method restructuring.

## Task 4 WIP — Live Reduced Motion

Status: **partial; not reviewed as a complete task**

Preserved commit:

- `f7587fc wip: begin live reduced motion support`

Implemented in the WIP:

- `createTimelineController()` accepts `boolean | (() => boolean)` and resolves the live policy for every run.
- `SculptModelActions` exposes `setReducedMotion(reduced)`.
- Default model handles store live state in `root.userData.reducedMotion`.
- Added tests proving live timeline policy reads and handle state updates.

Verification performed on this WIP:

```text
tests/timelines.test.ts + tests/models.test.ts
2 files, 25 tests passed
TypeScript tsc --noEmit passed
git diff --check passed before commit
```

Still required to finish Task 4:

1. Initialize `root.userData.reducedMotion` from every model factory's constructor argument.
2. Pass a callback such as `() => Boolean(root.userData.reducedMotion)` to each model's timeline controller.
3. Gate hover, pointer, sine-wave, and idle decorative updates in all affected models and settle them to rest when reduced motion is enabled.
4. Store the media query as a class field in `PortfolioExperience` and add a named `change` handler.
5. Propagate preference changes to every model handle with `actions.setReducedMotion()`.
6. Reset camera, hover, detail rotation, and Task 3 gesture state when the preference changes.
7. Add a named `visibilitychange` handler that pauses rendering while hidden, restarts the clock on resume, and schedules only one animation loop.
8. Guard `animate()` and `destroy()` against duplicate scheduling or execution after destruction.
9. Add regression tests for model resting behavior and experience lifecycle structure.
10. Run focused tests, the complete suite, type checking, and build; then request Task 4 spec/quality review.

## Remaining Tasks

### Task 5 — Safe transitions, semantics, and visible feedback

Not started.

- Replace fallback `innerHTML` with DOM/text construction.
- Add category validation before hiding the directory.
- Add a visible toast/status surface.
- Wrap awaited transitions in `try/catch/finally` so locks always release and the scene recovers.
- Expose current project/journey/contact content semantically.
- Correct scrapbook boundary controls and focus management.
- Make the placeholder website action visibly explain that it is not configured.

Testing ruling: the project has no jsdom dependency. Test a pure fallback content structure and add a focused assertion that `main.ts` contains no `innerHTML`. Category validation should be an exported pure helper consumed directly by `PortfolioExperience`.

### Task 6 — Lazy detail modules and cleanup

Not started.

- Dynamically import each detail presentation factory.
- Make handle disposal idempotent.
- Store and remove WebGL, pointer, wheel, media-query, and visibility handlers.
- Clear timers and stale hover/detail references.
- Dispose `finishTag` and other standalone Three.js resources exactly once.
- Confirm Vite emits presentation-specific chunks and address the current >500 kB monolithic chunk warning.

Testing ruling: unit-test handle/resource disposal; verify `PortfolioExperience.destroy()` in the browser because Node tests cannot construct the WebGL renderer.

### Task 7 — Complete verification

Not started.

- Run all Vitest tests.
- Run TypeScript and production build.
- Run production dependency audit against `https://registry.npmjs.org/`.
- Exercise the complete flow at 1280×720 and 390×844.
- Verify swipe, wheel, keyboard, visible controls, journey popups, finish/restart, semantics, focus, and placeholder feedback.
- Verify reduced motion has no decorative parallax or idle movement.
- Run final whole-branch code review and resolve all load-bearing findings.

## Commit Chain

```text
f7587fc wip: begin live reduced motion support
1a6c0f7 test: cover pointer terminal cleanup
48c3ecd fix: preserve pointer gesture ownership
77cb13e fix: make pointer and wheel navigation intentional
8d127dc fix: classify fallback grapheme controls
e7260ad fix: complete fallback grapheme rules
90d3a36 fix: preserve grapheme text layout
f89d76f fix: wrap canvas text across scripts
4ca0bd9 fix: fit mobile scenes and apply render profile
f0fd002 chore: ignore local worktrees
c786323 docs: plan portfolio stability hardening
16966a9 docs: design portfolio stability hardening
e5bda0b Initial Three.js portfolio
```

## Resume Instructions

```bash
git clone https://github.com/feiaaa1/YY-CV.git
cd YY-CV
git switch fix/portfolio-stability
npm install
npm test
```

Read the design and plan before changing code. Resume at **Task 4, Step 3** while preserving the interfaces already committed in `f7587fc`.

On the original Windows workstation, the active linked worktree is:

```text
C:\Users\Ryan\Downloads\new-chat-2\new-chat-2\.worktrees\portfolio-stability
```

It uses a junction to the parent checkout's `node_modules`. The parent repository stores Git metadata in `.gitdata` because its original `core.worktree` path points to another machine; the linked worktree itself supports normal Git commands.

## Project Constraints

- Do not add runtime dependencies unless the design is explicitly revised.
- Preserve the current cover, directory, five detail presentations, and thank-you visual identity.
- Keep book/ticket navigation cyclic and scrapbook navigation bounded.
- Use test-first red-green-refactor for each behavior change.
- Do not commit the user's separate `pnpm-lock.yaml` from the parent checkout unless dependencies intentionally change.
- Do not merge this branch until Tasks 4–7 and final review are complete.

## Decisions Made During Execution

1. Fallback security testing uses a pure data structure plus a no-`innerHTML` source assertion because no DOM test runtime is installed. Risk if wrong: a formatting-only source test can miss a differently written unsafe sink.
2. Category validation is extracted as a pure helper and must be called directly by `PortfolioExperience`. Risk if wrong: helper and dispatch behavior could diverge.
3. Experience-level resource cleanup is verified in the browser while handle cleanup is unit-tested. Risk if wrong: a resource owned only by `PortfolioExperience` could escape automation.

## Current Release Status

**Not ready to merge.** Tasks 1–3 are reviewed; Task 4 is partial; Tasks 5–7 and final review remain.
