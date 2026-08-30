# Reference-Faithful Three.js Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the current generic portfolio visuals with reference-faithful procedural Three.js models and GSAP-driven transitions for the cover, five-folder directory, two detail presentations, and thank-you screen.

**Architecture:** Keep the existing content data and explicit experience state machine, but split visual factories into cover, directory-folder, book, ticket, and thanks modules. A new animation coordinator owns all GSAP timelines and returns cancellable promises; `PortfolioExperience` coordinates state, raycasting, responsive layout, lazy model creation, and disposal without directly sculpting model parts.

**Tech Stack:** Vite 7, TypeScript 5.9, Three.js 0.180, GSAP 3, Vitest 3, CanvasTexture, img2threejs review artifacts.

**Spec:** `docs/superpowers/specs/2026-08-26-reference-faithful-three-portfolio-design.md`

## Global Constraints

- Three screens only: cover, directory with modal-like 3D detail expansion, and thanks.
- First implementation keeps the reference wording and reference-driven composition.
- Visible reference-view layout targets exact proportions and layering; unseen surfaces are plausible authored completions.
- No whole-reference-image texture mapped onto one mesh.
- Text and flat graphics may use high-resolution CanvasTexture; thickness, folds, seams, serrations, pivots, clips, and connections must be geometry.
- Five directory folders use blue, green, orange, yellow, and pink in a desktop 3+2/mobile 2+2+1 layout.
- GSAP owns transitions; every timeline must support interruption, transition locking, reduced motion, and cleanup.
- Original procedural collage shapes replace people, trademarks, and watermarks from the reference.
- Desktop acceptance viewport is 1440×900; mobile acceptance viewport is 390×844.
- Existing content/state/model tests must remain green and new animation/fidelity contracts must be added with TDD.
- The workspace is not a Git repository; every task ends with a test/build checkpoint instead of a commit.

---

### Task 1: GSAP Animation Runtime

**Files:**
- Modify: `package.json`
- Create: `src/animation/timelines.ts`
- Create: `tests/timelines.test.ts`
- Modify: `src/three/runtime.ts`

**Interfaces:**
- Consumes: `SculptModelHandle`, Three.js object transforms, `prefers-reduced-motion` state.
- Produces: `TimelineController`, `runTimeline(factory, options): Promise<void>`, `killActiveTimeline(): void`, and Promise-returning model actions.

- [ ] **Step 1: Add failing timeline lifecycle tests**

```ts
test('locks while a timeline runs and unlocks after completion', async () => {
  const controller = createTimelineController({ reducedMotion: true });
  const promise = controller.run((timeline) => timeline.to(subject.position, { x: 2 }));
  expect(controller.locked).toBe(true);
  await promise;
  expect(controller.locked).toBe(false);
  expect(subject.position.x).toBe(2);
});

test('kills the previous transition before starting another', async () => {
  const controller = createTimelineController({ reducedMotion: true });
  const first = controller.run((timeline) => timeline.to(subject.position, { x: 1 }));
  const second = controller.run((timeline) => timeline.to(subject.position, { x: 3 }));
  await Promise.all([first, second]);
  expect(subject.position.x).toBe(3);
});
```

- [ ] **Step 2: Run the targeted test and observe missing-module failure**

Run: `npm test -- --run tests/timelines.test.ts`

Expected: FAIL because `src/animation/timelines.ts` does not exist.

- [ ] **Step 3: Install GSAP and implement the controller**

Run: `npm install gsap@^3.13.0 --save`

Implement a controller that creates one `gsap.timeline`, replaces durations with `0.01` under reduced motion, resolves on complete or interruption, kills the active timeline before replacement, and exposes a read-only `locked` property.

- [ ] **Step 4: Make model actions asynchronous**

Change `SculptModelActions.open/close/setProject` to return `Promise<void> | void`; keep `setHovered`, `explode`, and `reset` synchronous. Existing factories remain source-compatible until replaced.

- [ ] **Step 5: Verify the runtime**

Run: `npm test -- --run tests/timelines.test.ts tests/models.test.ts`

Expected: PASS with no unhandled Promise rejection.

### Task 2: Reference Typography and Graphic Texture System

**Files:**
- Modify: `src/three/textures.ts`
- Modify: `src/three/geometry.ts`
- Create: `src/three/referenceGraphics.ts`
- Create: `tests/referenceGraphics.test.ts`

**Interfaces:**
- Consumes: canvas dimensions, exact text blocks, normalized layout coordinates, local font stacks.
- Produces: `createReferenceTexture(spec): THREE.CanvasTexture`, `makeReferencePanel(width, height, depth, spec): THREE.Mesh`, and reusable cover/thanks/directory graphic specs.

- [ ] **Step 1: Write failing texture-layout tests**

