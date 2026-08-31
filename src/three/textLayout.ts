export type TextMeasure = (value: string) => number;

const ellipsis = '\u2026';

function splitLongToken(token: string, maxWidth: number, measure: TextMeasure): string[] {
  const lines: string[] = [];
  let line = '';

  for (const grapheme of Array.from(token)) {
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
  for (const grapheme of Array.from(text)) {
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
