# Portfolio Stability Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Three.js portfolio reliable across touch, mouse, keyboard, screen readers, reduced-motion preferences, and narrow mobile viewports while reducing initial bundle and GPU lifecycle risks.

**Architecture:** Extract deterministic layout, gesture, and text-layout policies into pure tested modules, then make `PortfolioExperience` the resilient lifecycle coordinator for transitions, accessibility, rendering, and cleanup. Detail presentation modules load on demand; existing model factories and visual composition remain intact.

**Tech Stack:** TypeScript 5.9, Three.js 0.180, GSAP 3.15, Vite 7, Vitest 3.

**Spec:** `docs/superpowers/specs/2026-08-31-portfolio-stability-hardening-design.md`

## Global Constraints

- Preserve the current cover, directory, detail, journey, and thank-you visual identity and navigation hierarchy.
- Add no runtime dependencies, backend, analytics, CMS, or external website integration.
- Use test-first red-green-refactor for each behavior change.
- Keep cyclic navigation for book and ticket presentations; scrapbook navigation stops at its first and last pages.
- Keep `pnpm-lock.yaml` untouched because it is pre-existing user-owned untracked content and no dependency changes are required.
- In PowerShell, set `$git = 'C:\Users\Ryan\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\git\cmd\git.exe'` once, then use `& $git --git-dir=.gitdata --work-tree=.` for every Git command because `.gitdata/config` contains a stale macOS `core.worktree` path.

## File Structure

- Create `src/experience/gesturePolicy.ts`: pure swipe and wheel-burst classification.
- Create `src/three/textLayout.ts`: measured title/subtitle wrapping independent of Canvas creation.
- Modify `src/experience/layout.ts`: fitted cover scale and truthful render profile.
- Modify `src/experience/PortfolioExperience.ts`: pointer lifecycle, safe transitions, live motion preference, semantic content, visible status, lazy imports, rendering pause, and cleanup.
- Modify `src/animation/timelines.ts`: resolve reduced-motion policy at timeline execution time.
- Modify affected files in `src/models/`: consume live reduced-motion state and suppress decorative motion.
- Modify `src/three/textures.ts`: use tested text-layout helpers.
- Modify `src/main.ts`: DOM-only WebGL fallback.
- Modify `src/styles.css`: visible toast and semantic-layer/focus styling.
- Add focused Vitest files for gesture and text layout; extend layout, timeline, interaction, and model tests.

---

### Task 1: Truthful Responsive Layout and Render Profile

**Files:**
- Modify: `src/experience/layout.ts`
- Modify: `src/experience/PortfolioExperience.ts`
- Test: `tests/layout.test.ts`

**Interfaces:**
- Produces: `getCoverScale(width: number, height: number): number`
- Produces: `RenderProfile` with `{ isMobile, pixelRatio, shadowMapSize }`
- Consumes: existing `getDirectoryLayout` and `getDetailScale`

- [ ] **Step 1: Write failing layout tests**

Add assertions that a 390x844 viewport receives a cover scale no larger than `0.54`, desktop remains `1`, and `RenderProfile` no longer advertises unused `geometrySegments`:

```ts
import { getCoverScale, getDetailScale, getDirectoryLayout, getRenderProfile } from '../src/experience/layout';

test('fits the wide cover inside portrait viewports', () => {
  expect(getCoverScale(390, 844)).toBeLessThanOrEqual(0.54);
  expect(getCoverScale(1440, 900)).toBe(1);
});

test('returns only render settings consumed by the runtime', () => {
  expect(getRenderProfile(390, 844, 3)).toEqual({
    isMobile: true,
    pixelRatio: 1.5,
    shadowMapSize: 1024,
  });
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/layout.test.ts`

Expected: FAIL because `getCoverScale` is missing and `geometrySegments` is still returned.

- [ ] **Step 3: Implement fitted cover scaling and remove the false field**

Implement `getCoverScale` with a desktop fast path and an aspect-based portrait scale capped at `0.54`. Apply it during resize. Set the key light's `shadow.mapSize.width` and `height` from `profile.shadowMapSize`; retain the light as a class field so resize can update it.

