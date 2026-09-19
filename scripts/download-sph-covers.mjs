/**
 * One-off helper: reads the finder-preview JSON captured by
 * `fetch-sph-feed.mjs` and downloads the 视频号 cover of every link into the
 * project's Henan TV asset folder, so the card can print local covers instead
 * of hot-linking finder.video.qq.com.
 *
 * Usage: node scripts/download-sph-covers.mjs <sph-feed.json> <out-dir> <name> [<name>...]
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const [jsonFile, outDir, ...names] = process.argv.slice(2);
if (!jsonFile || !outDir) {
  throw new Error('usage: node scripts/download-sph-covers.mjs <sph-feed.json> <out-dir> <name> [<name>...]');
}

await mkdir(outDir, { recursive: true });
const report = JSON.parse(await readFile(jsonFile, 'utf8'));

function imageSize(buffer) {
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
  return null;
}

for (const [index, entry] of report.entries()) {
  const hit = entry.network.find((item) => item.url.includes('get_feed_info') && item.body);
  if (!hit) {
    console.log(`${index}\tNO_FEED_INFO`);
    continue;
  }
  const cover = JSON.parse(hit.body).data.feedInfo.coverUrl;
  const name = names[index] ?? `cover-${index}`;
  const response = await fetch(cover, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!response.ok) {
    console.log(`${name}\tHTTP ${response.status}`);
    continue;
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(path.join(outDir, `${name}.jpg`), buffer);
  const size = imageSize(buffer);
  console.log(`${name}.jpg\t${buffer.length}\t${size ? `${size.width}x${size.height}` : '?'}`);
}
