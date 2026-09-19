/**
 * One-off helper: opens WeChat Channels (视频号) share links in a headless
 * Chrome, records the finder-preview feed API response for each of them and
 * stores the raw JSON next to a rendered screenshot so the covers and copy can
 * be reviewed before they are folded into the portfolio card.
 *
 * Usage: node scripts/fetch-sph-feed.mjs <output-dir> <link> [link...]
 */
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const [outDir, ...links] = process.argv.slice(2);
if (!outDir || links.length === 0) {
  throw new Error('usage: node scripts/fetch-sph-feed.mjs <output-dir> <link> [link...]');
}

await mkdir(outDir, { recursive: true });

const port = 9471;
const chromePath = process.env.CHROME_PATH ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(path.join(os.tmpdir(), 'sph-feed-'));

const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
  '--window-size=1280,900',
  'about:blank',
], { stdio: 'ignore' });

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function target() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json());
      const page = list.find((entry) => entry.type === 'page');
      if (page) return page;
    } catch {
      // Chrome is still starting.
    }
    await wait(500);
  }
  throw new Error('Chrome debugging endpoint never came up');
}

const page = await target();
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});

let nextId = 1;
const pending = new Map();
const networkHits = [];

socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Network.responseReceived') {
    const { url, status, mimeType } = message.params.response;
    if (/get_feed_info|get_userpage|\/api\/|cgi-bin/.test(url)) {
      networkHits.push({ requestId: message.params.requestId, url, status, mimeType });
    }
  }
  if (!message.id) return;
  const waiter = pending.get(message.id);
  if (!waiter) return;
  pending.delete(message.id);
  if (message.error) waiter.reject(new Error(message.error.message));
  else waiter.resolve(message.result);
});

const send = (method, params = {}) => {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};

const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) {
    throw new Error(result.exceptionDetails.exception?.description ?? result.exceptionDetails.text);
  }
  return result.result.value;
};

await Promise.all([
  send('Page.enable'),
  send('Runtime.enable'),
  send('Network.enable'),
]);

const report = [];

for (const [index, link] of links.entries()) {
  networkHits.length = 0;
  await send('Page.navigate', { url: link });
  await wait(6000);

  const dom = await evaluate(`(() => ({
    text: document.body.innerText.slice(0, 4000),
    title: document.title,
    location: window.location.href,
    images: [...document.querySelectorAll('img')].map((entry) => ({
      src: entry.currentSrc || entry.src,
      alt: entry.alt,
      width: entry.naturalWidth,
      height: entry.naturalHeight,
    })),
    videos: [...document.querySelectorAll('video')].map((entry) => ({
      src: entry.currentSrc || entry.src,
      poster: entry.poster,
    })),
  }))()`);

  const bodies = [];
  for (const hit of networkHits) {
    try {
      const body = await send('Network.getResponseBody', { requestId: hit.requestId });
      bodies.push({ ...hit, body: body.body.slice(0, 60000) });
    } catch (error) {
      bodies.push({ ...hit, error: error.message });
    }
  }

  const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const slug = link.split('/').pop() || `feed-${index}`;
  await writeFile(path.join(outDir, `${slug}.png`), Buffer.from(capture.data, 'base64'));
  report.push({ link, dom, network: bodies });
}

socket.close();
chrome.kill();
await writeFile(path.join(outDir, 'sph-feed.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(report.map((entry) => `${entry.link}\t${entry.dom.title}\t${entry.network.length} api hits`).join('\n'));
