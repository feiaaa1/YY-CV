# Portfolio Stability Hardening — Handoff

**Updated:** 2026-09-01

**Repository:** `https://github.com/feiaaa1/YY-CV.git`

**Branch:** `fix/portfolio-stability`
**Current HEAD:** `cb1bb83 fix: apply reduced motion and pause hidden rendering`

## Handoff Summary

This branch hardens the existing Three.js portfolio without changing its visual identity or navigation hierarchy. Tasks 1–4 are implemented, tested, and committed. Task 5 is **substantially implemented but entirely uncommitted** — it is sitting in the working tree and must be committed before any branch switch or clean checkout, or it will be lost. Tasks 6–7 have not started.

Do not treat this branch as release-ready. Resume by committing Task 5, finishing its two remaining gaps, then continuing to Tasks 6–7 and the final branch review.

## Source of Truth

- Design: [`docs/superpowers/specs/2026-08-31-portfolio-stability-hardening-design.md`](superpowers/specs/2026-08-31-portfolio-stability-hardening-design.md)
- Implementation plan: [`docs/superpowers/plans/2026-08-31-portfolio-stability-hardening.md`](superpowers/plans/2026-08-31-portfolio-stability-hardening.md)
- This handoff summarizes the local SDD ledger because `.superpowers/sdd/` is intentionally ignored and will not be available from GitHub.

## Current Verification State

Run at the time of writing, with Task 5 uncommitted in the working tree:

```text
npx vitest run          13 files, 99 tests passed
npx tsc --noEmit        passed
npm run build           passed (673.36 kB single chunk; Task 6 addresses this)
```

## Completed Work

### Task 1 — Responsive layout and render profile

Status: **complete; review clean**

- Added mobile cover fitting so the wide cover does not clip at 390×844.
- Removed the unused `geometrySegments` render-profile field.
- Applied the profile's shadow-map size to the retained directional light.
- Added layout regressions for portrait and desktop viewports.

Commit: `4ca0bd9 fix: fit mobile scenes and apply render profile`

### Task 2 — Canvas text layout

Status: **complete; review clean after three fix rounds**

- Added measured title truncation and subtitle wrapping.
- Preserved explicit `\n`/`\r\n` lines.
- Added CJK and long-token wrapping.
- Added `Intl.Segmenter` grapheme support plus a dependency-free fallback.
- Fallback tests cover combining marks, ZWJ emoji, flags, emoji modifiers, Prepend, controls, spacing marks, and Hangul transitions.

Commits: `f89d76f`, `90d3a36`, `e7260ad`, `8d127dc`

### Task 3 — Pointer, swipe, and wheel gestures

Status: **complete; review clean after two fix rounds**

- Added horizontal-dominance swipe classification.
- Added one-emission-per-burst wheel gating and `deltaMode` normalization.
- Added single-pointer ownership so unrelated pointers cannot replace or cancel the active gesture.
- Routed pointer up/cancel/lost capture through shared cleanup.
- Cancellation cannot activate targets or change projects.
- Terminal cleanup resets drag distance and detail rotation.

Commits: `77cb13e`, `48c3ecd`, `1a6c0f7`

### Task 4 — Live reduced motion and paused hidden rendering

Status: **complete and committed; spec/quality review deliberately skipped by the user**

- `createTimelineController()` accepts `boolean | (() => boolean)` and resolves the live policy on every run.
- `SculptModelActions` exposes `setReducedMotion(reduced)`; every model factory seeds `root.userData.reducedMotion` from its constructor argument and passes a callback to its timeline controller.
- Hover parallax, idle sine drift, and journey station pulsing settle to rest when the preference turns on.
- `PortfolioExperience` holds the media query as a field with a paired named `change` handler that propagates to every handle and resets hover, gesture, and camera state.
- A named `visibilitychange` handler pauses rendering while hidden and pumps `clock.getDelta()` on resume so the first frame back does not jump.
- Frame scheduling funnels through `scheduleFrame()`/`stopAnimation()` so at most one loop is ever queued; `destroy()` is guarded to run once.
- Camera parallax holds still under reduced motion.

Commits:

