export type FolderLayoutItem = { x: number; y: number; row: number; scale: number };

export type RenderProfile = {
  isMobile: boolean;
  pixelRatio: number;
  shadowMapSize: number;
};

export type RenderProfileOptions = {
  /**
   * Kept for callers that describe the screen they are preparing. Every
   * screen now renders at the same density, so this no longer changes the
   * profile; the flag only documents intent at the call site.
   */
  detailed?: boolean;
};

/**
 * Internship popups are bitmaps, so their sharpness is bounded by the source
 * resolution. Rendering the popup above these numbers invents pixels and is
 * what makes the artwork look soft on large displays.
 */
export const JOURNEY_DETAIL_TEXTURE = { width: 1086, height: 1448 } as const;

/** World-space size of the internship popup plane. */
export const JOURNEY_DETAIL_PLANE = { width: 4.25, height: 5.67 } as const;

/**
 * Text is painted inside the WebGL canvas, so the canvas itself has to match
 * the display: anything lower is upscaled by the browser and every glyph turns
 * soft, which is exactly what happened on phones and HiDPI laptops before.
 * The cap keeps very dense displays from multiplying the cost again.
 */
const PIXEL_RATIO_CAP = 3;
/** Ceiling for the whole framebuffer so 4x views do not melt weak GPUs. */
const MAX_CANVAS_PIXELS = 8_300_000;

export function getDirectoryLayout(width: number, height: number): FolderLayoutItem[] {
  const isMobile = width / height < 0.85;
  if (isMobile) {
    return [
      { x: -1.35, y: 2.9, row: 0, scale: 0.82 },
      { x: 1.35, y: 2.9, row: 0, scale: 0.82 },
      { x: -1.35, y: 0, row: 1, scale: 0.82 },
      { x: 1.35, y: 0, row: 1, scale: 0.82 },
      { x: 0, y: -2.9, row: 2, scale: 0.82 },
    ];
  }
  return [
    // Rows keep clear air between the caption of one row and the folder of the
    // next one; the old 2.65 spacing let them visually collide.
    { x: -3.4, y: 1.45, row: 0, scale: 1 },
    { x: 0, y: 1.45, row: 0, scale: 1 },
    { x: 3.4, y: 1.45, row: 0, scale: 1 },
    { x: -1.75, y: -1.9, row: 1, scale: 1 },
    { x: 1.75, y: -1.9, row: 1, scale: 1 },
  ];
}

export function getRenderProfile(
  width: number,
  height: number,
  devicePixelRatio: number,
  options: RenderProfileOptions = {},
): RenderProfile {
  const isMobile = width / height < 0.85 || width < 720;
  const cap = PIXEL_RATIO_CAP;
  const budget = Math.sqrt(MAX_CANVAS_PIXELS / Math.max(1, width * height));
  return {
    isMobile,
    // Never below the device density: a zoomed-out browser reports a ratio
    // under 1, and forcing it back to 1 makes the canvas larger than the
    // screen, so the browser shrinks it and every bitmap is resampled.
    pixelRatio: Math.max(0.5, Math.min(devicePixelRatio, cap, budget)),
    shadowMapSize: isMobile ? 512 : 1024,
  };
}

export function getCoverScale(width: number, height: number): number {
  if (width >= 720 && width / height >= 0.85) return 0.9;
  // Portrait covers stack the contact captions under the folder, so the
  // artwork itself can fill the viewport width instead of shrinking to 0.62.
  return Math.min(0.85, 0.72 * (width / 390));
}

export function getDetailScale(width: number, height: number, presentation?: string): number {
  const isMobile = width / height < 0.85 || width < 720;
  if (!isMobile) return 1;
  return presentation === 'journey' ? 0.76 : 0.62;
}

export type JourneyPopupOptions = {
  /** Pixel ratio the renderer actually uses for the detail screen. */
  pixelRatio?: number;
  /** Native height of the popup bitmap; this is the size it is shown at. */
  textureHeight?: number;
};

export type JourneyPopupFit = {
  /** Local scale applied to the popup plane. */
  scale: number;
  /** Device pixels the bitmap occupies; always its own resolution. */
  devicePixelHeight: number;
  /** Share of the viewport height the popup covers; above 1 it overflows. */
  viewportHeightRatio: number;
  /** Share of the viewport width the popup covers; above 1 it overflows. */
  viewportWidthRatio: number;
  /** World units the bitmap exceeds the viewport by, per axis (0 when it fits). */
  overflowX: number;
  overflowY: number;
  /** World units visible per axis at the popup depth, used to pan in pixels. */
  visibleWidth: number;
  visibleHeight: number;
  /** World units per device pixel at the popup depth, for pixel snapping. */
  worldPerPixel: number;
};

/**
 * Shows the internship popup at exactly its own resolution on every screen.
 * Shrinking it to fit a small viewport is what turns the page into mush, so the
 * bitmap instead keeps its size and overflows; the detail screen pans.
 */
export function getJourneyPopupFit(
  width: number,
  height: number,
  rootScale: number,
  options: JourneyPopupOptions = {},
): JourneyPopupFit {
  const isMobile = width / height < 0.85 || width < 720;
  const cameraZ = isMobile ? 13.6 : 11.8;
  const cameraFov = isMobile ? 48 : 38;
  const popupZ = 0.68;
  const textureHeight = options.textureHeight ?? JOURNEY_DETAIL_TEXTURE.height;
  const pixelRatio = Math.max(0.1, options.pixelRatio ?? 1);
  const visibleHeight = 2 * (cameraZ - popupZ * rootScale) * Math.tan(cameraFov * Math.PI / 360);
  const visibleWidth = visibleHeight * width / height;
  // The bitmap keeps one height everywhere: its own pixel height. Anything
  // smaller loses detail (mushy small screens) and anything larger invents it.
  const viewportDeviceHeight = Math.max(1, height * pixelRatio);
  const popupWorldHeight = visibleHeight * textureHeight / viewportDeviceHeight;
  const scale = popupWorldHeight / (JOURNEY_DETAIL_PLANE.height * rootScale);
  const popupWorldWidth = JOURNEY_DETAIL_PLANE.width * scale * rootScale;
  return {
    scale,
    devicePixelHeight: textureHeight,
    viewportHeightRatio: popupWorldHeight / visibleHeight,
    viewportWidthRatio: popupWorldWidth / visibleWidth,
    overflowX: Math.max(0, popupWorldWidth - visibleWidth),
    overflowY: Math.max(0, popupWorldHeight - visibleHeight),
    visibleWidth,
    visibleHeight,
    worldPerPixel: visibleHeight / viewportDeviceHeight,
  };
}

export function getJourneyPopupScale(
  width: number,
  height: number,
  rootScale: number,
  options: JourneyPopupOptions = {},
): number {
  return getJourneyPopupFit(width, height, rootScale, options).scale;
}
