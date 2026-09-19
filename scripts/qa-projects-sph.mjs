/**
 * Walks the built portfolio to the fifth folder's sixth card (the 视频号 short
 * films) and checks that every link on the card has its own 查看详情 button and
 * that the button forwards that exact link.
 *
 * Usage: node scripts/qa-projects-sph.mjs <url> <output-dir>
 */
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) throw new Error('usage: node scripts/qa-projects-sph.mjs <url> <output-dir>');

await mkdir(outDir, { recursive: true });

const port = 9335;
const chromePath = process.env.CHROME_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(path.join(os.tmpdir(), 'qa-sph-'));

const chrome = spawn(chromePath, [
  '--headless=new',
  `--remote-debugging-port=${port}`,
  `--user-data-dir=${profile}`,
  '--no-first-run',
  '--no-default-browser-check',
  '--enable-unsafe-swiftshader',
  '--hide-scrollbars',
  '--window-size=1440,1000',
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
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
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

const shoot = async (name) => {
  const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const file = path.join(outDir, `${name}.png`);
  await writeFile(file, Buffer.from(capture.data, 'base64'));
  return file;
};

const shootSelector = async (selector, name) => {
  const rect = await evaluate(`(() => {
    const node = document.querySelector(${JSON.stringify(selector)});
    if (!node) return null;
    const box = node.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  })()`);
  if (!rect) throw new Error(`missing ${selector}`);
  const capture = await send('Page.captureScreenshot', {
    format: 'png',
    captureBeyondViewport: true,
    clip: { ...rect, scale: 1 },
  });
  const file = path.join(outDir, `${name}.png`);
  await writeFile(file, Buffer.from(capture.data, 'base64'));
  return file;
};

const clickControl = (label) => evaluate(`(() => {
  const button = [...document.querySelectorAll('.sr-controls button')]
    .find((entry) => entry.textContent.includes(${JSON.stringify(label)}));
  if (!button) return false;
  button.click();
  return true;
})()`);

const clickSelector = (selector) => evaluate(`(() => {
  const node = document.querySelector(${JSON.stringify(selector)});
  if (!node) return false;
  node.click();
  return true;
})()`);

/** The deck scrolls smoothly, so wait until the card really rests in view. */
const settleOnScene = async (index, timeoutMs = 20000) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const settled = await evaluate(`(() => {
      const sticky = document.querySelector('[data-project-scene][data-project-index="${index}"] .project-scene__sticky');
      if (!sticky) return false;
      const box = sticky.getBoundingClientRect();
      // The card is in place once it covers the middle of the screen.
      return box.height > 100 && box.top < window.innerHeight * 0.5 && box.bottom > window.innerHeight * 0.5;
    })()`);
    if (settled) return true;
    await wait(400);
  }
  return false;
};

await Promise.all([send('Page.enable'), send('Runtime.enable')]);
await send('Emulation.setDeviceMetricsOverride', {
  width: 1440,
  height: 1000,
  deviceScaleFactor: 1,
  mobile: false,
});
await send('Page.navigate', { url });
await wait(4000);

const report = { url, steps: [] };
for (let attempt = 0; attempt < 40; attempt += 1) {
  await clickControl('进入作品目录');
  await wait(700);
  const entered = await evaluate(
    `[...document.querySelectorAll('.sr-controls button')].some((entry) => entry.textContent.includes('打开'))`,
  );
  if (entered) break;
}
report.steps.push(['open-projects', await clickControl('项目经历')]);
await wait(4000);
report.steps.push(['jump-card-06', await clickSelector('[data-project-jump="5"]')]);
report.steps.push(['card-06-settled', await settleOnScene(5)]);
await wait(700);

report.card = await evaluate(`(() => {
  const scene = document.querySelector('[data-project-scene][data-project-index="5"]');
  if (!scene) return { error: 'no sixth card' };
  const links = [...scene.querySelectorAll('[data-project-source]')];
  const original = window.open;
  const opened = [];
  window.open = (href) => { opened.push(href); return null; };
  const picked = [];
  for (const link of links) {
    link.click();
    picked.push({
      label: link.querySelector('.project-aside__link-label')?.textContent ?? '',
      cta: link.querySelector('.project-aside__link-cta')?.textContent ?? '',
      href: opened.at(-1) ?? null,
      slide: link.dataset.projectSourceSlide,
    });
  }
  window.open = original;
  return {
    title: scene.querySelector('.project-card__title')?.textContent ?? '',
    aside: scene.querySelector('.project-aside__text')?.textContent ?? '',
    counter: document.querySelector('[data-project-counter]')?.textContent ?? '',
    buttons: links.length,
    picked,
    linksWrap: getComputedStyle(scene.querySelector('.project-aside__links')).flexWrap,
    notes: [...scene.querySelectorAll('.project-card__slide')].map((slide) => ({
      title: slide.querySelector('.project-card__slide-title')?.textContent ?? '',
      meta: slide.querySelector('.project-card__slide-meta')?.textContent ?? '',
      image: slide.querySelector('img')?.getAttribute('src') ?? '',
    })),
    imageFailures: [...scene.querySelectorAll('img')]
      .filter((image) => image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  };
})()`);

// The deck scrolls an inner container, so a clipped capture reads the wrong
// region; the full viewport is exactly what the visitor is looking at.
report.captures = [await shoot('desktop-card-06-page')];
report.cardRect = await evaluate(`(() => {
  const sticky = document.querySelector('[data-project-scene][data-project-index="5"] .project-scene__sticky');
  const box = sticky.getBoundingClientRect();
  return { top: Math.round(box.top), bottom: Math.round(box.bottom), height: Math.round(box.height), viewport: window.innerHeight };
})()`);

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await wait(1200);
await clickSelector('[data-project-jump="5"]');
await settleOnScene(5);
await wait(700);
report.captures.push(await shoot('phone-card-06-page'));
report.captures.push(await shoot('phone-card-06'));

socket.close();
chrome.kill();
await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
