import { gsap } from 'gsap';
import type { Category, ProjectShowcase } from '../content/types';
import { projectShowcases as defaultShowcases } from '../content/projectExperience';

type ProjectsPageOptions = {
  reducedMotion: boolean;
  onClose: () => void;
};

export type ProjectCardMotion = {
  /** Vertical lift in px; negative moves the card up. */
  y: number;
  scale: number;
  opacity: number;
  /** 0 while the card fills the screen, 1 once it has handed over to the next one. */
  retreat: number;
  /** 0 while the card is still rising into place, 1 once it rests at the top. */
  rise: number;
};

export type ProjectCardMotionInput = {
  /** Scroll distance since the card reached its resting spot; negative while it rises. */
  offset: number;
  /** Height of the card itself, in px. */
  cardHeight: number;
  /** Scroll distance the card stays pinned before the next one takes over. */
  dwell: number;
};

/**
 * The card stays fully present through the first half of its dwell, then uses
 * the remaining scroll distance for a longer hand-over. The dwell itself is
 * intentionally generous so this movement reads as a glide rather than a snap.
 */
export const PROJECT_RETREAT_START = 0.56;

/**
 * How far the picture viewer may stretch a still past its own pixels. The
 * supplied competition clips are only 240×135, and printed at their natural
 * size they are unreadable, so the viewer fills the window up to this factor.
 */
export const PROJECT_STILL_MAX_UPSCALE = 5;

/** The share of the window the enlarged still may fill. */
const STILL_VIEWPORT_WIDTH = 0.92;
const STILL_VIEWPORT_HEIGHT = 0.76;

/**
 * Scale factor for the picture viewer: fill the window, never stretch past
 * `PROJECT_STILL_MAX_UPSCALE` times the picture's own pixels, and never blow a
 * picture that is already large up beyond the window.
 */
export function projectStillScale(
  naturalWidth: number,
  naturalHeight: number,
  viewportWidth: number,
  viewportHeight: number,
): number {
  if (naturalWidth <= 0 || naturalHeight <= 0) return 1;
  return Math.min(
    (viewportWidth * STILL_VIEWPORT_WIDTH) / naturalWidth,
    (viewportHeight * STILL_VIEWPORT_HEIGHT) / naturalHeight,
    PROJECT_STILL_MAX_UPSCALE,
  );
}

const clamp01 = (value: number): number => Math.min(1, Math.max(0, value));
const round = (value: number, digits = 3): number => {
  const rounded = Number(value.toFixed(digits));
  // Collapse -0 into 0 so the resting state is a clean identity.
  return rounded === 0 ? 0 : rounded;
};
/** Smoothstep, so the deck settles instead of stopping dead. */
const smoothstep = (t: number): number => t * t * (3 - 2 * t);

/**
 * How much bigger than its resting size an incoming card is when it first
 * appears. It arrives from the front of the deck and settles back as it takes
 * its place.
 */
export const PROJECT_ENTRY_GROWTH = 0.12;

/** How much an outgoing card shrinks as it recedes behind the next one. */
export const PROJECT_RETREAT_SHRINK = 0.16;

/**
 * Each card stays full size for most of its screen and only steps aside once
 * the next one is close enough to take over: it recedes, shrinking and fading
 * while the card below arrives large and eases back to its resting size.
 */
export function projectCardMotion({ offset, cardHeight, dwell }: ProjectCardMotionInput): ProjectCardMotion {
  const height = Math.max(1, cardHeight);
  // 0 while the card is still a full card away, 1 once it rests in place. The
  // size follows this linearly so the card keeps shrinking the whole way in,
  // while the fade and lift keep their softer easing.
  const approach = clamp01((offset + height) / height);
  const rise = smoothstep(approach);
  const retreatStart = PROJECT_RETREAT_START;
  const retreat = dwell > 1
    ? smoothstep(clamp01((offset - dwell * retreatStart) / (dwell * (1 - retreatStart))))
    : 0;
  const arrival = 1 + PROJECT_ENTRY_GROWTH * (1 - approach);

  return {
    y: round(-0.12 * height * retreat),
    scale: round(arrival * (1 - PROJECT_RETREAT_SHRINK * retreat), 4),
    opacity: round((0.62 + 0.38 * rise) * (1 - 0.7 * retreat)),
    retreat,
    rise,
  };
}

const escapeHtml = (value: string): string => value
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

type ShowcaseMedia = NonNullable<ProjectShowcase['mediaItems']>[number];

const showcaseImage = (
  src: string,
  alt: string,
  position: string,
  fit: string,
  index: number,
  eager: boolean,
  zoomable = false,
): string => {
  const image = `
                <img
                  class="project-card__image"
                  src="${escapeHtml(src)}"
                  alt="${escapeHtml(alt)}"
                  loading="${eager ? 'eager' : 'lazy'}"
                  decoding="async"
                  fetchpriority="${eager ? 'high' : 'low'}"
                  data-media-scan="${fit === 'scan' ? 'true' : 'false'}"
                  style="object-fit: ${fit === 'contain' ? 'contain' : 'cover'}; object-position: ${escapeHtml(position)}"
                >`;
  // A still the reader can look at closely becomes a button of its own, so the
  // picture answers to both a click and the keyboard.
  return zoomable
    ? `
                <button class="project-card__zoom" type="button" data-project-still="${index}" aria-haspopup="dialog" aria-label="放大查看：${escapeHtml(alt)}">${image}
                </button>`
    : image;
};

const showcaseVideo = (
  src: string,
  poster: string,
  alt: string,
): string => `
                <video
                  class="project-card__video"
                  data-project-video
                  poster="${escapeHtml(poster)}"
                  preload="metadata"
                  muted
                  loop
                  playsinline
                  aria-label="${escapeHtml(alt)}"
                >
                  <source src="${escapeHtml(src)}" type="video/mp4">
                </video>
                <span class="project-card__play-cue" aria-hidden="true">
                  <span class="project-card__play-mark">▶</span>
                  <span>静音预览</span>
                </span>`;