```ts
export function getCoverScale(width: number, height: number): number {
  if (width >= 720 && width / height >= 0.85) return 1;
  return Math.min(0.72, 0.54 * Math.min(1, width / 390));
}
```

- [ ] **Step 4: Run focused tests and the layout-related existing suite**

Run: `npm test -- tests/layout.test.ts tests/models.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit the responsive fix**

```bash
& $git --git-dir=.gitdata --work-tree=. add src/experience/layout.ts src/experience/PortfolioExperience.ts tests/layout.test.ts
& $git --git-dir=.gitdata --work-tree=. commit -m "fix: fit mobile scenes and apply render profile"
```

---

### Task 2: Canvas Text Layout for CJK, Newlines, and Long Tokens

**Files:**
- Create: `src/three/textLayout.ts`
- Modify: `src/three/textures.ts`
- Create: `tests/textLayout.test.ts`

**Interfaces:**
- Produces: `wrapMeasuredText(text, maxWidth, measure, maxLines): string[]`
- Produces: `truncateMeasuredText(text, maxWidth, measure): string`
- Consumes: `(value: string) => number` measurement callback supplied by Canvas 2D.

- [ ] **Step 1: Write failing pure layout tests**

```ts
import { describe, expect, test } from 'vitest';
import { truncateMeasuredText, wrapMeasuredText } from '../src/three/textLayout';

const measure = (value: string) => [...value].length;

test('preserves explicit lines and wraps Chinese by grapheme', () => {
  expect(wrapMeasuredText('第一行\n中文内容很长', 4, measure, 4))
    .toEqual(['第一行', '中文内容', '很长']);
});

test('wraps long unbroken Latin tokens and ellipsizes overflow', () => {
  expect(wrapMeasuredText('ABCDEFGHIJ', 4, measure, 2)).toEqual(['ABCD', 'EFG…']);
});

test('truncates titles without splitting Unicode code points', () => {
  expect(truncateMeasuredText('作品集😀标题', 6, measure)).toBe('作品集😀…');
});
```

- [ ] **Step 2: Run the focused test and verify RED**

Run: `npm test -- tests/textLayout.test.ts`

Expected: FAIL because `src/three/textLayout.ts` does not exist.

- [ ] **Step 3: Implement measured wrapping**

Split explicit paragraphs with `/\r?\n/`, tokenize whitespace-delimited Latin text, and fall back to `Array.from()` graphemes when a token exceeds `maxWidth`. Reserve one ellipsis cell on the final line when content remains. Use the helper from `createTextTexture` instead of `subtitle.split(' ')` and the code-unit title loop.

- [ ] **Step 4: Run focused and texture/model tests**

Run: `npm test -- tests/textLayout.test.ts tests/models.test.ts tests/referenceGraphics.test.ts`

Expected: PASS with no snapshot or texture-construction regressions.

- [ ] **Step 5: Commit text layout**

```bash
& $git --git-dir=.gitdata --work-tree=. add src/three/textLayout.ts src/three/textures.ts tests/textLayout.test.ts
& $git --git-dir=.gitdata --work-tree=. commit -m "fix: wrap canvas text across scripts"
```

---

### Task 3: Pointer Lifecycle, Swipe Intent, and Wheel Burst Control

**Files:**
- Create: `src/experience/gesturePolicy.ts`
- Modify: `src/experience/PortfolioExperience.ts`
- Create: `tests/gesturePolicy.test.ts`
- Modify: `tests/interactions.test.ts`

**Interfaces:**
- Produces: `isHorizontalSwipe(input: { dx: number; dy: number; threshold?: number; dominance?: number }): boolean`
- Produces: `createWheelGestureGate(options): { push(deltaY, now): -1 | 0 | 1; reset(): void }`
- Consumes: direction result `-1` for previous, `1` for next, `0` for no navigation.

- [ ] **Step 1: Write failing gesture-policy tests**

```ts
test('accepts intentional horizontal swipes only', () => {
  expect(isHorizontalSwipe({ dx: -80, dy: 18 })).toBe(true);
  expect(isHorizontalSwipe({ dx: -80, dy: 140 })).toBe(false);
  expect(isHorizontalSwipe({ dx: 40, dy: 2 })).toBe(false);
});

