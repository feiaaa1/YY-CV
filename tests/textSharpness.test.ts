import * as THREE from 'three';
import { describe, expect, test } from 'vitest';
import { panelTextureOptions } from '../src/three/geometry';
import { configureTextTexture, TEXT_TEXTURE_MAX_PIXELS, textCanvasSize, textTextureDensity } from '../src/three/textures';

function withDevicePixelRatio<T>(ratio: number, run: () => T): T {
  const originalWindow = globalThis.window;
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { devicePixelRatio: ratio },
  });
  try {
    return run();
  } finally {
    if (originalWindow === undefined) Reflect.deleteProperty(globalThis, 'window');
    else Object.defineProperty(globalThis, 'window', { configurable: true, value: originalWindow });
  }
}

describe('high fidelity canvas text', () => {
  test('matches the texture aspect to the panel it is printed on', () => {
    const square = panelTextureOptions(2, 2, { title: 'x' });
    expect(square.width! / square.height!).toBeCloseTo(1, 2);

    const portrait = panelTextureOptions(3.5, 4.08, { title: 'x' });
    expect(portrait.width! / portrait.height!).toBeCloseTo(3.5 / 4.08, 2);

    const banner = panelTextureOptions(10.25, 1.62, { title: 'x' });
    expect(banner.width! * banner.height!).toBeLessThanOrEqual(TEXT_TEXTURE_MAX_PIXELS);
  });

  test('sizes a canvas from the panel world size and the display density', () => {
    const standard = textCanvasSize(2.5, 0.66, 1);
    const dense = textCanvasSize(2.5, 0.66, 2);
    expect(dense.width).toBeCloseTo(standard.width! * 2, 0);
    expect(dense.height).toBeCloseTo(standard.height! * 2, 0);
    // Even a phone-sized poster still holds well over one texel per pixel.
    expect(standard.width!).toBeGreaterThan(2.5 * 200);
    expect(textTextureDensity(3)).toBe(textTextureDensity(2));
  });

  test('scales the caption canvas with the display it will be shown on', () => {
    const options = { title: '个人介绍', subtitle: '品牌视觉' };
    const standard = withDevicePixelRatio(1, () => panelTextureOptions(2.5, 0.66, options));
    const dense = withDevicePixelRatio(2, () => panelTextureOptions(2.5, 0.66, options));
    expect(dense.width!).toBeGreaterThan(standard.width!);
    expect(dense.height!).toBeGreaterThan(standard.height!);
    for (const size of [standard, dense]) {
      expect(size.width!).toBeGreaterThan(400);
      expect(size.width! * size.height!).toBeLessThanOrEqual(TEXT_TEXTURE_MAX_PIXELS);
    }
  });

  test('keeps mipmapped, anisotropic filtering on text textures', () => {
    const texture = configureTextTexture(new THREE.Texture());
    expect(texture.generateMipmaps).toBe(true);
    expect(texture.minFilter).toBe(THREE.LinearMipmapLinearFilter);
    expect(texture.magFilter).toBe(THREE.LinearFilter);
    expect(texture.anisotropy).toBeGreaterThan(1);
    expect(texture.colorSpace).toBe(THREE.SRGBColorSpace);
  });
});