const showcaseMediaItem = (
  media: ShowcaseMedia,
  slideIndex: number,
  eager: boolean,
): string => {
  const fit = media.fit ?? 'cover';
  const body = media.kind === 'video'
    ? showcaseVideo(media.src, media.poster ?? media.src, media.alt)
    : showcaseImage(
      media.src,
      media.alt,
      media.position ?? '50% 50%',
      fit,
      slideIndex,
      eager,
      !media.href,
    );
  // An article slide reprints the headline, the account line and the opening
  // of the piece on top of its cover so the card carries the written part too.
  const note = media.caption
    ? `
                  <div class="project-card__slide-note">
                    ${media.meta ? `<span class="project-card__slide-meta">${escapeHtml(media.meta)}</span>` : ''}
                    <h3 class="project-card__slide-title">${escapeHtml(media.caption)}</h3>
                    ${media.excerpt ? `<p class="project-card__slide-excerpt">${escapeHtml(media.excerpt)}</p>` : ''}
                  </div>`
    : '';
  // The note already prints the account and the date, so an article slide
  // drops the corner badge instead of letting the tab pill collide with it. A
  // still that carries no caption of its own prints no badge either.
  const badgeText = media.badge ?? media.label;
  const badge = media.caption || !badgeText
    ? ''
    : `
                  <span class="project-card__media-badge">${escapeHtml(badgeText)}</span>`;
  return `
                <div class="project-card__slide" data-project-media-slide="${slideIndex}"${slideIndex === 0 ? ' data-active="true"' : ''}>
                  ${body}
                  ${badge}
                  ${note}
                </div>`;
};

/**
 * A gallery whose slides carry an `href` is an article index rather than a
 * media playlist: the aside button opens the active slide's source article
 * instead of the shared video player.
 */
const isArticleGallery = (item: ProjectShowcase): boolean => Boolean(
  item.mediaKind === 'gallery' && item.mediaItems?.some((entry) => Boolean(entry.href)),
);

/**
 * Galleries hold either a film or a set of stills. A still gallery has no
 * player to share, so its detail button opens the still that is on screen.
 */
const isVideoGallery = (item: ProjectShowcase): boolean => Boolean(
  item.mediaKind === 'gallery' && item.mediaItems?.some((entry) => entry.kind === 'video'),
);

/**
 * Numbered tabs keep the strip compact, so the accessible name comes from the
 * badge, the label or the picture's own description instead of "07".
 */
const slideTabLabel = (media: ShowcaseMedia, item: ProjectShowcase, index: number): string => (
  [media.badge, media.label, media.alt].find((text) => Boolean(text?.trim()))
  ?? `${item.title.zh}第 ${index + 1} 张`
);

/** Slides a card can print as a still, in the order the reader sees them. */
const showcaseStillIndexes = (item: ProjectShowcase): number[] => {
  if (item.mediaKind === 'gallery') {
    return (item.mediaItems ?? [])
      .map((entry, index) => (entry.kind === 'image' && !entry.href ? index : -1))
      .filter((index) => index >= 0);
  }
  if (item.mediaKind === 'video' && item.video) return [];
  return [0];
};

/**
 * What the aside button does for a card: open a PDF, open the active article,
 * control the card's own film, or open the still that is on screen.
 */
const showcaseActionKind = (item: ProjectShowcase): 'pdf' | 'article' | 'film' | 'still' => {
  if (item.detailPdf) return 'pdf';
  if (isArticleGallery(item)) return 'article';
  if (item.mediaKind === 'video' && item.video) return 'film';
  if (item.mediaKind === 'gallery') return isVideoGallery(item) ? 'film' : 'still';
  return 'still';
};

