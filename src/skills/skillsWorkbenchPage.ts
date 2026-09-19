import { gsap } from 'gsap';
import {
  preloadImageAssets,
  type ImageLoadProgress,
} from '../performance/imageAssets';
import { skillPanels } from '../content/skillWorkbench';
import type { SkillPanel } from '../content/types';

export { skillWorkbenchAssetUrls } from '../content/skillWorkbench';

/**
 * The fourth folder opens as a horizontal accordion: every project keeps a
 * narrow strip, and the strip under the pointer widens to show the whole
 * write-up. Real DOM text is used instead of a baked bitmap so the dense
 * Chinese copy stays sharp at any density, and so the panels can scroll.
 *
 * Narrow screens get the same accordion rotated: panels stack and expand
 * downwards, which is the only arrangement where the copy stays readable on a
 * phone.
 */

export const SKILLS_PAGE_TITLE = 'AI技能 / AI SKILLS';
export const SKILLS_PAGE_HEADING = 'AI 骑行营销工作台';
export const SKILLS_PAGE_HINT = '把指针移到任意面板上查看完整内容 · Hover a panel to expand it';
export const SKILLS_PAGE_HINT_TOUCH = '点按面板即可展开查看完整内容 · Tap a panel to expand it';
/** How far a preview may magnify a picture beyond its own pixels. */
const LIGHTBOX_MAX_UPSCALE = 2.5;
/** Small sources need a little more magnification to stay usable. */
const LIGHTBOX_SMALL_SOURCE_UPSCALE = 3;
const LIGHTBOX_SMALL_SOURCE_WIDTH = 700;
/** Share of the window width a previewed picture is printed at. */
const LIGHTBOX_WIDTH_RATIO = 0.8;

/**
 * Scale for one previewed picture. The picture is printed 80vw wide — big
 * enough to read every detail, still showing the page around it — and a
 * portrait shot then scrolls vertically rather than shrinking.
 */
export function lightboxImageScale(
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) return 1;
  const availableWidth = Math.max(240, viewportWidth * LIGHTBOX_WIDTH_RATIO);
  const availableHeight = Math.max(240, viewportHeight * 0.9);
  const fillWidth = availableWidth / naturalWidth;
  const fit = Math.min(fillWidth, availableHeight / naturalHeight);
  const cap = naturalWidth < LIGHTBOX_SMALL_SOURCE_WIDTH
    ? LIGHTBOX_SMALL_SOURCE_UPSCALE
    : LIGHTBOX_MAX_UPSCALE;
  return Math.max(fit, Math.min(fillWidth, cap));
}

export function preloadSkillsWorkbenchAssets(
  onProgress?: (progress: ImageLoadProgress) => void,
): Promise<string[]> {
  const sources = skillPanels.flatMap((panel) => [
    panel.cover,
    ...panel.imageGroups.flatMap((group) => group.images.map((image) => image.src)),
  ]);
  return preloadImageAssets([...new Set(sources)], onProgress, 'high');
}

const escapeHtml = (value: string): string => value
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

/**
 * Tile proportions are clamped: an extremely tall screenshot would otherwise
 * make a tile taller than the panel, and a very wide one would flatten it to a
 * letterbox. Inside the band each tile keeps the picture's own shape.
 */
const TILE_RATIO_BAND = { min: 0.62, max: 1.5 } as const;

export function tileRatio(aspect: number | undefined): string {
  const value = Number.isFinite(aspect) && (aspect as number) > 0 ? (aspect as number) : 0.8;
  const clamped = Math.min(TILE_RATIO_BAND.max, Math.max(TILE_RATIO_BAND.min, value));
  return clamped.toFixed(3);
}

/**
 * One shared tile shape per screenshot group. Printing every picture at its own
 * proportion left each row ragged — tiles of different heights, captions on
 * different lines and gaps under the shorter one — so a group averages its
 * pictures into a single shape and every row lines up.
 */
