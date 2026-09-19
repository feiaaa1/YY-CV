/**
 * Walks the built portfolio to the fifth folder's fifth card (the Kuaishou AI
 * visual gallery) and checks that its eight stills switch cleanly: one tab row,
 * no overlap with the media badge, and the detail button forwarding the still
 * that is on screen.
 *
 * Usage: node scripts/qa-projects-kuaishou.mjs <url> <output-dir>
 */
import { mkdtemp, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';

const [url, outDir, cardArg, slideArg] = process.argv.slice(2);
if (!url || !outDir) throw new Error('usage: node scripts/qa-projects-kuaishou.mjs <url> <output-dir>');

const port = 9400 + Math.floor(Math.random() * 400);
const cardIndex = Number(cardArg ?? 4);
const slideCount = Number(slideArg ?? 8);
const chromePath = process.env.CHROME_PATH
  ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const profile = await mkdtemp(path.join(os.tmpdir(), 'qa-kuaishou-'));

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

const shootSelector = async (selector, name) => {
  const present = await evaluate(`Boolean(document.querySelector(${JSON.stringify(selector)}))`);
  if (!present) {
    const state = await evaluate(`({
      href: location.href,
      ready: document.readyState,
      appChildren: document.querySelector('#app')?.childElementCount ?? -1,
      scenes: document.querySelectorAll('[data-project-scene]').length,
      page: Boolean(document.querySelector('.projects-page')),
      body: document.body.innerText.slice(0, 120),
    })`);
    throw new Error(`missing ${selector} :: ${JSON.stringify(state)}`);
  }
  const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
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

const waitUntil = async (expression, timeoutMs = 20000, tickMs = 500) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await evaluate(expression)) return true;
    await wait(tickMs);
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
let entered = false;
for (let attempt = 0; attempt < 40 && !entered; attempt += 1) {
  await clickControl('进入作品目录');
  await wait(700);
  entered = await evaluate(
    `[...document.querySelectorAll('.sr-controls button')].some((entry) => entry.textContent.includes('打开'))`,
  );
}
report.steps.push(['enter-directory', entered]);
report.steps.push(['open-projects', await clickControl('项目经历')]);
await waitUntil(`Boolean(document.querySelector('.projects-page'))`, 15000);
report.steps.push(['jump-card-05', await clickSelector(`[data-project-jump="${cardIndex}"]`)]);
await wait(2400);

const scene = `[data-project-scene][data-project-index="${cardIndex}"]`;
const layoutProbe = `(() => {
  const scene = document.querySelector('${scene}');
  if (!scene) return { error: 'scene missing' };
  const tabs = scene.querySelector('.project-card__gallery-tabs');
  const badge = scene.querySelector('.project-card__slide[data-active="true"] .project-card__media-badge');
  const frame = scene.querySelector('.project-card__media');
  const chips = [...scene.querySelectorAll('[data-project-slide]')];
  const tabsBox = tabs?.getBoundingClientRect();
  const badgeBox = badge?.getBoundingClientRect();
  const frameBox = frame?.getBoundingClientRect();
  const lastChip = chips.at(-1)?.getBoundingClientRect();
  return {
    title: scene.querySelector('.project-card__title')?.textContent ?? '',
    counter: document.querySelector('[data-project-counter]')?.textContent ?? '',
    slides: scene.querySelectorAll('[data-project-media-slide]').length,
    tabs: chips.map((node) => node.textContent.trim()),
    action: scene.querySelector('[data-project-action-label]')?.textContent ?? '',
    tabHeight: tabsBox ? Math.round(tabsBox.height) : null,
    tabsWrap: tabs ? getComputedStyle(tabs).flexWrap : null,
    tabRows: chips
      .map((node) => Math.round(node.getBoundingClientRect().top))
      .filter((top, index, all) => all.indexOf(top) === index),
    badgeOverlapsTabs: tabsBox && badgeBox
      ? !(tabsBox.right <= badgeBox.left
        || tabsBox.left >= badgeBox.right
        || tabsBox.bottom <= badgeBox.top
        || tabsBox.top >= badgeBox.bottom)
      : null,
    everyChipInsideFrame: Boolean(frameBox && chips.every((chip) => {
      const box = chip.getBoundingClientRect();
      return box.left >= frameBox.left - 1 && box.right <= frameBox.right + 1
        && box.top >= frameBox.top - 1 && box.bottom <= frameBox.bottom + 1;
    })),
    lastChipInsideFrame: Boolean(frameBox && lastChip
      && lastChip.right <= frameBox.right + 1 && lastChip.bottom <= frameBox.bottom + 1),
    imageFailures: [...document.querySelectorAll('.projects-page img')]
      .filter((image) => image.getAttribute('src') && image.complete && image.naturalWidth === 0)
      .map((image) => image.getAttribute('src')),
  };
})()`;
report.desktop = await evaluate(layoutProbe);

// Every slide must stay reachable, switch the visible still and hand the
// detail button the source of the picture that is on screen.
if (!await waitUntil(`Boolean(document.querySelector('${scene}'))`, 8000)) {
  await clickSelector(`[data-project-jump="${cardIndex}"]`);
  await wait(1800);
}
report.walk = await evaluate(`(() => {
  const scene = document.querySelector('${scene}');
  if (!scene) return { error: 'scene missing' };
  const original = window.open;
  const opened = [];
  if (!scene.querySelector('[data-project-preview="${cardIndex}"]')) return { error: 'no preview button' };
  window.open = (href) => { opened.push(href); return null; };
  const button = scene.querySelector('[data-project-preview="${cardIndex}"]');
  const results = [];
  for (let index = 0; index < ${slideCount}; index += 1) {
    scene.querySelector('[data-project-slide="' + index + '"]').click();
    const active = scene.querySelector('[data-project-media-slide][data-active="true"]');
    button.click();
    const lightbox = document.querySelector('[data-project-lightbox-image]');
    results.push({
      index,
      active: active?.dataset.projectMediaSlide ?? null,
      src: active?.querySelector('img')?.getAttribute('src') ?? null,
      opened: opened.at(-1) ?? null,
      shown: lightbox?.getAttribute('src') ?? null,
      label: scene.querySelector('[data-project-action-label]')?.textContent ?? '',
    });
    document.querySelector('[data-project-lightbox-close]')?.click();
  }
  window.open = original;
  return results;
})()`);
report.walkOk = Array.isArray(report.walk) && report.walk.every((step) => (
  String(step.index) === step.active
  && (step.opened === step.src || step.shown === step.src)
  && step.label === '查看大图'
));

// Clicking a picture, or its own button in the aside, must print it large.
report.lightbox = await evaluate(`(() => {
  const scene = document.querySelector('${scene}');
  const box = document.querySelector('[data-project-lightbox]');
  const image = document.querySelector('[data-project-lightbox-image]');
  const counter = document.querySelector('[data-project-lightbox-counter]');
  const steps = [];
  const state = () => ({
    visible: box.dataset.visible === 'true',
    src: image.getAttribute('src'),
    counter: counter.textContent,
    natural: [image.naturalWidth, image.naturalHeight],
    shown: [Math.round(image.getBoundingClientRect().width), Math.round(image.getBoundingClientRect().height)],
  });

  // 1. The picture on screen opens itself.
  scene.querySelector('[data-project-slide="0"]').click();
  scene.querySelector('[data-project-media-slide="0"] [data-project-still]').click();
  steps.push({ from: 'picture', ...state() });

  // 2. A quick button opens another still without touching the tabs.
  const quick = scene.querySelector('[data-project-zoom-slide="6"]');
  quick.click();
  steps.push({ from: 'quick-button', ...state(), activeSlide: scene.querySelector('[data-project-media-slide][data-active="true"]').dataset.projectMediaSlide });

  // 3. The viewer's own arrows and Escape.
  if (box.dataset.visible === 'true') {
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight' }));
    steps.push({ from: 'arrow-right', ...state() });
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    steps.push({ from: 'escape', ...state() });
  } else {
    steps.push({ from: 'keyboard-skipped', ...state() });
  }

  // 4. The backdrop closes as well.
  if (box.dataset.visible === 'false') {
    scene.querySelector('[data-project-media-slide="1"] [data-project-still]').click();
    box.click();
    steps.push({ from: 'backdrop', ...state() });
  }

  return {
    steps,
    quickButtons: scene.querySelectorAll('[data-project-zoom]').length,
    stillButtons: scene.querySelectorAll('[data-project-still]').length,
  };
})()`);

const captures = [];
// A stray Escape in the middle of a run can drop the deck back to the
// directory, so the capture pass re-enters it when that happens.
if (!await evaluate(`Boolean(document.querySelector('${scene}'))`)) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    if (await evaluate(`Boolean(document.querySelector('${scene}'))`)) break;
    await clickControl('进入作品目录');
    await wait(600);
    await clickControl('项目经历');
    await wait(900);
  }
  await waitUntil(`Boolean(document.querySelector('${scene}'))`, 8000);
  await clickSelector(`[data-project-jump="${cardIndex}"]`);
  await wait(1800);
}
for (const index of [0, 1, 2, 3, 5, 7]) {
  await clickSelector(`${scene} [data-project-slide="${index}"]`);
  await wait(700);
  captures.push(await shootSelector(`${scene} .project-card`, `desktop-card-05-slide-0${index + 1}`));
}
captures.push(await shootSelector(`${scene} .project-scene__sticky`, 'desktop-card-05-sticky'));