test('emits once for a wheel burst and resets after inactivity', () => {
  const gate = createWheelGestureGate({ threshold: 24, cooldownMs: 450, idleResetMs: 180 });
  expect(gate.push(30, 0)).toBe(1);
  expect(gate.push(30, 40)).toBe(0);
  expect(gate.push(30, 500)).toBe(1);
  gate.reset();
  expect(gate.push(-30, 510)).toBe(-1);
});
```

- [ ] **Step 2: Run the focused tests and verify RED**

Run: `npm test -- tests/gesturePolicy.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure policy and integrate pointer cleanup**

Add a shared `finishPointerInteraction(event, cancelled)` method. Bind `pointerup`, `pointercancel`, and `lostpointercapture`; clear the pointer snapshot on every path, release capture safely, reset `dragRotation` to `{x: 0, y: 0}`, and never activate or navigate on cancellation. Track `dy` and require horizontal dominance through `isHorizontalSwipe`.

Replace direct wheel dispatch with the gate. Normalize `deltaMode` to pixels, call `preventDefault()` only in pageable details, and dispatch only when the gate emits a direction. Reset the gate when leaving details and in `destroy()`.

- [ ] **Step 4: Run focused interaction tests**

Run: `npm test -- tests/gesturePolicy.test.ts tests/interactions.test.ts tests/stateMachine.test.ts`

Expected: PASS.

- [ ] **Step 5: Commit gesture fixes**

```bash
& $git --git-dir=.gitdata --work-tree=. add src/experience/gesturePolicy.ts src/experience/PortfolioExperience.ts tests/gesturePolicy.test.ts tests/interactions.test.ts
& $git --git-dir=.gitdata --work-tree=. commit -m "fix: make pointer and wheel navigation intentional"
```

---

### Task 4: Live Reduced Motion and Render Lifecycle

**Files:**
- Modify: `src/animation/timelines.ts`
- Modify: `src/three/runtime.ts`
- Modify: `src/experience/PortfolioExperience.ts`
- Modify: `src/models/cover.ts`
- Modify: `src/models/directoryFolder.ts`
- Modify: `src/models/aboutCv.ts`
- Modify: `src/models/scrapbook.ts`
- Modify: `src/models/journey.ts`
- Modify: `src/models/book.ts`
- Modify: `src/models/ticket.ts`
- Modify: `src/models/thanks.ts`
- Test: `tests/timelines.test.ts`
- Test: `tests/models.test.ts`

**Interfaces:**
- Changes: `createTimelineController({ reducedMotion })` accepts `boolean | (() => boolean)` and resolves it inside `run()`.
- Changes: `SculptModelActions` gains `setReducedMotion(reduced: boolean): void`.
- Produces: every handle stores `root.userData.reducedMotion` as the live source of truth.

- [ ] **Step 1: Write failing live-policy tests**

Add a timeline test whose `reducedMotion` callback changes between two `run()` calls. Add a model-handle test that calls `actions.setReducedMotion(true)` and asserts `root.userData.reducedMotion === true`.

```ts
test('reads reduced-motion policy for every run', async () => {
  let reduced = false;
  const controller = createTimelineController({ reducedMotion: () => reduced });
  reduced = true;
  const subject = { x: 0 };
  await controller.run((timeline) => timeline.to(subject, { x: 1 }));
  expect(subject.x).toBe(1);
  expect(controller.locked).toBe(false);
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/timelines.test.ts tests/models.test.ts`

Expected: FAIL because the controller accepts only a boolean and handles lack `setReducedMotion`.

- [ ] **Step 3: Implement live model motion state**

Teach the timeline controller to evaluate `typeof reducedMotion === 'function' ? reducedMotion() : reducedMotion` at `run()` time. Add the default handle action that updates `root.userData.reducedMotion`. Initialize this field in every model and change decorative update functions to use it instead of a captured constructor boolean. Reduced motion forces hover amounts, idle sine offsets, and pointer rotations to their resting values.

- [ ] **Step 4: Integrate media-query and visibility lifecycle**

Store the `MediaQueryList`, bind a `change` listener, update state and every handle on changes, and reset camera/detail rotations. Add `visibilitychange`: cancel the animation frame while hidden; on visible, restart the clock and schedule exactly one loop. Make `animate()` return immediately after destruction.