- `f7587fc wip: begin live reduced motion support` (preserved partial work)
- `cb1bb83 fix: apply reduced motion and pause hidden rendering`

**Bug found and fixed during self-review of this task:** camera parallax in `animate()` read `this.pointer` unconditionally, so the camera reset in the new change handler was undone on the next frame, and the off-screen sentinel `(2, 2)` would have drifted the camera to roughly `x = 0.24` instead of centering it. Fixed test-first with a `tracksPointer` guard.

Two pre-existing tests were updated because their setup contradicted intentionally new behavior, not because of a regression:

1. The scrapbook hover test built its model with `reducedMotion: true` and then asserted hover tilt; it now opts into motion explicitly.
2. The `destroy()` structure assertion in `tests/interactions.test.ts` pinned the old `cancelAnimationFrame` opening line.

Note for future work: `book.ts`, `ticket.ts`, and `thanks.ts` have no per-frame update callbacks at all, so they only needed the timeline-controller change. There was no idle motion in them to gate.

## Task 5 IN PROGRESS — UNCOMMITTED

Status: **implemented and green, but nothing is committed. Commit before switching branches.**

### Uncommitted files

```text
 M src/experience/PortfolioExperience.ts
 M src/experience/stateMachine.ts
 M src/main.ts
 M src/styles.css
?? src/experience/accessibility.ts
?? src/experience/categories.ts
?? src/experience/fallback.ts
?? src/experience/transitions.ts
?? tests/accessibility.test.ts
?? tests/fallback.test.ts
?? tests/transitions.test.ts
```

### What is implemented

The approach extracts testable logic into pure modules so the `node` test environment can cover it directly, rather than relying on source-string assertions. Each module was written test-first and verified RED before implementation.

**`src/experience/fallback.ts`** — `buildFallbackContent()` returns a `FallbackNode` tree; `buildFallback()` renders it with `createElement`/`textContent`. `src/main.ts` no longer uses `innerHTML`. Tests assert a hostile category title stays literal text, that only the tags `h1/li/p/section/ul` are produced, and that neither source file contains `innerHTML`, `outerHTML`, or `insertAdjacentHTML`. (7 tests)

**`src/experience/categories.ts`** — `findCategory()` and `hasCategory()` validate identifiers, rejecting unknown, empty, `null`/`undefined`, and prototype-shaped strings such as `__proto__`. `PortfolioExperience` calls `hasCategory()` before opening a category and `findCategory()` in `currentCategory()`.

**`src/experience/accessibility.ts`** — `describeScreen(content, state)` returns `{ heading, status, details, controls }` for every screen, plus `countProjects()`. Details now name the visible project, scrapbook page, or journey station with its real content instead of only an index. Scrapbook paging omits previous on index `0` and next on `count - 1`; book and ticket keep both controls because they are cyclic. An unknown `selectedCategoryId` degrades to a valid screen with a working close control. (9 tests)

**`src/experience/transitions.ts`** — `runLockedTransition(operation, recovery, hooks)` locks, runs, and unlocks in `finally`; on rejection it reports the original error, awaits the branch-specific recovery, announces the failure, and still releases the lock even when recovery itself throws. Every branch of `dispatch()` now routes through it. (5 tests)

**`PortfolioExperience` wiring** — added a `.scene-toast` element with `role="status"`, and `announce(message, visible)` which updates the live region, clears any prior timer, and hides non-persistent messages after four seconds. It is used for the website placeholder, WebGL context loss and restoration, category validation failures, and every transition failure. WebGL context handlers became named methods (`onContextLost`, `onContextRestored`) with matching removals in `destroy()`, and the toast timer is cleared there too. `renderAccessibilityControls(focusFirstControl = false)` focuses the first control with `{ preventScroll: true }` only after a completed transition, so construction does not steal focus on load.

**`stateMachine.ts`** — added `SET_PROJECT_INDEX`. This exists because the paging recovery path needs to restore a previous index without the `selectedJourneyStation` side effect that `SELECT_JOURNEY_STATION` carries.

### Remaining Task 5 gaps