```ts
test('cover graphic preserves named reference layers', () => {
  expect(coverGraphic.layers.map((layer) => layer.id)).toEqual([
    'portfolio-title', 'year', 'script-title', 'left-contact', 'right-contact', 'bottom-rail'
  ]);
});

test('thank-you graphic includes both cards and contact line', () => {
  expect(thanksGraphic.layers.some((layer) => layer.id === 'thank-you-title')).toBe(true);
  expect(thanksGraphic.layers.some((layer) => layer.id === 'contact-line')).toBe(true);
});
```

- [ ] **Step 2: Run the test and confirm the exports are absent**

Run: `npm test -- --run tests/referenceGraphics.test.ts`

Expected: FAIL on missing `referenceGraphics` exports.

- [ ] **Step 3: Implement layered texture specifications**

Define normalized `TextLayer`, `RuleLayer`, and `ShapeLayer` records. Render the exact first-stage copy: `PORTFOLIO`, `2024`, `Graphic Design`, `老板您好`, `THANK YOU`, `感谢观看`, `Thank you`, `Thanks for watching`, and `PLEASE contact me`. Use large canvas sizes between 1600×900 and 2048×1024, sRGB output, explicit letter spacing, line height, alignment, and per-layer font stacks.

- [ ] **Step 4: Add front/back face selection to reference panels**

Keep paper edges as rough `MeshStandardMaterial`; assign the graphic texture only to the camera-facing +Z material group. Expose the carrier mesh name for QA and disposal.

- [ ] **Step 5: Verify typography contracts**

Run: `npm test -- --run tests/referenceGraphics.test.ts tests/models.test.ts`

Expected: PASS.

### Task 3: Rebuild the Reference-Faithful Cover

**Files:**
- Create: `src/models/cover.ts`
- Modify: `tests/models.test.ts`
- Modify: `src/experience/PortfolioExperience.ts`

**Interfaces:**
- Consumes: reference graphic utilities and `TimelineController`.
- Produces: `createCoverModel(): SculptModelHandle` with parts `portfolio-title`, `year-script`, `folder-back`, `folder-tab`, `inner-sheet`, `front-flap`, `greeting-carrier`, `left-info`, `right-info`, and `bottom-rail`.

- [ ] **Step 1: Write failing cover-part and proportion tests**

```ts
test('cover exposes every reference-defining layer as a separate part', () => {
  const cover = createCoverModel();
  expect([...cover.parts.keys()]).toEqual(expect.arrayContaining([
    'portfolio-title', 'year-script', 'folder-back', 'folder-tab', 'inner-sheet',
    'front-flap', 'greeting-carrier', 'left-info', 'right-info', 'bottom-rail'
  ]));
});

test('front flap is a slanted folder shape with its own hinge', () => {
  const cover = createCoverModel();
  expect(cover.parts.get('front-flap')?.parent?.name).toBe('front-flap-hinge');
});
```

- [ ] **Step 2: Run the cover tests and confirm failure**

Run: `npm test -- --run tests/models.test.ts`

Expected: FAIL because `createCoverModel` and the named layers do not exist.

- [ ] **Step 3: Model the cover composition**

Create independent title planes above the folder, a wide folder back with centered tab, visible white sheet, slanted trapezoidal front flap, side information carriers, and a thin yellow lower rail. Match the reference-view normalized bounds: title top 4–27%, folder 27–96%, bottom rail 94–99%.

- [ ] **Step 4: Add GSAP cover actions**

`open()` runs: front flap rotation X `0 → -1.02`, inner sheet Y `0 → 0.72`, title/info opacity `1 → 0`, and root scale `1 → 1.08`. `close()` reverses the resting transforms. Use a bottom-edge hinge and ensure the interactive target remains the visible front flap.

- [ ] **Step 5: Integrate and verify the cover only**

Replace the old cover `createFolderModel` call with `createCoverModel`, run `npm test -- --run tests/models.test.ts tests/stateMachine.test.ts`, then capture a 1440×900 cover screenshot for visual comparison.

### Task 4: Rebuild the Five Reference-Style Directory Folders

**Files:**
- Create: `src/models/directoryFolder.ts`
- Modify: `src/experience/layout.ts`
- Modify: `src/experience/PortfolioExperience.ts`
- Modify: `tests/layout.test.ts`
- Modify: `tests/models.test.ts`

**Interfaces:**
- Consumes: category titles/colors, directory layout, `TimelineController`.
- Produces: `createDirectoryFolderModel(category, collageVariant): SculptModelHandle` and five `CollageVariant` definitions.

- [ ] **Step 1: Write failing folder silhouette and collage tests**

```ts
test('directory folder uses shallow reference proportions and layered collage', () => {
  const folder = createDirectoryFolderModel(portfolioContent.categories[0]!, 'sport');
  expect(folder.parts.has('front-pocket')).toBe(true);
  expect(folder.parts.has('rear-pocket')).toBe(true);
  expect(folder.parts.has('collage-root')).toBe(true);
  expect(folder.parts.has('outside-label')).toBe(true);
});
```

