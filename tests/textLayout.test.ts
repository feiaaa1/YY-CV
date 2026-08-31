import { describe, expect, test } from 'vitest';
import { truncateMeasuredText, wrapMeasuredText } from '../src/three/textLayout';

const measure = (value: string) => [...value].length;

describe('measured canvas text layout', () => {
  test('preserves explicit lines and wraps Chinese by grapheme', () => {
    expect(wrapMeasuredText('\u7b2c\u4e00\u884c\n\u4e2d\u6587\u5185\u5bb9\u5f88\u957f', 4, measure, 4))
      .toEqual(['\u7b2c\u4e00\u884c', '\u4e2d\u6587\u5185\u5bb9', '\u5f88\u957f']);
  });

  test('wraps long unbroken Latin tokens and ellipsizes overflow', () => {
    expect(wrapMeasuredText('ABCDEFGHIJ', 4, measure, 2)).toEqual(['ABCD', 'EFG\u2026']);
  });

  test('truncates titles without splitting Unicode code points', () => {
    expect(truncateMeasuredText('\u4f5c\u54c1\u96c6\ud83c\udfa8\ufe0f\u957f\u6807\u9898', 6, measure)).toBe('\u4f5c\u54c1\u96c6\ud83c\udfa8\ufe0f\u2026');
  });
});