const showcaseCard = (item: ProjectShowcase, index: number): string => {
  const isVideo = item.mediaKind === 'video' && Boolean(item.video);
  const isGallery = item.mediaKind === 'gallery' && Boolean(item.mediaItems?.length);
  const mediaFit = item.mediaFit ?? 'cover';
  const actionKind = showcaseActionKind(item);
  const actionAttributes = actionKind === 'pdf'
    ? ` data-project-pdf="${index}"`
    : actionKind === 'article'
      ? ` data-project-article="${index}"`
      : actionKind === 'film'
        ? ` data-project-video-toggle="${index}" aria-pressed="false"`
        : ` data-project-preview="${index}"`;
  const media = isGallery
    ? `
                <div class="project-card__gallery" data-project-gallery data-tabs-position="${item.mediaTabsPosition ?? 'bottom'}">
                  ${item.mediaItems!.map((entry, slideIndex) => showcaseMediaItem(entry, slideIndex, index === 0 && slideIndex === 0)).join('')}
                  <div class="project-card__gallery-tabs" role="group" aria-label="${escapeHtml(item.title.zh)}媒体切换">
                    ${item.mediaItems!.map((entry, slideIndex) => `
                    <button type="button" data-project-slide="${slideIndex}" aria-pressed="${slideIndex === 0 ? 'true' : 'false'}" aria-label="${escapeHtml(slideTabLabel(entry, item, slideIndex))}">
                      <span class="project-card__gallery-tab-index">${String(slideIndex + 1).padStart(2, '0')}</span>${entry.label ? `<span class="project-card__gallery-tab-label">${escapeHtml(entry.label)}</span>` : ''}
                    </button>`).join('')}
                  </div>
                </div>`
    : isVideo
      ? showcaseVideo(item.video ?? '', item.media, item.mediaAlt)
      : showcaseImage(item.media, item.mediaAlt, item.mediaPosition, mediaFit, 0, index === 0, true);
  const showStandaloneBadge = !isGallery && Boolean(item.mediaBadge);
  // A gallery of labelled stills also prints one button per picture, so any of
  // them can be opened without stepping through the tabs first.
  const stills = showcaseStillIndexes(item);
  const stillButtons = stills.length > 1 && stills.every((slide) => (
    Boolean(item.mediaItems?.[slide]?.label?.trim())
  ))
    ? `
              <div class="project-aside__stills" role="group" aria-label="放大查看${escapeHtml(item.title.zh)}的图片">
                ${stills.map((slide) => `
                <button type="button" data-project-zoom="${index}" data-project-zoom-slide="${slide}" aria-haspopup="dialog" aria-label="放大查看：${escapeHtml(item.mediaItems?.[slide]?.alt ?? item.title.zh)}">
                  ${escapeHtml(item.mediaItems?.[slide]?.label ?? '')}
                </button>`).join('')}
              </div>`
    : '';
  // A card that gathers several sources prints one button per link instead of a
  // single button, so every source can be opened without stepping through the
  // slides first.
  const sourceSlides = (item.sourceList ? item.mediaItems ?? [] : [])
    .map((entry, slide) => ({ slide, href: entry.href ?? '' }))
    .filter(({ href }) => Boolean(href));
  const sourceButtons = sourceSlides.length > 1
    ? `
              <div class="project-aside__links" role="group" aria-label="打开${escapeHtml(item.title.zh)}的链接">
                ${sourceSlides.map(({ slide }) => `
                <button type="button" class="project-aside__link" data-project-source="${index}" data-project-source-slide="${slide}" aria-label="查看详情：${escapeHtml(item.mediaItems?.[slide]?.alt ?? item.title.zh)}">
                  <span class="project-aside__link-label">${escapeHtml(item.mediaItems?.[slide]?.label ?? item.title.zh)}</span>
                  <span class="project-aside__link-cta">${escapeHtml(item.mediaItems?.[slide]?.action ?? '查看详情')}</span>
                  <span class="project-aside__arrow" aria-hidden="true">↗</span>
                </button>`).join('')}
              </div>`
    : '';
  // Extra reading that belongs to the card: one button per link, printed
  // beside the stills so any piece opens straight from the deck.
  const externalLinks = item.links ?? [];
  const linkButtons = externalLinks.length > 0
    ? `
              <div class="project-aside__links" role="group" aria-label="打开${escapeHtml(item.title.zh)}的相关文章">
                ${externalLinks.map((link, linkIndex) => `
                <button type="button" class="project-aside__link" data-project-link="${index}" data-project-link-index="${linkIndex}" aria-label="打开文章：${escapeHtml(link.headline ?? link.label)}" title="${escapeHtml(link.headline ?? link.label)}">
                  <span class="project-aside__link-label">${escapeHtml(link.label)}</span>
                  <span class="project-aside__link-cta">${escapeHtml(link.action ?? '阅读原文')}</span>
                  <span class="project-aside__arrow" aria-hidden="true">↗</span>
                </button>`).join('')}
              </div>`
    : '';

  return `
        <article class="project-scene" data-project-scene data-project-index="${index}"${index % 2 === 1 ? ' data-flip="true"' : ''} style="--accent:${escapeHtml(item.accent)};--accent-to:${escapeHtml(item.accentTo)}">
          <div class="project-scene__sticky">
            <div class="project-card" data-project-card data-media-kind="${isGallery ? 'gallery' : isVideo ? 'video' : 'image'}" data-media-fit="${escapeHtml(mediaFit)}">
              <figure class="project-card__media">
                ${media}
                ${showStandaloneBadge ? `<figcaption class="project-card__media-badge">${escapeHtml(item.mediaBadge ?? '')}</figcaption>` : ''}
              </figure>
              <div class="project-card__copy">
                <p class="project-card__eyebrow">
                  <span class="project-card__code">${escapeHtml(item.code)}</span>
                  <span>${escapeHtml(item.kicker.zh)}</span>
                </p>
                <h2 class="project-card__title">${escapeHtml(item.title.zh)}</h2>
                <p class="project-card__en">${escapeHtml(item.title.en)}</p>
                <p class="project-card__summary">${escapeHtml(item.summary.zh)}</p>
                <ul class="project-card__tags">${item.tags.map((tag) => `<li>${escapeHtml(tag)}</li>`).join('')}</ul>
                <p class="project-card__note">${escapeHtml(item.note.zh)}</p>
              </div>
              <span class="project-card__number" aria-hidden="true">${escapeHtml(item.code)}</span>
            </div>
            <aside class="project-aside">
              <p class="project-aside__text">${escapeHtml(item.aside.zh)}</p>
              ${sourceButtons || `
              <button class="project-aside__button" type="button" data-project-action="${index}"${actionAttributes}>
                <span data-project-action-label>${escapeHtml(item.action)}</span>
                <span class="project-aside__arrow" aria-hidden="true">↗</span>
              </button>`}
              ${stillButtons}
              ${linkButtons}
            </aside>
          </div>
        </article>`;
};

export function buildProjectsPageMarkup(showcases: readonly ProjectShowcase[] = defaultShowcases): string {
  const total = showcases.length;
  const track = showcases.map((item, index) => `
          <button type="button" data-project-jump="${index}" aria-label="跳到第 ${index + 1} 个项目：${escapeHtml(item.title.zh)}"><i></i></button>`).join('');

  return `
    <h2 class="projects-page__sr-title" id="projects-page-heading">项目经历 · 精选项目</h2>
    <button class="projects-page__close" type="button" data-projects-close aria-label="关闭项目经历并返回作品目录">
      <span aria-hidden="true">←</span><span class="projects-page__close-label">返回作品目录</span>
    </button>
    <header class="projects-page__masthead">
      <p class="projects-page__eyebrow">05 / SELECTED WORK</p>
      <h1 id="projects-page-title">项目经历</h1>
      <span class="projects-page__rule" aria-hidden="true"></span>
    </header>
    <span class="projects-page__scrim" aria-hidden="true"></span>
    <div class="projects-page__scroll" data-projects-scroll tabindex="0" role="region" aria-labelledby="projects-page-title">
      <div class="project-deck" data-project-deck>
        ${showcases.map(showcaseCard).join('')}
      </div>
    </div>
    <div class="projects-page__footer">
      <span class="projects-page__counter" data-project-counter>01 / ${String(total).padStart(2, '0')}</span>
      <div class="projects-page__track" role="group" aria-label="项目快速导航">
        ${track}
      </div>
      <p class="projects-page__hint" data-project-hint>向下滚动，看下一个项目 <span aria-hidden="true">↓</span></p>
    </div>
    <p class="projects-page__toast" data-project-toast role="status" aria-live="polite"></p>
    <div class="project-video-modal" data-project-video-modal hidden>
      <button class="project-video-modal__close" type="button" data-project-video-close aria-label="关闭视频详情">×</button>
      <div class="project-video-modal__frame">
        <video class="project-video-modal__player" data-project-video-player controls playsinline preload="metadata"></video>
      </div>
      <p class="project-video-modal__caption" data-project-video-caption></p>
    </div>
    <div class="project-lightbox" data-project-lightbox data-visible="false" role="dialog" aria-modal="true" aria-label="图片放大查看">
      <p class="project-lightbox__counter" data-project-lightbox-counter></p>
      <button class="project-lightbox__close" type="button" data-project-lightbox-close aria-label="关闭图片">×</button>
      <button class="project-lightbox__nav project-lightbox__nav--prev" type="button" data-project-lightbox-prev aria-label="上一张图片" hidden>‹</button>
      <figure class="project-lightbox__figure">
        <img class="project-lightbox__image" data-project-lightbox-image alt="" decoding="async">
      </figure>
      <button class="project-lightbox__nav project-lightbox__nav--next" type="button" data-project-lightbox-next aria-label="下一张图片" hidden>›</button>
      <p class="project-lightbox__caption" data-project-lightbox-caption></p>
      <p class="project-lightbox__hint">点击空白处或按 Esc 关闭 · Click outside or press Esc to close</p>
    </div>`;
}