// The enlarged view of a landscape still and of a portrait poster.
for (const index of [0, 1]) {
  await clickSelector(`${scene} [data-project-zoom-slide="${index}"]`);
  await wait(900);
  captures.push(await shootSelector('[data-project-lightbox-image]', `desktop-card-05-lightbox-0${index + 1}`));
  await clickSelector('[data-project-lightbox-close]');
  await wait(400);
}

// The hand-over: the card that leaves recedes smaller while the next one
// arrives from the front, bigger than its resting size. The deck is scrolled
// with real wheel events so it moves exactly as it does for a reader.
await clickSelector('[data-project-jump="0"]');
await wait(1600);
for (let tick = 0; tick < 5; tick += 1) {
  await send('Input.dispatchMouseEvent', {
    type: 'mouseWheel',
    x: 720,
    y: 520,
    deltaX: 0,
    deltaY: 150,
  });
  await wait(120);
}
await wait(700);
report.transition = await evaluate(`(() => {
  const scroll = document.querySelector('[data-projects-scroll]');
  const scenes = [...document.querySelectorAll('[data-project-scene]')];
  const read = (index) => {
    const card = document.querySelector('[data-project-scene][data-project-index="' + index + '"] [data-project-card]');
    const matrix = new DOMMatrixReadOnly(getComputedStyle(card).transform);
    return {
      scale: Number(matrix.a.toFixed(4)),
      y: Number(matrix.f.toFixed(1)),
      opacity: Number(Number(getComputedStyle(card).opacity).toFixed(3)),
    };
  };
  return {
    incoming: read(1),
    outgoing: read(0),
    scrollTop: Math.round(scroll.scrollTop),
    rest: scenes.map((scene) => Math.round(
      scene.offsetTop - Number.parseFloat(getComputedStyle(scene.querySelector('.project-scene__sticky')).top),
    )),
    cardHeights: scenes.map((scene) => Math.round(scene.querySelector('[data-project-card]').offsetHeight)),
  };
})()`);
captures.push(await shootSelector('[data-project-scene][data-project-index="1"] .project-card', 'desktop-transition'));

await send('Emulation.setDeviceMetricsOverride', {
  width: 390,
  height: 844,
  deviceScaleFactor: 2,
  mobile: true,
});
await wait(1200);
await clickSelector(`[data-project-jump="${cardIndex}"]`);
await wait(2400);
captures.push(await shootSelector(`${scene} .project-card`, 'phone-card-05'));
report.phone = await evaluate(layoutProbe);

report.captures = captures;
socket.close();
chrome.kill();
console.log(JSON.stringify(report, null, 2));
