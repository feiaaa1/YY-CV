/**
 * One-off helper: downloads the content images of the saved Henan TV WeChat
 * articles so the best stills can be picked for the project card.
 *
 * Usage: node scripts/download-henan-images.mjs <articles.json> <out-dir>
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const articlesFile = process.argv[2];
const outDir = process.argv[3];

if (!articlesFile || !outDir) {
  console.error('usage: node scripts/download-henan-images.mjs <articles.json> <out-dir>');
  process.exit(1);
}

await mkdir(outDir, { recursive: true });
const articles = JSON.parse(await readFile(articlesFile, 'utf8'));

function imageSize(buffer) {
  if (buffer[0] === 0x89 && buffer.toString('latin1', 1, 4) === 'PNG') {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 9) {
      if (buffer[offset] !== 0xff) { offset += 1; continue; }
      const marker = buffer[offset + 1];
      const length = buffer.readUInt16BE(offset + 2);
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) };
      }
      offset += 2 + length;
    }
  }
  if (buffer.toString('latin1', 0, 3) === 'GIF') {
    return { width: buffer.readUInt16LE(6), height: buffer.readUInt16LE(8) };
  }
  return null;
}

const report = [];
for (const article of articles) {
  const slug = path.basename(article.file, '.html');
  const urls = [article.cover, ...article.images].filter(Boolean);
  let index = 0;
  for (const url of urls) {
    index += 1;
    const extension = url.includes('wx_fmt=gif') ? 'gif' : 'jpg';
    const name = `${slug}-${String(index).padStart(2, '0')}.${extension}`;
    try {
      const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (!response.ok) {
        report.push(`${name}\tHTTP ${response.status}`);
        continue;
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(path.join(outDir, name), buffer);
      const size = imageSize(buffer);
      report.push(`${name}\t${buffer.length}\t${size ? `${size.width}x${size.height}` : '?'}\t${url}`);
    } catch (error) {
      report.push(`${name}\tERROR ${error.message}`);
    }
  }
}

console.log(report.join('\n'));