export function groupTileRatio(aspects: readonly (number | undefined)[]): string {
  const values = aspects.map((aspect) => Number(tileRatio(aspect)));
  if (values.length === 0) return tileRatio(undefined);
  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return tileRatio(average);
}

const image = (src: string, alt: string, className: string, eager = false): string => (
  `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}" class="${className}" decoding="async" loading="${eager ? 'eager' : 'lazy'}" fetchpriority="${eager ? 'high' : 'low'}">`
);

function panelMarkup(panel: SkillPanel, index: number): string {
  const bodyId = `skills-body-${panel.id}`;

  const sections = panel.sections.map((section) => `
          <section class="skills-section">
            <h4 class="skills-section__label">
              <span class="skills-section__zh">${escapeHtml(section.label.zh)}</span>
              <span class="skills-section__en">${escapeHtml(section.label.en)}</span>
            </h4>
            <p class="skills-section__text">${escapeHtml(section.text.zh)}</p>
          </section>`).join('');

  const bullets = panel.bullets ? `
          <section class="skills-section skills-section--bullets">
            <h4 class="skills-section__label">
              <span class="skills-section__zh">${escapeHtml(panel.bullets.label.zh)}</span>
              <span class="skills-section__en">${escapeHtml(panel.bullets.label.en)}</span>
            </h4>
            <ul class="skills-bullets">
              ${panel.bullets.items.map((item) => `<li class="skills-bullets__item"><span class="skills-bullets__zh">${escapeHtml(item.zh)}</span></li>`).join('\n              ')}
            </ul>
          </section>` : '';

  const galleries = panel.imageGroups.map((group) => `
          <section class="skills-gallery">
            <h4 class="skills-section__label">
              <span class="skills-section__zh">${escapeHtml(group.label.zh)}</span>
              <span class="skills-section__en">${escapeHtml(group.label.en)}</span>
            </h4>
            <div
              class="skills-gallery__grid"
              data-count="${Math.min(group.images.length, 6)}"
              style="--tile-ratio: ${groupTileRatio(group.images.map((entry) => entry.aspect))}"
            >
              ${group.images.map((entry) => `
                <figure class="skills-gallery__item">
                  <button
                    class="skills-gallery__zoom"
                    type="button"
                    data-skills-zoom
                    data-zoom-src="${escapeHtml(entry.src)}"
                    data-zoom-full="${escapeHtml(entry.full ?? '')}"
                    data-zoom-caption="${escapeHtml(entry.caption?.zh ?? group.label.zh)}"
                    aria-label="放大查看：${escapeHtml(entry.caption?.zh ?? group.label.zh)}"
                  >${image(entry.src, entry.caption?.zh ?? group.label.zh, 'skills-gallery__image')}<span class="skills-gallery__badge" aria-hidden="true">放大</span></button>
                  ${entry.caption ? `<figcaption class="skills-gallery__caption">${escapeHtml(entry.caption.zh)}</figcaption>` : ''}
                </figure>`).join('')}
            </div>
          </section>`).join('');

  return `
      <article class="skills-panel" data-skills-panel data-panel-id="${escapeHtml(panel.id)}" style="--panel-accent: ${escapeHtml(panel.accent)}">
        <div class="skills-panel__strip-layer">
          <div class="skills-panel__art" aria-hidden="true">
            ${image(panel.cover, '', 'skills-panel__art-image', index < 2)}
            <span class="skills-panel__art-wash"></span>
            <span class="skills-panel__art-shade"></span>
          </div>
          <span class="skills-panel__code" aria-hidden="true">${escapeHtml(panel.code)}</span>
          <span class="skills-panel__strip" aria-hidden="true">
            <span class="skills-panel__strip-en">${escapeHtml(panel.shortTitle)}</span>
            <span class="skills-panel__strip-zh">${escapeHtml(panel.title.zh)}</span>
          </span>
          <button
            class="skills-panel__toggle"
            type="button"
            data-skills-toggle
            aria-expanded="false"
            aria-controls="${bodyId}"
          ><span class="skills-panel__toggle-label">${escapeHtml(panel.title.zh)} / ${escapeHtml(panel.title.en)}</span></button>
        </div>
        <div class="skills-panel__content" id="${bodyId}" data-skills-body>
          <div class="skills-panel__content-inner">
            <header class="skills-panel__head">
              ${image(panel.cover, '', 'skills-panel__thumb', index < 2)}
              <div class="skills-panel__head-text">
                <p class="skills-panel__kicker">
                  <span class="skills-panel__kicker-code">${escapeHtml(panel.code)}</span>
                  <span class="skills-panel__kicker-label">${escapeHtml(panel.shortTitle)}</span>
                </p>
                <h3 class="skills-panel__title">
                  <span class="skills-panel__title-zh">${escapeHtml(panel.title.zh)}</span>
                  <span class="skills-panel__title-en">${escapeHtml(panel.title.en)}</span>
                </h3>
              </div>
            </header>
            <p class="skills-panel__tagline">${escapeHtml(panel.tagline.zh)}</p>
            <div class="skills-panel__body">
              ${sections}${bullets}${galleries}
            </div>
          </div>
        </div>
      </article>`;
}