- [ ] **Step 5: Run focused and complete model tests**

Run: `npm test -- tests/timelines.test.ts tests/models.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the motion lifecycle**

```bash
& $git --git-dir=.gitdata --work-tree=. add src/animation/timelines.ts src/three/runtime.ts src/experience/PortfolioExperience.ts src/models tests/timelines.test.ts tests/models.test.ts
& $git --git-dir=.gitdata --work-tree=. commit -m "fix: honor live reduced motion and page visibility"
```

---

### Task 5: Safe Transitions, Semantic Content, and Visible Feedback

**Files:**
- Modify: `src/experience/PortfolioExperience.ts`
- Modify: `src/styles.css`
- Modify: `src/main.ts`
- Create: `src/experience/fallback.ts`
- Create: `tests/fallback.test.ts`
- Modify: `tests/stateMachine.test.ts`
- Modify: `tests/interactions.test.ts`

**Interfaces:**
- Produces: `buildFallback(container: HTMLElement, content: PortfolioContent): void`
- Produces: private `announce(message: string, visible?: boolean): void`
- Produces: private `runLockedTransition(operation, recovery): Promise<boolean>`

- [ ] **Step 1: Write failing fallback and state-boundary tests**

Use a minimal fake DOM or exported element factory to assert that fallback text containing `<img onerror=...>` remains literal text and no `innerHTML` sink is used. Extend interaction tests so invalid category identifiers return no actionable transition at the experience validation boundary.

```ts
test('renders portfolio strings as text in fallback content', () => {
  const content = structuredClone(portfolioContent);
  content.categories[0]!.title.zh = '<img src=x onerror=alert(1)>';
  const root = document.createElement('div');
  buildFallback(root, content);
  expect(root.querySelector('img')).toBeNull();
  expect(root.textContent).toContain('<img src=x onerror=alert(1)>');
});
```

- [ ] **Step 2: Run focused tests and verify RED**

Run: `npm test -- tests/fallback.test.ts tests/interactions.test.ts`

Expected: FAIL because `buildFallback` and validation are missing.

- [ ] **Step 3: Replace fallback interpolation and add visible status**

Build fallback elements using `createElement` and `textContent`. Add a `.scene-toast` element with `role="status"`; `announce()` updates it and the live region, clears prior timers, and hides nonpersistent messages after four seconds. Use it for website placeholders, WebGL context loss/restoration, and transition errors.

- [ ] **Step 4: Add resilient transition execution**

Wrap every awaited transition in `runLockedTransition`. It must set the lock, execute the operation, catch and log errors, call the branch-specific recovery that restores a visible valid screen, announce failure, and release the lock in `finally`. Validate category existence before opening or hiding the directory.

- [ ] **Step 5: Make semantic controls match visible content**

Add a semantic heading and text nodes for current category/project/journey details and contact data. On each completed screen transition, focus the first relevant button with `{ preventScroll: true }`. For scrapbook pages, omit previous on index `0` and next on `count - 1`; retain both for cyclic book/ticket presentations. Replace the website control label with `WEBSITE / COMING SOON` and keep the visible toast behavior.

- [ ] **Step 6: Run focused accessibility and fallback tests**

Run: `npm test -- tests/fallback.test.ts tests/interactions.test.ts tests/stateMachine.test.ts tests/content.test.ts`

Expected: PASS.

- [ ] **Step 7: Commit safe transitions and semantics**

```bash
& $git --git-dir=.gitdata --work-tree=. add src/main.ts src/styles.css src/experience/PortfolioExperience.ts src/experience/fallback.ts tests/fallback.test.ts tests/interactions.test.ts tests/stateMachine.test.ts
& $git --git-dir=.gitdata --work-tree=. commit -m "fix: recover transitions and expose semantic content"
```

---

### Task 6: Lazy Detail Modules and Complete Resource Cleanup

**Files:**
- Modify: `src/experience/PortfolioExperience.ts`
- Modify: `src/three/runtime.ts`
- Test: `tests/models.test.ts`

**Interfaces:**
- Produces: private async `createDetailHandle(category): Promise<SculptModelHandle>` using presentation-specific `import()`.
- Produces: idempotent `destroy()` that removes every listener and standalone Three.js allocation.

- [ ] **Step 1: Add cleanup regression assertions**

Extend runtime/model tests with disposal spies for standalone texture, material, and geometry resources. Add an idempotency assertion that disposing a handle twice does not throw; protect `disposeObject` with a `WeakSet` or handle-level disposed flag if required by Three.js disposal behavior.

- [ ] **Step 2: Run focused tests and verify RED where cleanup is missing**

Run: `npm test -- tests/models.test.ts`

Expected: at least one new cleanup assertion fails before the implementation.

- [ ] **Step 3: Dynamically import detail factories**

Remove eager imports for `aboutCv`, `scrapbook`, `journey`, `book`, and `ticket`. In `createDetailHandle`, switch on `category.presentation`, dynamically import exactly one module, and construct its model. Preserve `showDetail`'s existing scale, scene registration, and open behavior.

- [ ] **Step 4: Complete destroy and stale-reference cleanup**

Store named callbacks for WebGL context events, pointer cancel/lost capture, media-query change, and visibility change. Remove all DOM/window/media listeners in `destroy()`, clear toast and wheel timers, cancel the frame, clear hover before disposing details, dispose `finishTag`, dispose standalone directory/header resources exactly once, clear maps and sets, and guard repeated destruction.

- [ ] **Step 5: Run model tests and production build**

Run: `npm test -- tests/models.test.ts && npm run build`

Expected: PASS; build output includes separate presentation chunks and no single application chunk exceeds the former 500 KB warning threshold.

- [ ] **Step 6: Commit performance and cleanup**

```bash
& $git --git-dir=.gitdata --work-tree=. add src/experience/PortfolioExperience.ts src/three/runtime.ts tests/models.test.ts
& $git --git-dir=.gitdata --work-tree=. commit -m "perf: lazy load details and release scene resources"
```

---

### Task 7: Full Regression and Browser Verification

**Files:**
- Modify only if verification reveals a reproducible defect in files already listed above.
- Test: all `tests/*.test.ts`

**Interfaces:**
- Consumes all prior task outputs.
- Produces verified desktop and mobile behavior plus final repository commits.

- [ ] **Step 1: Run the complete automated suite**

Run: `npm test`

Expected: all test files and all test cases PASS with zero failures.

- [ ] **Step 2: Run type checking and production build**

Run: `npm run build`

Expected: TypeScript exits zero, Vite build succeeds, presentation chunks are split, and the previous monolithic chunk warning is absent.

- [ ] **Step 3: Run dependency audit**

Run: `pnpm audit --prod --registry=https://registry.npmjs.org/`

Expected: `No known vulnerabilities found`.

- [ ] **Step 4: Verify desktop flow in a real browser**

At 1280x720, exercise cover to directory; open and close all five categories; navigate book/ticket/scrapbook projects by visible controls, keyboard, wheel, and horizontal swipe; open/close all journey stations; finish and restart. Verify no console errors, no double navigation, visible placeholder feedback, correct semantic text, and stable focus.

- [ ] **Step 5: Verify portrait mobile flow**

At 390x844, confirm cover and contact card fit horizontally; directory folders are reachable; every detail fits; a vertical-dominant drag does not turn a page; a horizontal swipe turns exactly one page; pointer cancellation leaves subsequent taps working.

- [ ] **Step 6: Verify reduced motion**

With `prefers-reduced-motion: reduce`, reload and repeat cover, directory, one paged detail, and close flow. Confirm transitions settle immediately and camera/hover/idle decorative motion remains at rest.

- [ ] **Step 7: Inspect the final diff and return regressions to their owning task**

```bash
& $git --git-dir=.gitdata --work-tree=. diff --check
& $git --git-dir=.gitdata --work-tree=. status --short
```

Expected: no tracked modifications remain. If verification finds a defect, write a failing regression test and repeat the implementation and commit steps in the task that owns that behavior; do not create an untested catch-all correction.

- [ ] **Step 8: Record final evidence**

Capture the final test count, build chunk table, audit result, browser viewport coverage, and commit hashes in the completion report. Do not claim completion without rerunning the final verification commands on the exact committed tree.