type SceneRef = {
  scene: HTMLElement;
  sticky: HTMLElement;
  card: HTMLElement;
  aside: HTMLElement;
  media: HTMLElement;
  copy: HTMLElement;
  number: HTMLElement;
  gallery: HTMLElement | null;
  slidePanels: HTMLElement[];
  slideButtons: HTMLButtonElement[];
  /** One per source link, when the card prints its own link buttons. */
  sourceButtons: HTMLButtonElement[];
  videos: HTMLVideoElement[];
  slideIndex: number;
  actionButton: HTMLButtonElement | null;
  /** Scroll offset at which the card rests at the top of the screen. */
  rest: number;
  cardHeight: number;
  dwell: number;
};

export function mountProjectsPage(
  container: HTMLElement,
  category: Category,
  options: ProjectsPageOptions,
): { dispose: () => void } {
  const showcases = category.projectShowcases?.length ? category.projectShowcases : defaultShowcases;
  const page = document.createElement('section');
  page.className = 'projects-page';
  page.dataset.motionReady = 'false';
  page.setAttribute('role', 'dialog');
  page.setAttribute('aria-modal', 'true');
  page.setAttribute('aria-labelledby', 'projects-page-heading');
  page.innerHTML = buildProjectsPageMarkup(showcases);
  container.append(page);

  const scroll = page.querySelector<HTMLElement>('[data-projects-scroll]')!;
  const deck = page.querySelector<HTMLElement>('[data-project-deck]')!;
  const closeButton = page.querySelector<HTMLButtonElement>('[data-projects-close]')!;
  const toast = page.querySelector<HTMLElement>('[data-project-toast]')!;
  const videoModal = page.querySelector<HTMLElement>('[data-project-video-modal]')!;
  const videoPlayer = page.querySelector<HTMLVideoElement>('[data-project-video-player]')!;
  const videoCaption = page.querySelector<HTMLElement>('[data-project-video-caption]')!;
  const videoCloseButton = page.querySelector<HTMLButtonElement>('[data-project-video-close]')!;
  const lightbox = page.querySelector<HTMLElement>('[data-project-lightbox]')!;
  const lightboxImage = page.querySelector<HTMLImageElement>('[data-project-lightbox-image]')!;
  const lightboxCaption = page.querySelector<HTMLElement>('[data-project-lightbox-caption]')!;
  const lightboxCounter = page.querySelector<HTMLElement>('[data-project-lightbox-counter]')!;
  const lightboxClose = page.querySelector<HTMLButtonElement>('[data-project-lightbox-close]')!;
  const lightboxPrev = page.querySelector<HTMLButtonElement>('[data-project-lightbox-prev]')!;
  const lightboxNext = page.querySelector<HTMLButtonElement>('[data-project-lightbox-next]')!;
  const counter = page.querySelector<HTMLElement>('[data-project-counter]')!;
  const jumpButtons = [...page.querySelectorAll<HTMLButtonElement>('[data-project-jump]')];
  const scenes = [...page.querySelectorAll<HTMLElement>('[data-project-scene]')];

  let refs: SceneRef[] = [];
  let activeIndex = -1;
  let frame = 0;
  let toastTimer = 0;
  let measureFrame = 0;
  const pointer = { x: 0, y: 0 };
  let disposed = false;
  let closing = false;
  let lightboxCard = -1;
  let lightboxStill = -1;
  let lightboxTrigger: HTMLElement | null = null;
  const total = scenes.length;

  const measure = (): void => {
    refs = scenes.map((scene) => {
      const sticky = scene.querySelector<HTMLElement>('.project-scene__sticky')!;
      const card = scene.querySelector<HTMLElement>('[data-project-card]')!;
      const aside = scene.querySelector<HTMLElement>('.project-aside')!;
      const media = scene.querySelector<HTMLElement>('.project-card__media')!;
      const copy = scene.querySelector<HTMLElement>('.project-card__copy')!;
      const number = scene.querySelector<HTMLElement>('.project-card__number')!;
      const gallery = scene.querySelector<HTMLElement>('[data-project-gallery]');
      const slidePanels = [...scene.querySelectorAll<HTMLElement>('[data-project-media-slide]')];
      const slideButtons = [...scene.querySelectorAll<HTMLButtonElement>('[data-project-slide]')];
      const sourceButtons = [...scene.querySelectorAll<HTMLButtonElement>('[data-project-source]')];
      const videos = [...scene.querySelectorAll<HTMLVideoElement>('[data-project-video]')];
      const actionButton = scene.querySelector<HTMLButtonElement>('[data-project-action]');
      const parsedTop = Number.parseFloat(window.getComputedStyle(sticky).top);
      const stackTop = Number.isFinite(parsedTop) ? parsedTop : 0;

      return {
        scene,
        sticky,
        card,
        aside,
        media,
        copy,
        number,
        gallery,
        slidePanels,
        slideButtons,
        sourceButtons,
        videos,
        slideIndex: 0,
        actionButton,
        rest: scene.offsetTop - stackTop,
        cardHeight: card.offsetHeight,
        dwell: Math.max(0, scene.offsetHeight - sticky.offsetHeight),
      };
    });

    // The deck reserves exactly the room the last card needs, so the page ends
    // with that card at rest instead of drifting past it.
    const stackHeight = refs.at(-1)?.sticky.offsetHeight ?? 0;
    if (stackHeight > 0 && page.style.getPropertyValue('--stack-h') !== `${stackHeight}px`) {
      page.style.setProperty('--stack-h', `${stackHeight}px`);
    }
  };

  const setActionLabel = (button: HTMLButtonElement, label: string): void => {
    const target = button.querySelector<HTMLElement>('[data-project-action-label]');
    if (target) target.textContent = label;
    else button.textContent = label;
  };

  const activeGalleryMedia = (ref: SceneRef, refIndex: number): ShowcaseMedia | null => (
    showcases[refIndex]?.mediaItems?.[ref.slideIndex] ?? null
  );

  const syncSceneMedia = (index: number): void => {
    refs.forEach((ref, refIndex) => {
      const item = showcases[refIndex];
      if (!item) return;
      const isActiveScene = refIndex === index && !options.reducedMotion;
      const activeMedia = activeGalleryMedia(ref, refIndex);
      const activeVideo = ref.gallery
        ? ref.videos.find((video) => (
          video.closest<HTMLElement>('[data-project-media-slide]')?.dataset.projectMediaSlide === String(ref.slideIndex)
        )) ?? null
        : ref.videos[0] ?? null;

      ref.videos.forEach((video) => {
        const shouldPreview = isActiveScene && video === activeVideo;
        if (shouldPreview) {
          video.muted = true;
          delete video.dataset.userPaused;
          if (video.paused) {
            void video.play().catch(() => {
              // A browser can still decline muted autoplay; the card keeps its poster.
            });
          }
          return;
        }
        video.pause();
        video.muted = true;
        delete video.dataset.userPaused;
      });

      if (ref.actionButton) {
        setActionLabel(
          ref.actionButton,
          // A film gallery keeps its card-level invitation; every other card
          // prints the label of whichever slide is on screen.
          item.mediaKind === 'gallery' && isVideoGallery(item) && !isArticleGallery(item)
            ? item.action
            : activeMedia?.action ?? item.action,
        );
        // Only the video toggle is a pressed state; the pdf and article buttons
        // open a new tab and must not claim to be toggles.
        if (ref.actionButton.hasAttribute('data-project-video-toggle')) {
          ref.actionButton.setAttribute('aria-pressed', 'false');
        }
      }
      // A card that prints its own link buttons marks the slide it is showing.
      ref.sourceButtons.forEach((button, buttonIndex) => {
        const active = buttonIndex === ref.slideIndex;
        button.setAttribute('aria-current', active ? 'true' : 'false');
      });
    });
  };

  const setSceneSlide = (refIndex: number, slideIndex: number): void => {
    const ref = refs[refIndex];
    const item = showcases[refIndex];
    if (!ref?.gallery || !item?.mediaItems?.length) return;
    ref.slideIndex = Math.min(item.mediaItems.length - 1, Math.max(0, slideIndex));
    ref.slidePanels.forEach((panel, panelIndex) => {
      if (panelIndex === ref.slideIndex) panel.dataset.active = 'true';
      else delete panel.dataset.active;
    });
    ref.slideButtons.forEach((button, buttonIndex) => {
      button.setAttribute('aria-pressed', buttonIndex === ref.slideIndex ? 'true' : 'false');
    });
    syncSceneMedia(activeIndex);
  };

  /** Every still the card can print, in reading order. */
  const stillSlides = (cardIndex: number): number[] => {
    const item = showcases[cardIndex];
    return item ? showcaseStillIndexes(item) : [];
  };

  const stillCopy = (cardIndex: number, slide: number): { src: string; caption: string } | null => {
    const item = showcases[cardIndex];
    if (!item) return null;
    const media = item.mediaItems?.[slide];
    if (media) return { src: media.src, caption: media.badge ?? media.alt ?? media.label };
    if (showcaseStillIndexes(item).length === 0) return null;
    return { src: item.media, caption: item.mediaBadge ?? item.title.zh };
  };

  const lightboxOpen = (): boolean => lightbox.dataset.visible === 'true';

  /**
   * Sizes the enlarged still so it spans the window instead of sitting at its
   * own pixel size: a 240×135 clip would otherwise open at 240×135 inside a
   * 1440px window. Stills that are already large are only ever scaled down.
   */
  const fitLightboxImage = (): void => {
    const naturalWidth = lightboxImage.naturalWidth;
    const naturalHeight = lightboxImage.naturalHeight;
    if (naturalWidth === 0 || naturalHeight === 0) return;
    const scale = projectStillScale(naturalWidth, naturalHeight, window.innerWidth, window.innerHeight);
    lightboxImage.style.width = `${Math.round(naturalWidth * scale)}px`;
    lightboxImage.style.height = 'auto';
  };

  const renderStill = (cardIndex: number, slide: number): void => {
    const stills = stillSlides(cardIndex);
    const position = stills.indexOf(slide);
    const copy = stillCopy(cardIndex, slide);
    if (position < 0 || !copy) return;
    lightboxCard = cardIndex;
    lightboxStill = slide;
    lightboxImage.src = copy.src;
    lightboxImage.alt = copy.caption;
    fitLightboxImage();
    lightboxCaption.textContent = copy.caption;
    lightboxCounter.textContent = `${position + 1} / ${stills.length}`;
    const multiple = stills.length > 1;
    lightboxPrev.hidden = !multiple;
    lightboxNext.hidden = !multiple;
  };

  /**
   * Any still of the card can be opened on its own. Opening one also brings
   * that slide forward, so closing the viewer leaves the deck on the picture
   * the reader just looked at.
   */
  const openStill = (cardIndex: number, slide: number, trigger: HTMLElement | null): void => {
    if (stillSlides(cardIndex).length === 0) return;
    setSceneSlide(cardIndex, slide);
    renderStill(cardIndex, slide);
    if (lightboxCard < 0) return;
    lightboxTrigger = trigger;
    page.dataset.imageOpen = 'true';
    lightbox.dataset.visible = 'true';
    lightboxClose.focus({ preventScroll: true });
  };

  const closeStill = (): void => {
    if (!lightboxOpen()) return;
    lightbox.dataset.visible = 'false';
    delete page.dataset.imageOpen;
    lightboxImage.removeAttribute('src');
    lightboxImage.style.width = '';
    lightboxCard = -1;
    lightboxStill = -1;
    const trigger = lightboxTrigger;
    lightboxTrigger = null;
    trigger?.focus({ preventScroll: true });
  };

  const stepStill = (step: number): void => {
    const stills = stillSlides(lightboxCard);
    if (stills.length < 2 || lightboxStill < 0) return;
    const position = stills.indexOf(lightboxStill);
    const next = stills[(position + step + stills.length) % stills.length]!;
    setSceneSlide(lightboxCard, next);
    renderStill(lightboxCard, next);
  };

  const setActive = (index: number): void => {
    if (index === activeIndex) return;
    activeIndex = index;
    counter.textContent = `${String(index + 1).padStart(2, '0')} / ${String(total).padStart(2, '0')}`;
    jumpButtons.forEach((button, buttonIndex) => {
      const active = buttonIndex === index;
      if (active) button.dataset.active = 'true';
      else delete button.dataset.active;
      button.setAttribute('aria-current', active ? 'true' : 'false');
    });
    scenes.forEach((scene, sceneIndex) => {
      if (sceneIndex === index) scene.dataset.active = 'true';
      else delete scene.dataset.active;
    });
    syncSceneMedia(index);
  };

  const render = (): void => {
    frame = 0;
    if (disposed) return;
    const scrollTop = scroll.scrollTop;
    const scrolled = scrollTop > 24 ? 'true' : 'false';
    if (page.dataset.scrolled !== scrolled) page.dataset.scrolled = scrolled;

    let active = 0;
    let closest = Number.POSITIVE_INFINITY;

    refs.forEach((ref, index) => {
      const offset = scrollTop - ref.rest;
      const distance = Math.abs(offset);

      // Off-screen cards do not need new transform work every frame. Reset
      // their 3D tilt once, then let the compositor leave them alone.
      if (distance > ref.cardHeight * 1.35) {
        if (ref.scene.dataset.parallax !== 'idle') {
          ref.scene.dataset.parallax = 'idle';
          gsap.set(ref.card, { rotationX: 0, rotationY: 0 });
          gsap.set(ref.media, { x: 0, y: 0 });
          gsap.set(ref.copy, { x: 0, y: 0 });
          gsap.set(ref.number, { x: 0, y: 0 });
        }
        if (distance < closest) {
          closest = distance;
          active = index;
        }
        return;
      }

      ref.scene.dataset.parallax = 'active';
      const motion = projectCardMotion({ offset, cardHeight: ref.cardHeight, dwell: ref.dwell });
      const proximity = options.reducedMotion
        ? 0
        : clamp01(1 - Math.abs(offset) / Math.max(1, ref.cardHeight * 1.35));
      const pointerX = pointer.x * proximity;
      const pointerY = pointer.y * proximity;
      const scrollDepth = Math.max(-1, Math.min(1, offset / Math.max(1, ref.cardHeight)));

      if (!options.reducedMotion) {
        gsap.set(ref.card, {
          y: motion.y,
          scale: motion.scale,
          opacity: motion.opacity,
          rotationX: -pointerY * 1.8,
          rotationY: pointerX * 2.6,
          transformPerspective: 1200,
        });
        // The aside trails the card as it hands over, so it fades out almost
        // completely rather than leaving a stray paragraph on screen.
        gsap.set(ref.aside, {
          x: pointerX * 5,
          y: motion.y * 0.5 + pointerY * 4,
          opacity: 1 - 0.9 * motion.retreat,
        });
      }

      if (!options.reducedMotion) {
        gsap.set(ref.media, {
          x: pointerX * 14,
          y: pointerY * 9 - scrollDepth * 16 * proximity,
        });
        gsap.set(ref.copy, {
          x: pointerX * -7,
          y: pointerY * -5 + scrollDepth * 10 * proximity,
        });
        gsap.set(ref.number, {
          x: pointerX * 24,
          y: pointerY * 18 + scrollDepth * 24 * proximity,
        });
      } else {
        gsap.set(ref.media, { x: 0, y: 0 });
        gsap.set(ref.copy, { x: 0, y: 0 });
        gsap.set(ref.number, { x: 0, y: 0 });
      }

      if (distance < closest) {
        closest = distance;
        active = index;
      }
    });

    setActive(active);
  };

  const schedule = (): void => {
    if (frame || disposed) return;
    frame = window.requestAnimationFrame(render);
  };

  const scheduleMeasure = (): void => {
    if (measureFrame || disposed) return;
    measureFrame = window.requestAnimationFrame(() => {
      measureFrame = 0;
      measure();
      render();
      // The enlarged still is sized from the window, so it follows a resize.
      if (lightboxOpen()) fitLightboxImage();
    });
  };

  const scrollToScene = (index: number): void => {
    const target = refs[Math.min(total - 1, Math.max(0, index))];
    if (!target) return;
    scroll.scrollTo({ top: target.rest, behavior: options.reducedMotion ? 'auto' : 'smooth' });
  };

  const showToast = (message: string): void => {
    toast.textContent = message;
    toast.dataset.visible = 'true';
    if (toastTimer) window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
      toast.dataset.visible = 'false';
      toastTimer = 0;
    }, 2600);
  };

  const requestClose = (): void => {
    if (closing || disposed) return;
    closing = true;
    if (options.reducedMotion) {
      options.onClose();
      return;
    }
    gsap.to(page, {
      autoAlpha: 0,
      duration: 0.32,
      ease: 'power2.in',
      onComplete: () => {
        if (!disposed) options.onClose();
      },
    });
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (options.reducedMotion || event.pointerType === 'touch') return;
    const rect = page.getBoundingClientRect();
    const nextX = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1));
    const nextY = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1));
    if (Math.abs(nextX - pointer.x) < 0.002 && Math.abs(nextY - pointer.y) < 0.002) return;
    pointer.x = nextX;
    pointer.y = nextY;
    schedule();
  };

  const onPointerLeave = (event: PointerEvent): void => {
    const related = event.relatedTarget;
    if (related instanceof Node && page.contains(related)) return;
    pointer.x = 0;
    pointer.y = 0;
    schedule();
  };

  const openVideoDetail = (item: ProjectShowcase): void => {
    const media = item.mediaItems?.find((entry) => entry.kind === 'video');
    if (!media) {
      showToast('这个项目暂时没有视频详情');
      return;
    }
    videoPlayer.src = media.src;
    videoPlayer.poster = media.poster ?? '';
    videoCaption.textContent = `${item.title.zh} · ${media.badge ?? media.label}`;
    videoModal.hidden = false;
    page.dataset.videoOpen = 'true';
    videoPlayer.muted = false;
    void videoPlayer.play().catch(() => {
      videoPlayer.muted = true;
      void videoPlayer.play().catch(() => {
        // The native controls remain available if autoplay is blocked.
      });
    });
    videoCloseButton.focus({ preventScroll: true });
  };

  const closeVideoDetail = (): void => {
    if (videoModal.hidden) return;
    videoPlayer.pause();
    videoModal.hidden = true;
    delete page.dataset.videoOpen;
    videoPlayer.removeAttribute('src');
    videoPlayer.removeAttribute('poster');
    videoPlayer.load();
  };

  const onClick = (event: MouseEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target?.closest('[data-project-lightbox-close]')) {
      closeStill();
      return;
    }
    if (target?.closest('[data-project-lightbox-prev]')) {
      stepStill(-1);
      return;
    }
    if (target?.closest('[data-project-lightbox-next]')) {
      stepStill(1);
      return;
    }
    // Only the empty backdrop closes; the picture itself stays put.
    if (target === lightbox) {
      closeStill();
      return;
    }
    const zoom = target?.closest<HTMLElement>('[data-project-zoom]');
    if (zoom) {
      openStill(
        Number.parseInt(zoom.dataset.projectZoom ?? '0', 10),
        Number.parseInt(zoom.dataset.projectZoomSlide ?? '0', 10),
        zoom,
      );
      return;
    }
    const still = target?.closest<HTMLElement>('[data-project-still]');
    if (still) {
      const scene = still.closest<HTMLElement>('[data-project-scene]');
      const refIndex = scene ? scenes.indexOf(scene) : -1;
      if (refIndex >= 0) {
        openStill(refIndex, Number.parseInt(still.dataset.projectStill ?? '0', 10), still);
      }
      return;
    }
    if (target?.closest('[data-project-video-close]')) {
      closeVideoDetail();
      return;
    }
    if (target === videoModal) {
      closeVideoDetail();
      return;
    }
    const jump = target?.closest<HTMLElement>('[data-project-jump]');
    if (jump) {
      scrollToScene(Number.parseInt(jump.dataset.projectJump ?? '0', 10));
      return;
    }
    const slide = target?.closest<HTMLElement>('[data-project-slide]');
    if (slide) {
      const scene = slide.closest<HTMLElement>('[data-project-scene]');
      const refIndex = scene ? scenes.indexOf(scene) : -1;
      if (refIndex >= 0) setSceneSlide(refIndex, Number.parseInt(slide.dataset.projectSlide ?? '0', 10));
      return;
    }
    // A card that prints one button per source opens that exact link, and
    // brings its cover forward so the picture matches the piece being opened.
    const source = target?.closest<HTMLElement>('[data-project-source]');
    if (source) {
      const index = Number.parseInt(source.dataset.projectSource ?? '0', 10);
      const slideIndex = Number.parseInt(source.dataset.projectSourceSlide ?? '0', 10);
      const item = showcases[index];
      const href = item?.mediaItems?.[slideIndex]?.href;
      if (refs[index]?.gallery) setSceneSlide(index, slideIndex);
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
      else showToast('这条内容暂时没有链接');
      return;
    }
    // Reading links printed beside a card open their own article.
    const externalLink = target?.closest<HTMLElement>('[data-project-link]');
    if (externalLink) {
      const index = Number.parseInt(externalLink.dataset.projectLink ?? '0', 10);
      const linkIndex = Number.parseInt(externalLink.dataset.projectLinkIndex ?? '0', 10);
      const href = showcases[index]?.links?.[linkIndex]?.href;
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
      else showToast('这条内容暂时没有链接');
      return;
    }
    const pdf = target?.closest<HTMLElement>('[data-project-pdf]');
    if (pdf) {
      const index = Number.parseInt(pdf.dataset.projectPdf ?? '0', 10);
      const item = showcases[index];
      if (item?.detailPdf) window.open(item.detailPdf, '_blank', 'noopener,noreferrer');
      return;
    }
    const article = target?.closest<HTMLElement>('[data-project-article]');
    if (article) {
      const index = Number.parseInt(article.dataset.projectArticle ?? '0', 10);
      const item = showcases[index];
      const slide = item?.mediaItems?.[refs[index]?.slideIndex ?? 0];
      const href = slide?.href ?? item?.mediaItems?.find((entry) => entry.href)?.href;
      if (href) window.open(href, '_blank', 'noopener,noreferrer');
      else showToast('这篇稿件暂时没有原文链接');
      return;
    }
    const preview = target?.closest<HTMLElement>('[data-project-preview]');
    if (preview) {
      const index = Number.parseInt(preview.dataset.projectPreview ?? '0', 10);
      const item = showcases[index];
      if (!item) return;
      // A still gallery opens the slide that is on screen, not always the
      // first one; single-image cards have exactly one picture to open.
      const ref = refs[index];
      const slides = stillSlides(index);
      const slide = item.mediaKind === 'gallery' && ref && slides.includes(ref.slideIndex)
        ? ref.slideIndex
        : slides[0];
      if (slide !== undefined) openStill(index, slide, preview);
      return;
    }
    const videoToggle = target?.closest<HTMLElement>('[data-project-video-toggle]');
    if (videoToggle) {
      const index = Number.parseInt(videoToggle.dataset.projectVideoToggle ?? '0', 10);
      const ref = refs[index];
      const item = showcases[index];
      if (!ref || !item || !ref.actionButton) return;
      const actionButton = ref.actionButton;
      if (item.mediaKind === 'gallery') {
        openVideoDetail(item);
        return;
      }
      const activeMedia = activeGalleryMedia(ref, index);
      if (activeMedia && activeMedia.kind !== 'video') {
        window.open(activeMedia.src, '_blank', 'noopener,noreferrer');
        return;
      }
      const video = ref.gallery
        ? ref.videos.find((entry) => (
          entry.closest<HTMLElement>('[data-project-media-slide]')?.dataset.projectMediaSlide === String(ref.slideIndex)
        )) ?? null
        : ref.videos[0] ?? null;
      if (!video) return;

      if (video.paused || video.muted) {
        video.muted = false;
        delete video.dataset.userPaused;
        void video.play().then(() => {
          setActionLabel(actionButton, '暂停短片');
          actionButton.setAttribute('aria-pressed', 'true');
        }).catch(() => {
          video.muted = true;
          setActionLabel(actionButton, '开启声音');
          actionButton.setAttribute('aria-pressed', 'false');
          showToast('浏览器阻止了带声音播放，请再点一次');
        });
      } else {
        video.pause();
        video.dataset.userPaused = 'true';
        setActionLabel(actionButton, '继续播放');
        actionButton.setAttribute('aria-pressed', 'false');
      }
      return;
    }
    const action = target?.closest<HTMLElement>('[data-project-action]');
    if (action) {
      const index = Number.parseInt(action.dataset.projectAction ?? '0', 10);
      const item = showcases[index];
      showToast(item ? `「${item.title.zh}」详情弹窗即将上线` : '项目详情弹窗即将上线');
    }
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    // The picture viewer sits on top and owns the keys while it is open, so
    // the deck never pages underneath it.
    if (lightboxOpen()) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        closeStill();
      } else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
        event.preventDefault();
        event.stopImmediatePropagation();
        stepStill(event.key === 'ArrowRight' ? 1 : -1);
      }
      return;
    }
    if (event.key === 'Escape' && !videoModal.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      closeVideoDetail();
      return;
    }
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
    const step = event.key === 'ArrowDown' || event.key === 'PageDown'
      ? 1
      : event.key === 'ArrowUp' || event.key === 'PageUp' ? -1 : 0;
    if (step !== 0) {
      event.preventDefault();
      scrollToScene((activeIndex < 0 ? 0 : activeIndex) + step);
      return;
    }
    if (event.key === 'Home') {
      event.preventDefault();
      scrollToScene(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      scrollToScene(total - 1);
    }
  };

  scroll.addEventListener('scroll', schedule, { passive: true });
  page.addEventListener('click', onClick);
  page.addEventListener('pointermove', onPointerMove);
  page.addEventListener('pointerleave', onPointerLeave);
  closeButton.addEventListener('click', requestClose);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('resize', scheduleMeasure);
  lightboxImage.addEventListener('load', fitLightboxImage);

  const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(scheduleMeasure);
  resizeObserver?.observe(deck);

  measure();
  render();
  setActive(0);

  if (options.reducedMotion) {
    page.dataset.motionReady = 'true';
  } else {
    const masthead = page.querySelector('.projects-page__masthead');
    const footer = page.querySelector('.projects-page__footer');
    const first = refs[0];
    gsap.timeline({ defaults: { ease: 'power3.out' } })
      .fromTo(page, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.28 })
      .fromTo(masthead, { autoAlpha: 0, y: -18 }, { autoAlpha: 1, y: 0, duration: 0.55 }, '<0.05')
      .fromTo(first ? first.sticky : [], { autoAlpha: 0, y: 46 }, { autoAlpha: 1, y: 0, duration: 0.72 }, '<0.05')
      .fromTo(footer, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.5 }, '<0.15')
      .fromTo(closeButton, { autoAlpha: 0, y: -12 }, { autoAlpha: 1, y: 0, duration: 0.42 }, '<0.05');
    page.dataset.motionReady = 'true';
  }

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      if (frame) window.cancelAnimationFrame(frame);
      if (measureFrame) window.cancelAnimationFrame(measureFrame);
      if (toastTimer) window.clearTimeout(toastTimer);
      resizeObserver?.disconnect();
      scroll.removeEventListener('scroll', schedule);
      page.removeEventListener('click', onClick);
      page.removeEventListener('pointermove', onPointerMove);
      page.removeEventListener('pointerleave', onPointerLeave);
      closeButton.removeEventListener('click', requestClose);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('resize', scheduleMeasure);
      lightboxImage.removeEventListener('load', fitLightboxImage);
      refs.forEach((ref) => {
        ref.videos.forEach((video) => video.pause());
        gsap.killTweensOf(ref.card);
        gsap.killTweensOf(ref.media);
        gsap.killTweensOf(ref.copy);
        gsap.killTweensOf(ref.number);
        gsap.killTweensOf(ref.aside);
        gsap.killTweensOf(ref.sticky);
      });
      videoPlayer.pause();
      lightboxImage.removeAttribute('src');
      lightboxImage.style.width = '';
      lightboxCard = -1;
      lightboxStill = -1;
      lightboxTrigger = null;
      gsap.killTweensOf(page);
      page.remove();
    },
  };
}