export function buildSkillsWorkbenchMarkup(): string {
  return `
    <div class="skills-page" data-skills-page data-motion-ready="false" role="dialog" aria-modal="true" aria-labelledby="skills-page-heading">
      <h2 class="skills-page__sr-title" id="skills-page-heading">${escapeHtml(SKILLS_PAGE_TITLE)} · ${escapeHtml(SKILLS_PAGE_HEADING)}</h2>
      <button class="skills-page__close" type="button" data-skills-close aria-label="关闭 AI技能 并返回作品目录">
        <span aria-hidden="true">←</span><span>返回作品目录</span>
      </button>
      <div class="skills-page__viewport">
        <header class="skills-page__header">
          <p class="skills-page__kicker">04 / ${escapeHtml(SKILLS_PAGE_TITLE)}</p>
          <h3 class="skills-page__title">${escapeHtml(SKILLS_PAGE_HEADING)}</h3>
          <p class="skills-page__hint">
            <span class="skills-page__hint-wide">${escapeHtml(SKILLS_PAGE_HINT)}</span>
            <span class="skills-page__hint-narrow">${escapeHtml(SKILLS_PAGE_HINT_TOUCH)}</span>
          </p>
        </header>
        <div class="skills-accordion" data-skills-accordion>
          ${skillPanels.map(panelMarkup).join('\n')}
        </div>
        <p class="skills-page__footnote">点击面板可固定在展开状态 · Tap a panel to pin it open · 共 ${skillPanels.length} 个项目</p>
      </div>
      <div class="skills-lightbox" data-skills-lightbox data-visible="false" role="dialog" aria-modal="true" aria-label="图片放大查看">
        <p class="skills-lightbox__counter" data-skills-lightbox-counter></p>
        <button class="skills-lightbox__close" type="button" data-skills-lightbox-close aria-label="关闭图片">×</button>
        <button class="skills-lightbox__nav skills-lightbox__nav--prev" type="button" data-skills-lightbox-prev aria-label="上一张图片" hidden>‹</button>
        <figure class="skills-lightbox__figure">
          <img class="skills-lightbox__image" data-skills-lightbox-image alt="" decoding="async">
        </figure>
        <button class="skills-lightbox__nav skills-lightbox__nav--next" type="button" data-skills-lightbox-next aria-label="下一张图片" hidden>›</button>
        <p class="skills-lightbox__caption" data-skills-lightbox-caption></p>
        <p class="skills-lightbox__hint">点击空白处或按 Esc 关闭 · Click outside or press Esc to close</p>
      </div>
    </div>`;
}

export type SkillsWorkbenchOptions = {
  reducedMotion: boolean;
  onClose: () => void;
};

export type SkillsWorkbenchHandle = {
  dispose: () => void;
};

