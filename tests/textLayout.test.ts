import { describe, expect, test } from 'vitest';
import { splitFallbackGraphemes, truncateMeasuredText, wrapMeasuredText } from '../src/three/textLayout';

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

  test('keeps combining sequences together when wrapping', () => {
    expect(wrapMeasuredText('e\u0301x', 1, measure, 3)).toEqual(['e\u0301', 'x']);
  });

  test('keeps ZWJ emoji sequences together when wrapping', () => {
    expect(wrapMeasuredText('\ud83d\udc69\u200d\ud83d\udcbbX', 1, measure, 3)).toEqual(['\ud83d\udc69\u200d\ud83d\udcbb', 'X']);
  });

  test('preserves CRLF paragraph boundaries', () => {
    expect(wrapMeasuredText('one\r\ntwo', 4, measure, 2)).toEqual(['one', 'two']);
  });

  test('fallback pairs regional-indicator flags', () => {
    expect(splitFallbackGraphemes('\ud83c\udde8\ud83c\udde6\ud83c\uddfa\ud83c\uddf8')).toEqual(['\ud83c\udde8\ud83c\udde6', '\ud83c\uddfa\ud83c\uddf8']);
  });

  test('fallback keeps decomposed Hangul Jamo syllables together', () => {
    expect(splitFallbackGraphemes('\u1112\u1161\u11abX')).toEqual(['\u1112\u1161\u11ab', 'X']);
  });

  test('fallback preserves combining, ZWJ, CRLF, and spacing-mark sequences', () => {
    expect(splitFallbackGraphemes('e\u0301\ud83d\udc69\u200d\ud83d\udcbb\r\n\u0915\u093e')).toEqual([
      'e\u0301',
      '\ud83d\udc69\u200d\ud83d\udcbb',
      '\r\n',
      '\u0915\u093e',
    ]);
  });
});
