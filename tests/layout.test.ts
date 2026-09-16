import { describe, expect, test } from 'vitest';
import { getCoverScale, getDetailScale, getDirectoryLayout, getRenderProfile } from '../src/experience/layout';

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
    expect(getCoverScale(390, 844)).toBe(0.62);
    expect(getCoverScale(640, 640)).toBe(0.85);
    expect(getCoverScale(1440, 900)).toBe(0.9);
  });

  test('returns only render settings consumed by the runtime', () => {
    expect(getRenderProfile(390, 844, 3)).toEqual({
      isMobile: true,
      pixelRatio: 1,
      shadowMapSize: 512,
    });
    expect(getRenderProfile(1440, 900, 3)).toEqual({
      isMobile: false,
      pixelRatio: 1.25,
      shadowMapSize: 1024,
    });
  });

  test('fits detail models inside narrow mobile viewports', () => {
    expect(getDetailScale(390, 844)).toBeLessThanOrEqual(0.64);
    expect(getDetailScale(1440, 900)).toBe(1);
  });

  test('keeps the square internship board larger than wide detail objects on mobile', () => {
    expect(getDetailScale(390, 844, 'journey')).toBe(0.76);
    expect(getDetailScale(390, 844, 'journey')).toBeGreaterThan(getDetailScale(390, 844));
  });
});