export function mountSkillsWorkbenchPage(
  container: HTMLElement,
  options: SkillsWorkbenchOptions,
): SkillsWorkbenchHandle {
  const template = document.createElement('div');
  template.innerHTML = buildSkillsWorkbenchMarkup();
  const page = template.firstElementChild as HTMLDivElement;
  container.append(page);

  const accordion = page.querySelector<HTMLDivElement>('[data-skills-accordion]')!;
  const panels = Array.from(page.querySelectorAll<HTMLElement>('[data-skills-panel]'));
  const toggles = Array.from(page.querySelectorAll<HTMLButtonElement>('[data-skills-toggle]'));
  const closeButton = page.querySelector<HTMLButtonElement>('[data-skills-close]')!;
  const lightbox = page.querySelector<HTMLDivElement>('[data-skills-lightbox]')!;
  const lightboxImage = page.querySelector<HTMLImageElement>('[data-skills-lightbox-image]')!;
  const lightboxCaption = page.querySelector<HTMLElement>('[data-skills-lightbox-caption]')!;
  const lightboxCounter = page.querySelector<HTMLElement>('[data-skills-lightbox-counter]')!;
  const lightboxClose = page.querySelector<HTMLButtonElement>('[data-skills-lightbox-close]')!;
  const lightboxPrev = page.querySelector<HTMLButtonElement>('[data-skills-lightbox-prev]')!;
  const lightboxNext = page.querySelector<HTMLButtonElement>('[data-skills-lightbox-next]')!;
  const cleanups: Array<() => void> = [];
  let disposed = false;
  let closing = false;
  let zoomItems: HTMLButtonElement[] = [];
  let zoomIndex = -1;
  let zoomTrigger: HTMLElement | null = null;
  /** Sharper source the preview is waiting on, so a late load is not applied twice. */
  let zoomFullSource = '';
  // A phone has room for the five rows only when none of them is open, so the
  // accordion starts folded there and opens on tap instead of on hover.
  const startsFolded = typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(max-width: 900px)').matches;

  const setActive = (index: number, options2: { focus?: boolean } = {}): void => {
    panels.forEach((panel, panelIndex) => {
      const active = panelIndex === index;
      panel.dataset.active = String(active);
      const toggle = panel.querySelector<HTMLButtonElement>('[data-skills-toggle]')!;
      const body = panel.querySelector<HTMLElement>('[data-skills-body]')!;
      toggle.setAttribute('aria-expanded', String(active));
      if (active) {
        body.removeAttribute('aria-hidden');
        body.removeAttribute('inert');
      } else {
        body.setAttribute('aria-hidden', 'true');
        body.setAttribute('inert', '');
        body.scrollTop = 0;
      }
    });
    if (options2.focus) toggles[index]?.focus({ preventScroll: true });
  };

  setActive(startsFolded ? -1 : 0);

  panels.forEach((panel, index) => {
    const toggle = toggles[index]!;

    const onFocusIn = (): void => setActive(index);
    const onClick = (): void => {
      const alreadyOpen = panel.dataset.active === 'true';
      setActive(startsFolded && alreadyOpen ? -1 : index);
    };
    const onKeyDown = (event: KeyboardEvent): void => {
      const forwardKeys = ['ArrowRight', 'ArrowDown'];
      const backwardKeys = ['ArrowLeft', 'ArrowUp'];
      const step = forwardKeys.includes(event.key) ? 1 : backwardKeys.includes(event.key) ? -1 : 0;
      if (step === 0) return;
      event.preventDefault();
      setActive((index + step + panels.length) % panels.length, { focus: true });
    };

    panel.addEventListener('focusin', onFocusIn);
    toggle.addEventListener('click', onClick);
    panel.addEventListener('keydown', onKeyDown);
    cleanups.push(() => {
      panel.removeEventListener('focusin', onFocusIn);
      toggle.removeEventListener('click', onClick);
      panel.removeEventListener('keydown', onKeyDown);
    });
  });

  /**
   * Hover is resolved from the pointer's own events instead of `pointerenter`.
   * Widening a panel slides its neighbours, and the browser reports enter/leave
   * for whatever ends up under a stationary cursor — which made the accordion
   * jump to a neighbour the user never pointed at. Sampling the element under
   * an actual pointer move keeps the open panel the one being pointed at.
   */
  const onAccordionPointerMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    const element = document.elementFromPoint(event.clientX, event.clientY);
    const panel = element?.closest<HTMLElement>('[data-skills-panel]');
    if (!panel) return;
    const index = panels.indexOf(panel);
    if (index >= 0) setActive(index);
  };
  accordion.addEventListener('pointermove', onAccordionPointerMove);
  cleanups.push(() => accordion.removeEventListener('pointermove', onAccordionPointerMove));

  const lightboxOpen = (): boolean => lightbox.dataset.visible === 'true';
  /**
   * The tile opens instantly (it is already cached) and the sharper copy is
   * swapped in once it has decoded. Both have the same proportions and the
   * preview sizes by width, so the swap only adds detail — nothing moves.
   */
  const preloadFullZoomSource = (fullSource: string, fallback: string): void => {
    if (!fullSource || fullSource === fallback || typeof Image === 'undefined') return;
    const loader = new Image();
    loader.decoding = 'async';
    loader.onload = () => {
      if (zoomFullSource !== fullSource) return;
      lightboxImage.src = fullSource;
      sizeLightboxImage();
    };
    loader.src = fullSource;
  };

  /**
   * Sizes the preview so the picture spans the window. A tall screenshot would
   * otherwise be fitted into a narrow strip, so it is printed full width and
   * the preview scrolls down it instead.
   */
  const sizeLightboxImage = (): void => {
    const naturalWidth = lightboxImage.naturalWidth;
    const naturalHeight = lightboxImage.naturalHeight;
    if (naturalWidth === 0 || naturalHeight === 0) return;
    const scale = lightboxImageScale(naturalWidth, naturalHeight, window.innerWidth, window.innerHeight);
    lightboxImage.style.width = `${Math.round(naturalWidth * scale)}px`;
    lightboxImage.style.height = 'auto';
  };

  const renderZoom = (index: number): void => {
    const item = zoomItems[index];
    if (!item) return;
    zoomIndex = index;
    const source = item.dataset.zoomSrc ?? '';
    const fullSource = item.dataset.zoomFull ?? '';
    const caption = item.dataset.zoomCaption ?? '';
    zoomFullSource = fullSource;
    lightboxImage.src = source;
    lightboxImage.alt = caption;
    lightboxCaption.textContent = caption;
    lightboxCounter.textContent = `${index + 1} / ${zoomItems.length}`;
    sizeLightboxImage();
    preloadFullZoomSource(fullSource, source);
    const multiple = zoomItems.length > 1;
    lightboxPrev.hidden = !multiple;
    lightboxNext.hidden = !multiple;
  };

  const stepZoom = (step: number): void => {
    if (zoomItems.length === 0) return;
    renderZoom((zoomIndex + step + zoomItems.length) % zoomItems.length);
  };

  const openLightbox = (trigger: HTMLButtonElement, group: HTMLElement): void => {
    zoomItems = Array.from(group.querySelectorAll<HTMLButtonElement>('[data-skills-zoom]'));
    zoomTrigger = trigger;
    renderZoom(Math.max(0, zoomItems.indexOf(trigger)));
    page.dataset.lightbox = 'true';
    lightbox.dataset.visible = 'true';
    lightboxClose.focus({ preventScroll: true });
  };

  const closeLightbox = (): void => {
    if (!lightboxOpen()) return;
    page.dataset.lightbox = 'false';
    lightbox.dataset.visible = 'false';
    zoomItems = [];
    zoomIndex = -1;
    const trigger = zoomTrigger;
    zoomTrigger = null;
    trigger?.focus({ preventScroll: true });
  };

  const onPageClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target : null;
    if (!target) return;
    const zoom = target.closest<HTMLButtonElement>('[data-skills-zoom]');
    if (zoom) {
      const group = zoom.closest<HTMLElement>('.skills-gallery');
      if (group) {
        openLightbox(zoom, group);
        return;
      }
    }
    // Only the empty backdrop closes; the frame itself stays put.
    if (target === lightbox) closeLightbox();
  };
  page.addEventListener('click', onPageClick);
  cleanups.push(() => page.removeEventListener('click', onPageClick));

  const onLightboxCloseClick = (): void => closeLightbox();
  const onLightboxPrevClick = (): void => stepZoom(-1);
  const onLightboxNextClick = (): void => stepZoom(1);
  lightboxClose.addEventListener('click', onLightboxCloseClick);
  lightboxPrev.addEventListener('click', onLightboxPrevClick);
  lightboxNext.addEventListener('click', onLightboxNextClick);
  cleanups.push(() => {
    lightboxClose.removeEventListener('click', onLightboxCloseClick);
    lightboxPrev.removeEventListener('click', onLightboxPrevClick);
    lightboxNext.removeEventListener('click', onLightboxNextClick);
  });

  /**
   * The preview owns Escape and the arrow keys while it is open, and it answers
   * on `document` so the workspace's own Escape-to-directory shortcut never
   * fires underneath it.
   */
  const onLightboxKeyDown = (event: KeyboardEvent): void => {
    if (!lightboxOpen()) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeLightbox();
      return;
    }
    if (event.key !== 'ArrowRight' && event.key !== 'ArrowLeft') return;
    event.preventDefault();
    event.stopPropagation();
    stepZoom(event.key === 'ArrowRight' ? 1 : -1);
  };
  document.addEventListener('keydown', onLightboxKeyDown);
  cleanups.push(() => document.removeEventListener('keydown', onLightboxKeyDown));

  // Keep the accordion's own wheel/touch scrolling away from the page behind it.
  const stopPropagation = (event: Event): void => event.stopPropagation();
  accordion.addEventListener('wheel', stopPropagation, { passive: true });
  cleanups.push(() => accordion.removeEventListener('wheel', stopPropagation));

  // The preview scrolls on its own when the picture is taller than the window;
  // `overscroll-behavior: contain` stops that scroll from chaining into the
  // page behind it, so no wheel blocking is needed here.
  const onLightboxImageLoad = (): void => sizeLightboxImage();
  const onWindowResize = (): void => {
    if (lightboxOpen()) sizeLightboxImage();
  };
  lightboxImage.addEventListener('load', onLightboxImageLoad);
  window.addEventListener('resize', onWindowResize);
  cleanups.push(() => {
    lightboxImage.removeEventListener('load', onLightboxImageLoad);
    window.removeEventListener('resize', onWindowResize);
  });

  const finishClose = (): void => {
    if (disposed) return;
    options.onClose();
  };
  const requestClose = (): void => {
    if (closing || disposed) return;
    closing = true;
    if (options.reducedMotion) {
      finishClose();
      return;
    }
    gsap.to(page, {
      autoAlpha: 0,
      duration: 0.32,
      ease: 'power2.in',
      onComplete: finishClose,
    });
  };
  closeButton.addEventListener('click', requestClose);
  cleanups.push(() => closeButton.removeEventListener('click', requestClose));

  if (options.reducedMotion) {
    page.dataset.motionReady = 'true';
  } else {
    const header = page.querySelector<HTMLElement>('.skills-page__header');
    gsap.fromTo(panels, {
      autoAlpha: 0,
      y: 34,
      scale: 0.985,
    }, {
      autoAlpha: 1,
      y: 0,
      scale: 1,
      duration: 0.6,
      stagger: 0.07,
      ease: 'power3.out',
    });
    if (header) {
      gsap.fromTo(header, { autoAlpha: 0, y: -16 }, { autoAlpha: 1, y: 0, duration: 0.45, ease: 'power2.out' });
    }
    gsap.fromTo(closeButton, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: 'power2.out' });
    page.dataset.motionReady = 'true';
  }

  // The panels are preloaded by the experience; requesting them again here is
  // free and covers the case where this page is mounted on its own.
  void preloadSkillsWorkbenchAssets();

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      for (const cleanup of cleanups) cleanup();
      gsap.killTweensOf(page);
      page.remove();
    },
  };
}
