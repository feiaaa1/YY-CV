export type TextMeasure = (value: string) => number;

const ellipsis = '\u2026';

function codePoint(value: string): number {
  return value.codePointAt(0) ?? 0;
}

function isControl(value: string): boolean {
  return value !== '\u200D' && /[\p{Cc}\p{Cf}]/u.test(value);
}

function isExtend(value: string): boolean {
  return /[\p{Mn}\p{Me}\uFE00-\uFE0F\u{1F3FB}-\u{1F3FF}]/u.test(value);
}

function isSpacingMark(value: string): boolean {
  return /\p{Mc}/u.test(value);
}

function isPrepend(value: string): boolean {
  const point = codePoint(value);
  return (point >= 0x0600 && point <= 0x0605)
    || point === 0x06DD || point === 0x070F || (point >= 0x0890 && point <= 0x0891)
    || point === 0x08E2 || point === 0x0D4E || point === 0x110BD || point === 0x110CD
    || (point >= 0x111C2 && point <= 0x111C3) || point === 0x1193F || point === 0x11941
    || point === 0x11A3A || (point >= 0x11A84 && point <= 0x11A89) || point === 0x11D46
    || point === 0x11F02;
}

function hangulClass(value: string): 'L' | 'V' | 'T' | 'LV' | 'LVT' | undefined {
  const point = codePoint(value);
  if ((point >= 0x1100 && point <= 0x115F) || (point >= 0xA960 && point <= 0xA97C)) return 'L';
  if ((point >= 0x1160 && point <= 0x11A7) || (point >= 0xD7B0 && point <= 0xD7C6)) return 'V';
  if ((point >= 0x11A8 && point <= 0x11FF) || (point >= 0xD7CB && point <= 0xD7FB)) return 'T';
  if (point >= 0xAC00 && point <= 0xD7A3) return (point - 0xAC00) % 28 === 0 ? 'LV' : 'LVT';
  return undefined;
}

function isRegionalIndicator(value: string): boolean {
  const point = codePoint(value);
  return point >= 0x1F1E6 && point <= 0x1F1FF;
}

function isExtendedPictographic(value: string): boolean {
  return /\p{Extended_Pictographic}/u.test(value);
}

function hasExtendedPictographicZwjPrefix(grapheme: string): boolean {
  const values = Array.from(grapheme);
  if (values.at(-1) !== '\u200D') return false;
  let index = values.length - 2;
  while (index >= 0 && isExtend(values[index]!)) index -= 1;
  return index >= 0 && isExtendedPictographic(values[index]!);
}

function trailingRegionalIndicatorCount(grapheme: string): number {
  let count = 0;
  for (const value of Array.from(grapheme).reverse()) {
    if (isExtend(value)) continue;
    if (!isRegionalIndicator(value)) break;
    count += 1;
  }
  return count;
}

function hasPrependPrefix(grapheme: string): boolean {
  const values = Array.from(grapheme);
  let index = values.length - 1;
  while (index >= 0 && isExtend(values[index]!)) index -= 1;
  return index >= 0 && isPrepend(values[index]!);
}

function joinsGrapheme(previous: string, next: string): boolean {
  if (previous === '\r' && next === '\n') return true;
  if (isControl(Array.from(previous).at(-1) ?? '') || isControl(next)) return false;

  const previousHangul = hangulClass(Array.from(previous).at(-1) ?? '');
  const nextHangul = hangulClass(next);
  if (previousHangul === 'L' && (nextHangul === 'L' || nextHangul === 'V' || nextHangul === 'LV' || nextHangul === 'LVT')) return true;
  if ((previousHangul === 'LV' || previousHangul === 'V') && (nextHangul === 'V' || nextHangul === 'T')) return true;
  if ((previousHangul === 'LVT' || previousHangul === 'T') && nextHangul === 'T') return true;
  if (isExtend(next) || next === '\u200D' || isSpacingMark(next)) return true;
  if (hasPrependPrefix(previous)) return true;
  if (hasExtendedPictographicZwjPrefix(previous) && isExtendedPictographic(next)) return true;
  return isRegionalIndicator(next) && trailingRegionalIndicatorCount(previous) % 2 === 1;
}

export function splitFallbackGraphemes(text: string): string[] {
  const graphemes: string[] = [];
  let grapheme = '';

  for (const codePoint of Array.from(text)) {
    if (!grapheme || joinsGrapheme(grapheme, codePoint)) {
      grapheme += codePoint;
    } else {
      graphemes.push(grapheme);
      grapheme = codePoint;
    }
  }
  if (grapheme) graphemes.push(grapheme);
  return graphemes;
}

function splitGraphemes(text: string): string[] {
  if (typeof Intl.Segmenter === 'function') {
    return Array.from(new Intl.Segmenter(undefined, { granularity: 'grapheme' }).segment(text), ({ segment }) => segment);
  }
  return splitFallbackGraphemes(text);
}

function splitLongToken(token: string, maxWidth: number, measure: TextMeasure): string[] {
  const lines: string[] = [];
  let line = '';

  for (const grapheme of splitGraphemes(token)) {
    const next = `${line}${grapheme}`;
    if (line && measure(next) > maxWidth) {
      lines.push(line);
      line = grapheme;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines;
}

export function truncateMeasuredText(text: string, maxWidth: number, measure: TextMeasure): string {
  if (measure(text) <= maxWidth) return text;
  if (maxWidth <= 0 || measure(ellipsis) > maxWidth) return '';

  let result = '';
  for (const grapheme of splitGraphemes(text)) {
    if (measure(`${result}${grapheme}${ellipsis}`) > maxWidth) break;
    result += grapheme;
  }
  return `${result}${ellipsis}`;
}

function wrapParagraph(paragraph: string, maxWidth: number, measure: TextMeasure): string[] {
  if (!paragraph) return [''];

  const lines: string[] = [];
  let line = '';
  for (const token of paragraph.trim().split(/\s+/)) {
    if (!token) continue;
    const next = line ? `${line} ${token}` : token;
    if (measure(next) <= maxWidth) {
      line = next;
      continue;
    }
    if (line) {
      lines.push(line);
      line = '';
    }
    if (measure(token) <= maxWidth) {
      line = token;
      continue;
    }

    const tokenLines = splitLongToken(token, maxWidth, measure);
    lines.push(...tokenLines.slice(0, -1));
    line = tokenLines.at(-1) ?? '';
  }
  if (line) lines.push(line);
  return lines;
}

export function wrapMeasuredText(text: string, maxWidth: number, measure: TextMeasure, maxLines: number): string[] {
  if (maxLines <= 0 || maxWidth <= 0) return [];

  const lines = text.split(/\r?\n/).flatMap((paragraph) => wrapParagraph(paragraph, maxWidth, measure));
  if (lines.length <= maxLines) return lines;

  const visible = lines.slice(0, maxLines);
  const lastLine = visible[maxLines - 1] ?? '';
  visible[maxLines - 1] = truncateMeasuredText(`${lastLine}${ellipsis}`, maxWidth, measure);
  return visible;
}
