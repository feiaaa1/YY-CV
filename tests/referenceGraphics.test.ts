import { describe, expect, test } from 'vitest';
import { coverGraphic, thanksGraphic } from '../src/three/referenceGraphics';

describe('reference-faithful graphic layers', () => {
  test('cover preserves every named reference layer', () => {
    expect(coverGraphic.layers.map((layer) => layer.id)).toEqual([
      'portfolio-title',
      'year',
      'script-title',
      'left-contact',
      'right-contact',
      'bottom-rail',
    ]);
  });

  test('thank-you composition includes title, message and contact line', () => {
    const ids = thanksGraphic.layers.map((layer) => layer.id);
    expect(ids).toEqual(expect.arrayContaining([
      'thank-you-title', 'year', 'script-title', 'message', 'contact-line', 'bottom-rail',
    ]));
  });
});
