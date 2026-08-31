# Portfolio Stability Hardening Design

**Date:** 2026-08-31

## Objective

Resolve the confirmed interaction, motion, responsive-layout, accessibility, performance, cleanup, and latent security issues without changing the portfolio's visual identity or content model. The result must retain the current cover, directory, detail, journey, and thank-you flows while making them predictable across mouse, touch, keyboard, screen-reader, reduced-motion, and narrow mobile environments.

## Scope

This change covers:

- pointer lifecycle, swipe intent, drag reset, and wheel gesture throttling;
- resilient asynchronous transitions and visible error feedback;
- mobile cover/detail fitting and effective render-quality settings;
- complete reduced-motion behavior and page-visibility-aware rendering;
- Canvas text wrapping for Chinese, explicit newlines, and long words;
- semantic project content, focus management, correct navigation boundaries, and visible CTA feedback;
- lazy loading of detail models and removal of avoidable GPU/resource leaks;
- safe DOM construction for the WebGL fallback;
- regression tests and desktop/mobile browser verification.

The visual composition, color palette, portfolio data shape, and navigation hierarchy remain unchanged. No backend, analytics, CMS, or external website integration is added.

## Architecture

### Pure interaction helpers

Add pure helpers under `src/experience/` for swipe classification and wheel gesture gating. Swipe navigation requires a horizontal displacement threshold and horizontal dominance over vertical motion. Pointer completion and cancellation share one cleanup path that clears the snapshot, releases capture when appropriate, resets drag distance, and returns detail rotation to neutral.

Wheel navigation treats a burst of trackpad or mouse-wheel events as one gesture. It accumulates meaningful vertical movement, dispatches at most once per cooldown window, ignores insignificant movement, and resets after inactivity. This behavior remains disabled for presentations that do not support project paging.

### Transition safety

`PortfolioExperience` owns transition execution. Every asynchronous transition uses `try/catch/finally`: `finally` releases the lock, while `catch` restores a valid visible screen, publishes an accessible and visible message, and logs the original error. Actions remain idempotent while locked.

Invalid category identifiers are rejected before hiding the directory or mutating detail state.

### Responsive rendering

Introduce fitted cover and detail scale calculations based on viewport aspect ratio and the known model bounds. Desktop sizes retain their current scale; portrait widths receive enough margin to avoid clipping.

The render profile exposes only settings that are applied. Pixel ratio and directional-light shadow-map size are updated on resize. The unused geometry-segment field is removed rather than pretending to tune model geometry that is currently constructed with fixed segment counts.

### Motion policy

Reduced motion becomes a live preference. A media-query change listener updates the experience and model motion policy without reloading. In reduced-motion mode:

- GSAP transitions settle immediately;
- camera parallax and pointer-driven rotations are disabled;
- model hover and idle oscillations are disabled or returned to rest;
- detail drag rotation is not applied;
- the renderer does not run unnecessary continuous decorative motion.

Rendering pauses while the document is hidden and resumes with a fresh clock delta when visible. Normal-motion mode keeps the existing visual character.

### Canvas text layout

Extract a text-layout helper that honors explicit newline boundaries and wraps Latin words, long unbroken tokens, and CJK text by measured width. It produces at most the requested number of lines and applies an ellipsis only when content is actually truncated. `createTextTexture` uses this helper for subtitles and safe title truncation.

### Accessibility and feedback

The semantic layer includes the current category title, project title, summary, tags, year, journey details, and contact information—not only navigation buttons. Focus moves to the first relevant control or semantic heading after a screen transition without duplicating the global Enter shortcut.

Scrapbook previous/next controls are omitted or disabled at their real boundaries. Other cyclic presentations remain cyclic.

Placeholder website interaction remains non-navigating but produces a visible toast as well as an `aria-live` message. WebGL context loss and transition failures use the same visible status surface.

### Performance and cleanup

Detail model modules are loaded with presentation-specific dynamic imports inside `showDetail`, keeping nonessential models out of the initial bundle. The cover, directory, and thank-you models remain eager because they are part of the primary flow.

`destroy()` removes every registered listener, cancels wheel timers and animation frames, disposes the finish tag and other standalone Three.js resources, kills active model timelines, and clears stale hover/detail references. The render loop respects both lifecycle destruction and page visibility.

### Safe fallback

The WebGL fallback is constructed with `createElement` and `textContent`. Portfolio content is never interpolated into `innerHTML`, so future CMS-backed content cannot turn the fallback into an XSS sink.

## Error Handling

- Transition errors leave either the originating screen or a safe directory screen visible.
- The transition lock is always released.
- User-facing errors appear in both the visible toast and live region.
- Developer diagnostics retain the original error in the console.
- Context-loss messages remain visible until restoration.
- Dynamic-import failures follow the same transition recovery path.

## Testing Strategy

### Unit tests

- swipe intent rejects vertical-dominant and sub-threshold gestures;
- wheel gate dispatches once per gesture and resets after the cooldown;
- pointer cleanup resets drag state through shared behavior where practical;
- mobile cover scale fits portrait viewports and desktop scale remains unchanged;
- render profiles contain and apply only supported quality fields;
- text layout handles newlines, Chinese, long tokens, truncation, and line limits;
- state transitions reject invalid categories at the experience boundary;
- scrapbook accessibility controls reflect first/last-page boundaries;
- fallback construction does not use HTML interpolation.

### Existing suite

All current state-machine, interaction, model, layout, timeline, content, and reference-graphics tests must remain green.

### Browser verification

Verify at a desktop viewport and 390x844 mobile viewport:

- cover is not clipped;
- each directory category opens and closes;
- swipe, keyboard, visible controls, and wheel navigation behave once per intent;
- journey popup opens and closes;
- focus controls and semantic content match the visible project;
- reduced-motion mode has no decorative parallax or idle oscillation;
- visible feedback appears for placeholder links and simulated failures;
- no console errors occur during the complete flow.

### Release checks

Run the full test suite, TypeScript type checking, production build, and production dependency audit. Confirm that the build is split into presentation-specific chunks and does not emit the previous monolithic-chunk warning.

## Commit Strategy

Commit the approved design separately. Implement in reviewable, test-backed groups, then create one final implementation commit after the full verification gate. The existing untracked `pnpm-lock.yaml` is user-owned and remains untouched unless dependency changes make it necessary; this design requires no dependency changes.