1. **Website control label is unchanged.** Plan step 5 asks for `WEBSITE / COMING SOON`; `src/models/aboutCv.ts:366` still reads `'↗  访问网站'`. The visible toast feedback for the placeholder action is already wired, so only the label text is outstanding.
2. **`SET_PROJECT_INDEX` has no test coverage.** It is exercised only indirectly through the uncovered paging recovery path. Add a reducer test in `tests/stateMachine.test.ts` asserting it changes `projectIndex` and leaves `selectedJourneyStation` untouched.
3. **Not verified in a browser.** Focus movement, toast visibility and timing, and the semantic region's screen-reader output are all DOM/AT behavior that the `node` test environment cannot exercise.
4. **Commit the work** once the above are addressed.

Already satisfied, so no work needed: the scrapbook's own 3D boundary controls in `src/models/scrapbook.ts` already hide `previousArrow` on the first page and `nextArrow` on the last, and clear the corresponding page `userData.action`. The new `describeScreen()` boundary rules now agree with that existing 3D behavior.

## Remaining Tasks

### Task 6 — Lazy detail modules and cleanup

Not started.

- Dynamically import each detail presentation factory.
- Make handle disposal idempotent.
- Store and remove WebGL, pointer, wheel, media-query, and visibility handlers. *(Task 4 and Task 5 already did the media-query, visibility, and WebGL context handlers.)*
- Clear timers and stale hover/detail references. *(Task 5 already clears the toast timer.)*
- Dispose `finishTag` and other standalone Three.js resources exactly once.
- Confirm Vite emits presentation-specific chunks and address the monolithic chunk warning, currently 673.36 kB.

Testing ruling: unit-test handle/resource disposal; verify `PortfolioExperience.destroy()` in the browser because Node tests cannot construct the WebGL renderer.

### Task 7 — Complete verification

Not started.

- Run all Vitest tests, TypeScript, and the production build.
- Run a production dependency audit against `https://registry.npmjs.org/`.
- Exercise the complete flow at 1280×720 and 390×844.
- Verify swipe, wheel, keyboard, visible controls, journey popups, finish/restart, semantics, focus, and placeholder feedback.
- Verify reduced motion has no decorative parallax or idle movement, including a live mid-session toggle.
- Run the final whole-branch code review and resolve all load-bearing findings.

## Commit Chain

```text
cb1bb83 fix: apply reduced motion and pause hidden rendering
15cefe7 docs: add portfolio stability handoff
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

The working tree carries uncommitted Task 5 work. If you are resuming in the same checkout, commit it first:

```bash
git add -A && git commit -m "fix: recover transitions and expose semantic content"
```

For a fresh checkout:

```bash
git clone https://github.com/feiaaa1/YY-CV.git
cd YY-CV
git switch fix/portfolio-stability
npm install
npm test
```

Read the design and plan before changing code. Resume at **Task 5, remaining gaps** listed above.

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
- Do not merge this branch until Tasks 5–7 and final review are complete.

## Decisions Made During Execution

1. Fallback security testing uses a pure node tree plus a no-`innerHTML` source assertion because no DOM test runtime is installed. Risk if wrong: a formatting-only source test can miss a differently written unsafe sink.
2. Category validation is a pure helper called directly by `PortfolioExperience`. Risk if wrong: helper and dispatch behavior could diverge.
3. Screen semantics are extracted into a pure `describeScreen()` descriptor so paging boundaries and content exposure are unit-testable without a DOM. Risk if wrong: the descriptor and the thin DOM renderer that consumes it could drift, and the renderer itself stays untested.
4. Experience-level resource cleanup is verified in the browser while handle cleanup is unit-tested. Risk if wrong: a resource owned only by `PortfolioExperience` could escape automation.
5. Task 4 shipped without the independent spec/quality review its plan step requested, at the user's direction. Risk if wrong: a spec deviation in reduced-motion behavior is unreviewed and would surface only in Task 7's browser matrix.

## Current Release Status

**Not ready to merge.** Tasks 1–3 are reviewed, Task 4 is complete but unreviewed, Task 5 is implemented but uncommitted with two gaps, and Tasks 6–7 plus the final review remain.