- [ ] **Step 2: Run tests and confirm missing factory failure**

Run: `npm test -- --run tests/models.test.ts tests/layout.test.ts`

Expected: FAIL on the new factory.

- [ ] **Step 3: Implement the five folder variants**

Use reference proportions approximately 1.55:1, a low front pocket covering the lower 60%, a visible rear pocket, a narrow dark internal lip, and 3–6 programmatic collage parts above the pocket. Variants are `sport`, `business`, `technology`, `culture`, and `cinema`; map them to the existing five categories. Use blue, mint green, orange, yellow, and pink.

- [ ] **Step 4: Implement the directory GSAP entrance and selection choreography**

Folders enter with staggered Y/scale/rotation. Selection moves the chosen root to scene center and scale 1.35, lowers its front pocket around the bottom hinge, dims other materials to 42%, and pushes unselected roots to Z −1.2. Close reverses the exact stored layout transforms.

- [ ] **Step 5: Verify desktop and mobile layout contracts**

Run: `npm test -- --run tests/models.test.ts tests/layout.test.ts tests/interactions.test.ts`

Expected: PASS with row sequences `[0,0,0,1,1]` and `[0,0,1,1,2]`.

### Task 5: Refine Book and Ticket Detail Models with GSAP

**Files:**
- Modify: `src/models/book.ts`
- Modify: `src/models/ticket.ts`
- Modify: `tests/models.test.ts`
- Create: `tests/detailAnimations.test.ts`

**Interfaces:**
- Consumes: selected category/project, reference graphics, timeline runtime.
- Produces: asynchronous `open`, `close`, and `setProject` actions for both detail templates.

- [ ] **Step 1: Add failing reference-detail tests**

```ts
test('book exposes spine, page edges, two clips, index tabs and sticker field', () => {
  const book = createOpenBookModel(bookCategory, 0);
  for (const id of ['spine', 'page-edge-left', 'page-edge-right', 'left-clip', 'right-clip', 'index-tabs', 'sticker-field']) {
    expect(book.parts.has(id)).toBe(true);
  }
});

test('ticket exposes fold, rear notes, serrations and lower strip', () => {
  const ticket = createTicketStackModel(ticketCategory, 0);
  for (const id of ['fold-corner', 'rear-note', 'serial-tab', 'serrated-edge', 'lower-strip', 'icon-tag']) {
    expect(ticket.parts.has(id)).toBe(true);
  }
});
```

- [ ] **Step 2: Run targeted tests and observe absent parts**

Run: `npm test -- --run tests/models.test.ts tests/detailAnimations.test.ts`

Expected: FAIL on missing named details and asynchronous action contracts.

- [ ] **Step 3: Add missing book geometry and reference-density graphics**

Add two thin page-edge stacks, five right-side index tabs, two metal clips with jaws, a sticker field of independently modeled extruded labels, and red background switching while the detail is active.

- [ ] **Step 4: Add missing ticket geometry**

Separate rear yellow note, serial tab, lower Morse strip, folded corner face, main serrated outline, and yellow icon tag. Switch the detail background to reference purple while active.

- [ ] **Step 5: Replace detail motion with GSAP timelines**

Book open rotates page groups from ±1.25 to 0 and scales the root from 0.2 to 1. Ticket open staggers rear cards from Y 0 and slides the main content from X 5. Project changes animate out, update CanvasTexture at the covered midpoint, then animate in.

- [ ] **Step 6: Verify detail behavior**

Run: `npm test -- --run tests/models.test.ts tests/detailAnimations.test.ts tests/stateMachine.test.ts`

Expected: PASS.

### Task 6: Rebuild the Reference-Faithful Thank-You Screen

**Files:**
- Modify: `src/models/thanks.ts`
- Modify: `tests/models.test.ts`

**Interfaces:**
- Consumes: reference graphics and timeline runtime.
- Produces: `createThankYouModel` with parts `thank-you-title`, `year-script`, `rear-paper`, `front-paper`, `message-carrier`, `contact-line`, `bottom-rail`, and `restart-tab`.

- [ ] **Step 1: Write failing thank-you composition tests**

```ts
test('thank-you model matches the reference layer inventory', () => {
  const thanks = createThankYouModel({ zh: '感谢观看', en: 'THANK YOU' }, 'hello@example.com');
  expect([...thanks.parts.keys()]).toEqual(expect.arrayContaining([
    'thank-you-title', 'year-script', 'rear-paper', 'front-paper',
    'message-carrier', 'contact-line', 'bottom-rail', 'restart-tab'
  ]));
});
```

- [ ] **Step 2: Run the model test and confirm failure**

