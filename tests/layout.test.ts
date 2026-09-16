import { describe, expect, test } from 'vitest';
import {
  getCoverScale,
  getDetailScale,
  getDirectoryLayout,
  getJourneyPopupFit,
  getJourneyPopupScale,
  getRenderProfile,
  JOURNEY_DETAIL_TEXTURE,
} from '../src/experience/layout';

describe('responsive scene layout', () => {
  test('uses a three-plus-two composition on desktop', () => {
    const positions = getDirectoryLayout(1440, 900);
    expect(positions.map(({ row }) => row)).toEqual([0, 0, 0, 1, 1]);
    expect(positions[3]?.x).toBeLessThan(positions[4]?.x ?? 0);
  });

  test('uses a two-plus-two-plus-one composition on mobile', () => {
    const positions = getDirectoryLayout(390, 844);
    expect(positions.map(({ row }) => row)).toEqual([0, 0, 1, 1, 2]);
    expect(positions[4]?.x).toBe(0);
    expect((positions[0]?.y ?? 0) - (positions[2]?.y ?? 0)).toBeGreaterThanOrEqual(2.35);
    expect((positions[2]?.y ?? 0) - (positions[4]?.y ?? 0)).toBeGreaterThanOrEqual(2.35);
  });

  test('fills desktop and mobile viewports with the complete cover composition', () => {
    expect(getCoverScale(390, 844)).toBe(0.72);
    expect(getCoverScale(640, 640)).toBe(0.85);
    expect(getCoverScale(1440, 900)).toBe(0.9);
  });

  test('returns only render settings consumed by the runtime', () => {
    const phone = getRenderProfile(390, 844, 3);
    expect(phone.isMobile).toBe(true);
    // A 3x phone screen needs a 3x framebuffer, otherwise the browser upscales
    // the whole canvas and the artwork goes soft.
    expect(phone.pixelRatio).toBe(3);
    expect(phone.shadowMapSize).toBe(512);

    const desktop = getRenderProfile(1440, 900, 3);
    expect(desktop.isMobile).toBe(false);
    expect(desktop.pixelRatio).toBeGreaterThan(2);
    expect(desktop.pixelRatio).toBeLessThanOrEqual(3);
    expect(desktop.shadowMapSize).toBe(1024);
  });

  test('renders every screen at display density inside a framebuffer budget', () => {
    // WebGL text is upscaled by the browser below one device pixel per point,
    // which is what turned the folder captions soft on phones and HiDPI panels.
    for (const [width, height] of [[1440, 900], [390, 844], [1280, 800]] as const) {
      expect(getRenderProfile(width, height, 2).pixelRatio).toBe(2);
    }
    expect(getRenderProfile(390, 844, 3, { detailed: true }).pixelRatio).toBe(3);
    expect(getRenderProfile(1440, 900, 3, { detailed: true }).pixelRatio).toBeGreaterThan(2);

    const budgeted = getRenderProfile(2560, 1440, 2, { detailed: true });
    expect(budgeted.pixelRatio).toBeLessThan(2);
    expect(2560 * 1440 * budgeted.pixelRatio ** 2).toBeLessThanOrEqual(8_300_000);
  });

  test('fits detail models inside narrow mobile viewports', () => {
    expect(getDetailScale(390, 844)).toBeLessThanOrEqual(0.64);
    expect(getDetailScale(1440, 900)).toBe(1);
  });

  test('keeps the square internship board larger than wide detail objects on mobile', () => {
    expect(getDetailScale(390, 844, 'journey')).toBe(0.76);
    expect(getDetailScale(390, 844, 'journey')).toBeGreaterThan(getDetailScale(390, 844));
  });

  test('shows internship popups at their native bitmap size on every viewport', () => {
    const viewports = [
      [1440, 900, 1],
      [2560, 1600, 1],
      [1280, 720, 1],
      [3840, 2160, 1],
      [1920, 1080, 2],
      [5120, 2880, 2],
      [3008, 1692, 2],
      [390, 844, 3],
    ] as const;

    for (const [width, height, pixelRatio] of viewports) {
      const fit = getJourneyPopupFit(width, height, 1, { pixelRatio });
      // Shrinking it loses detail and stretching it invents detail; both make
      // the sheet unreadable, so the popup always renders one bitmap pixel per
      // device pixel.
      expect(fit.devicePixelHeight).toBeCloseTo(JOURNEY_DETAIL_TEXTURE.height, 6);
      expect(fit.viewportHeightRatio * height * pixelRatio)
        .toBeCloseTo(JOURNEY_DETAIL_TEXTURE.height, 6);
    }
    expect(getJourneyPopupScale(2560, 1600, 1, { pixelRatio: 1 })).toBeCloseTo(1.222, 3);
  });

  test('reports popup overflow so the detail screen can pan instead of shrinking', () => {
    const desktop = getJourneyPopupFit(2560, 1600, 1, { pixelRatio: 1 });
    expect(desktop.viewportHeightRatio).toBeCloseTo(1448 / 1600, 6);
    expect(desktop.overflowY).toBeCloseTo(0, 6);
    expect(desktop.overflowX).toBeCloseTo(0, 6);

    const shortWindow = getJourneyPopupFit(1280, 720, 1, { pixelRatio: 1 });
    expect(shortWindow.viewportHeightRatio).toBeGreaterThan(1);
    expect(shortWindow.overflowY).toBeGreaterThan(0);
    expect(shortWindow.overflowX).toBeCloseTo(0, 6);
    expect(shortWindow.visibleHeight).toBeGreaterThan(0);

    const phone = getJourneyPopupFit(390, 844, 0.76, { pixelRatio: 3 });
    expect(phone.viewportHeightRatio).toBeLessThan(1);
    expect(phone.overflowY).toBeCloseTo(0, 6);
    expect(phone.overflowX).toBeCloseTo(0, 6);
  });
});
