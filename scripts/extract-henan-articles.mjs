/**
 * One-off helper: pulls the title, account, publish date, body copy and
 * content images out of the saved WeChat article pages so the Henan TV card
 * can be filled with the real material instead of placeholders.
 *
 * Usage: node scripts/extract-henan-articles.mjs <html-dir> <json-out>
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const htmlDir = process.argv[2];
const outFile = process.argv[3];

if (!htmlDir || !outFile) {
  console.error('usage: node scripts/extract-henan-articles.mjs <html-dir> <json-out>');
  process.exit(1);
}

function decodeEntities(input) {
  return input
    .replace(/&nbsp;/g, ' ')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(Number(dec)));
}

function pick(source, pattern, group = 1) {
  const match = source.match(pattern);
  return match ? decodeEntities(match[group]) : '';
}

function sliceContent(html) {
  const marker = html.indexOf('id="js_content"');
  if (marker === -1) return '';
  const start = html.indexOf('>', marker) + 1;
  const end = html.indexOf('<script', start);
  return html.slice(start, end === -1 ? undefined : end);
}

function htmlToText(fragment) {
  return decodeEntities(
    fragment
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(p|section|div|h[1-6]|li|blockquote)>/gi, '\n')
      .replace(/<[^>]+>/g, ''),
  )
    .split('\n')
    .map((line) => line.replace(/\u00a0/g, ' ').trim())
    .filter(Boolean)
    .join('\n');
}

function collectImages(fragment) {
  const urls = [];
  const pattern = /<img[^>]*>/gi;
  for (const tag of fragment.match(pattern) ?? []) {
    const raw = tag.match(/data-src="([^"]+)"/i)?.[1] ?? tag.match(/\ssrc="([^"]+)"/i)?.[1];
    if (!raw || raw.startsWith('data:')) continue;
    const url = decodeEntities(raw).replace(/&amp;/g, '&');
    if (!/^https?:\/\//.test(url)) continue;
    if (!urls.includes(url)) urls.push(url);
  }
  return urls;
}

const files = (await readdir(htmlDir)).filter((file) => file.endsWith('.html')).sort();
const articles = [];

for (const file of files) {
  const html = await readFile(path.join(htmlDir, file), 'utf8');
  const content = sliceContent(html);
  const timestamp = Number(pick(html, /var ct = "(\d+)"/) || 0);
  articles.push({
    file,
    title: pick(html, /var msg_title = '([\s\S]*?)'\.html\(false\)/),
    account: pick(html, /var nickname = htmlDecode\("([\s\S]*?)"\)/),
    author: pick(html, /var author = (?:htmlDecode\(")?([^";]*)"/),
    publishTime: pick(html, /var publish_time = "([^"]*)"/) || (timestamp ? timestamp : ''),
    timestamp,
    cover: pick(html, /var msg_cdn_url = "([^"]*)"/),
    digest: pick(html, /var msg_desc = htmlDecode\("([\s\S]*?)"\)/),
    text: htmlToText(content),
    images: collectImages(content),
  });
}

await writeFile(outFile, JSON.stringify(articles, null, 2), 'utf8');
console.log(
  articles
    .map((article) => `${article.file}\t${article.title}\t${article.images.length} images\t${article.text.length} chars`)
    .join('\n'),
);
