/**
 * Walks the built portfolio to the fifth folder's fourth card and captures it
 * at desktop and phone widths, then checks that the detail button really
 * forwards the active slide's original article URL.
 *
 * Usage: node scripts/qa-projects-articles.mjs <url> <output-dir>
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const [url, outDir] = process.argv.slice(2);
if (!url || !outDir) throw new Error('usage: node scripts/qa-projects-articles.mjs <url> <output-dir>');

const port = 9333;
const chromePath = process.env.CHROME_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(path.join(os.tmpdir(), 'qa-projects-'));

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
    const details = result.exceptionDetails.exception?.description ?? result.exceptionDetails.text;
    throw new Error(`evaluate failed: ${details}`);
  }
  return result.result.value;
};

const shoot = async (name) => {
  const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const file = path.join(outDir, `${name}.png`);
  await writeFile(file, Buffer.from(capture.data, 'base64'));
  return file;
};

/** Captures just one element, so the card can be judged without the page. */
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
  const labels = [...document.querySelectorAll('.sr-controls button')].map((entry) => entry.textContent);
  const button = [...document.querySelectorAll('.sr-controls button')]
    .find((entry) => entry.textContent.includes(${JSON.stringify(label)}));
  if (!button) return false;
  button.click();
  return true;
})()`);

const controlLabels = () => evaluate(
  `[...document.querySelectorAll('.sr-controls button')].map((entry) => entry.textContent)`,
);

const waitUntil = async (expression, timeoutMs = 45000, tickMs = 500) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return true;
    await wait(tickMs);
  }
  return false;
};

const clickSelector = (selector) => evaluate(`(() => {
  const node = document.querySelector(${JSON.stringify(selector)});
  if (!node) return false;
  node.click();
  return true;
})()`);

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
console.log('controls at cover:', await controlLabels());
// The experience ignores input until its preload pass finishes, so retry the
// control until the directory's own controls replace the cover's.
let entered = false;
for (let attempt = 0; attempt < 40 && !entered; attempt += 1) {
  await clickControl('进入作品目录');
  await wait(700);
  entered = await evaluate(
    `[...document.querySelectorAll('.sr-controls button')].some((entry) => entry.textContent.includes('打开'))`,
  );
}
report.steps.push(['enter-directory', entered]);
console.log('controls in directory:', await controlLabels());
report.steps.push(['open-projects', await clickControl('项目经历')]);
await waitUntil(`Boolean(document.querySelector('.projects-page'))`, 15000);
console.log('project page present:', await evaluate(`Boolean(document.querySelector('.projects-page'))`));
report.steps.push(['jump-card-04', await clickSelector('[data-project-jump="3"]')]);
await wait(2400);

// The article button must forward the active slide's original URL.
const linkCheck = await evaluate(`(() => {
  const original = window.open;
  const opened = [];
  window.open = (href) => { opened.push(href); return null; };
  const scene = document.querySelector('[data-project-scene][data-project-index="3"]');
  if (!scene) return { error: 'card 04 is missing' };
  const slides = [...scene.querySelectorAll('[data-project-slide]')];
  const buttons = [...scene.querySelectorAll('[data-project-source="3"]')];
  const results = buttons.map((button) => {
    button.click();
    return {
      label: button.querySelector('.project-aside__link-label')?.textContent ?? '',
      cta: button.querySelector('.project-aside__link-cta')?.textContent ?? '',
      url: opened.at(-1) ?? null,
      highlighted: button.getAttribute('aria-current'),
    };
  });
  window.open = original;
  return {
    buttons: buttons.length,
    results,
    labels: slides.map((slide) => slide.textContent.trim()),
  };
})()`);
report.linkCheck = linkCheck;

const domCheck = await evaluate(`(() => {
  const scene = document.querySelector('[data-project-scene][data-project-index="3"]');
  const tabs = scene.querySelector('.project-card__gallery-tabs');
  const tab = tabs.querySelector('button');
  const tabStyle = getComputedStyle(tab);
  const notes = [...scene.querySelectorAll('.project-card__slide')].map((slide) => ({
    title: slide.querySelector('.project-card__slide-title')?.textContent ?? '',
    meta: slide.querySelector('.project-card__slide-meta')?.textContent ?? '',
    excerpt: (slide.querySelector('.project-card__slide-excerpt')?.textContent ?? '').slice(0, 18),
    image: slide.querySelector('img')?.getAttribute('src') ?? '',
  }));
  return {
    cardTitle: scene.querySelector('.project-card__title')?.textContent ?? '',
    aside: scene.querySelector('.project-aside__text')?.textContent ?? '',
    notes,
    counter: document.querySelector('[data-project-counter]')?.textContent ?? '',
    tabs: {
      box: tabs.getBoundingClientRect().width,
      font: tabStyle.fontSize,
      padding: tabStyle.padding,
      widths: [...tabs.querySelectorAll('button')].map((entry) => Number(entry.getBoundingClientRect().width.toFixed(1))),
    },
    imageFailures: [...document.querySelectorAll('.projects-page img')]
      // The lightbox's viewer image carries no src until it is opened.
      .filter((image) => image.getAttribute('src') && image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  };
})()`);
report.domCheck = domCheck;

const captures = [];
await clickSelector('[data-project-scene][data-project-index="3"] [data-project-slide="0"]');
await wait(900);
captures.push(await shootSelector('[data-project-scene][data-project-index="3"] .project-scene__sticky', 'desktop-card-04-sticky'));
captures.push(await shootSelector('[data-project-scene][data-project-index="3"] .project-card', 'desktop-card-04-slide-01'));
const slideCount = await evaluate(
  `document.querySelectorAll('[data-project-scene][data-project-index="3"] [data-project-slide]').length`,
);
for (let index = 1; index < slideCount; index += 1) {
  await clickSelector(`[data-project-scene][data-project-index="3"] [data-project-slide="${index}"]`);
  await wait(900);
  const slideName = String(index + 1).padStart(2, '0');
  captures.push(await shootSelector(`[data-project-scene][data-project-index="3"] .project-card`, `desktop-card-04-slide-${slideName}`));
}

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await wait(1200);
await clickSelector('[data-project-jump="3"]');
await wait(2400);
report.phoneTabs = await evaluate(`(() => {
  const scene = document.querySelector('[data-project-scene][data-project-index="3"]');
  const tabs = scene.querySelector('.project-card__gallery-tabs');
  const tab = tabs.querySelector('button');
  const style = getComputedStyle(tab);
  return {
    frame: scene.querySelector('.project-card__media').getBoundingClientRect().width,
    box: tabs.getBoundingClientRect().width,
    height: tabs.getBoundingClientRect().height,
    viewport: document.documentElement.clientWidth,
    maxWidth: getComputedStyle(tabs).maxWidth,
    tabsLeft: getComputedStyle(tabs).left,
    wrap: getComputedStyle(tabs).flexWrap,
    gallery: tabs.parentElement.getBoundingClientRect().width,
    font: style.fontSize,
    padding: style.padding,
    whiteSpace: style.whiteSpace,
    widths: [...tabs.querySelectorAll('button')].map((entry) => [
      Number(entry.getBoundingClientRect().width.toFixed(1)),
      Number(entry.getBoundingClientRect().height.toFixed(1)),
      entry.textContent.trim(),
    ]),
  };
})()`);
captures.push(await shoot('phone-card-04-page'));
captures.push(await shootSelector('[data-project-scene][data-project-index="3"] .project-card', 'phone-card-04'));

report.captures = captures;
socket.close();
chrome.kill();
await writeFile(path.join(outDir, 'report.json'), JSON.stringify(report, null, 2), 'utf8');
console.log(JSON.stringify(report, null, 2));