Run: `npm test -- --run tests/models.test.ts`

Expected: FAIL on missing title/contact/paper layer names.

- [ ] **Step 3: Rebuild the thanks composition**

Place the oversized title in the top quarter, overlay the white year/script carrier, position the rear paper left-tilted and the front paper upright in the lower center, place the message on the front sheet, and keep the contact line and yellow rail near the bottom edge.

- [ ] **Step 4: Add GSAP thanks actions**

`open()` staggers title scale/opacity and raises both papers from Y −4 with different rotations. `close()` reverses the sequence. `restart-tab` remains the only restart click target.

- [ ] **Step 5: Verify thanks contracts**

Run: `npm test -- --run tests/models.test.ts tests/timelines.test.ts`

Expected: PASS.

### Task 7: Integrate State, Camera, Background, and Timeline Locking

**Files:**
- Modify: `src/experience/PortfolioExperience.ts`
- Modify: `src/experience/stateMachine.ts`
- Modify: `tests/stateMachine.test.ts`
- Modify: `tests/interactions.test.ts`

**Interfaces:**
- Consumes: all five model factories and `TimelineController`.
- Produces: deterministic asynchronous screen transitions with state updates only at safe timeline boundaries.

- [ ] **Step 1: Write failing transition-lock tests**

```ts
test('ignores navigation while a transition is locked', () => {
  const locked = { ...createExperienceState(false), transitionLocked: true };
  expect(reduceExperience(locked, { type: 'ENTER_DIRECTORY' })).toBe(locked);
});
```

- [ ] **Step 2: Run state and interaction tests**

Run: `npm test -- --run tests/stateMachine.test.ts tests/interactions.test.ts`

Expected: FAIL until the reducer understands explicit transition locking.

- [ ] **Step 3: Replace timer-based transitions**

Remove `transitionTimer`. Dispatch methods await model/timeline actions, set `transitionLocked` before animation, switch visibility/background at the documented midpoint, and unlock in `finally`. Kill active timelines during `destroy()` and WebGL context loss.

- [ ] **Step 4: Coordinate camera and background per screen**

Use blue for cover/directory/thanks, red for book details, and purple for ticket details. Animate camera Z and FOV through GSAP; update projection matrices during tween updates. Preserve pointer parallax only when no transition is active.

- [ ] **Step 5: Verify the integrated state machine**

Run: `npm test -- --run tests/stateMachine.test.ts tests/interactions.test.ts tests/timelines.test.ts`

Expected: PASS with no duplicate transition.

### Task 8: Browser QA, img2threejs Evidence, and Delivery

**Files:**
- Modify: `work/img2three-review.md`
- Update: `.img2threejs/*/state.json` through skill commands only
- Update: `outputs/*.png`
- Update: `outputs/three-portfolio-source.zip`

**Interfaces:**
- Consumes: production build and all runtime interactions.
- Produces: desktop/mobile screenshots, comparison notes, updated skill evidence, and verified source archive.

- [ ] **Step 1: Run the complete automated verification**

Run: `npm test && npm run build`

Expected: all tests pass and Vite emits `dist/` successfully.

- [ ] **Step 2: Validate all five img2threejs specs**

Run for each `.img2threejs/*/object-sculpt-spec.json`:

```bash
python3 /Users/hanjingyi/.codex/skills/img2threejs/forge/stage2_spec/validate_sculpt_spec.py <spec> --strict-quality
```

Expected: five `PASS` results.

- [ ] **Step 3: Capture desktop interaction states**

At 1440×900 capture cover, directory, open book, ticket stack, and thanks. Exercise cover click, all five folders, next/previous project, close, finish, and restart. Check the browser console for application errors.

- [ ] **Step 4: Capture mobile interaction states**

At 390×844 capture cover, 2+2+1 directory, fitted book, and fitted ticket. Exercise tap, horizontal swipe, Escape-equivalent semantic controls, and reduced-motion mode.

- [ ] **Step 5: Perform visual reference review**

Record, for every screen, observed bounds, dominant colors, layer ordering, visible geometry thickness, and remaining mismatches. Do not claim hidden-side or commercial-font exactness. Update `work/img2three-review.md` with each correction and screenshot path.

- [ ] **Step 6: Refresh the delivery archive and verify it**

Run:

```bash
zip -r outputs/three-portfolio-source.zip . -x 'node_modules/*' 'outputs/*' '.DS_Store'
unzip -t outputs/three-portfolio-source.zip
```

Expected: `No errors detected in compressed data`.

---

## Execution Checkpoints

1. After Tasks 1–2: animation and graphic primitives pass tests.
2. After Tasks 3–4: cover and directory screenshots are reviewed against references before detail work continues.
3. After Tasks 5–7: complete interaction regression and responsive checks pass.
4. After Task 8: fresh automated verification, screenshots, evidence, and archive are delivered.
