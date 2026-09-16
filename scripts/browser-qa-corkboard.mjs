import { writeFile } from 'node:fs/promises';

const [widthArg, heightArg, outputPath] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
if (!width || !height || !outputPath) {
  throw new Error('usage: node scripts/browser-qa-corkboard.mjs <width> <height> <output.png>');
}

const pages = await fetch('http://127.0.0.1:9222/json').then((response) => response.json());
const page = pages.find((entry) => entry.type === 'page');
if (!page) throw new Error('No Chrome page target found');

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

function send(method, params = {}) {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
}

async function evaluate(expression) {
  const result = await send('Runtime.evaluate', {
    expression,
    awaitPromise: true,
    returnByValue: true,
  });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
}

await send('Page.enable');
await send('Runtime.enable');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 720,
});
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'reduce' }],
});
await send('Page.navigate', { url: 'http://127.0.0.1:4173/' });
await evaluate(`new Promise((resolve) => setTimeout(resolve, 1300))`);

for (const label of ['进入作品目录', '打开实习经历']) {
  const clicked = await evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === ${JSON.stringify(label)});
    if (!button) return {
      clicked: false,
      labels: [...document.querySelectorAll('button')].map((node) => node.textContent?.trim()),
      body: document.body.innerText.slice(0, 800),
      appChildren: document.querySelector('#app')?.childElementCount,
      webgl: Boolean(document.createElement('canvas').getContext('webgl2') ?? document.createElement('canvas').getContext('webgl')),
    };
    button.click();
    return { clicked: true };
  })()`);
  if (!clicked.clicked) throw new Error(`Cannot find ${label}: ${JSON.stringify(clicked.labels)}`);
  await evaluate(`new Promise((resolve) => setTimeout(resolve, 3200))`);
}

await evaluate(`new Promise((resolve) => setTimeout(resolve, 1200))`);
const state = await evaluate(`(() => {
  const canvas = document.querySelector('canvas');
  const gl = canvas?.getContext('webgl2') ?? canvas?.getContext('webgl');
  let nonBlankSamples = 0;
  if (gl && canvas) {
    const pixels = new Uint8Array(4 * 25);
    const stepX = Math.max(1, Math.floor(canvas.width / 5));
    const stepY = Math.max(1, Math.floor(canvas.height / 5));
    for (let y = 0; y < 5; y += 1) {
      for (let x = 0; x < 5; x += 1) {
        const pixel = new Uint8Array(4);
        gl.readPixels(Math.min(canvas.width - 1, x * stepX), Math.min(canvas.height - 1, y * stepY), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        if (pixel[0] + pixel[1] + pixel[2] > 24) nonBlankSamples += 1;
      }
    }
  }
  return {
    title: document.title,
    canvas: canvas ? { width: canvas.width, height: canvas.height, rect: canvas.getBoundingClientRect().toJSON() } : null,
    buttons: [...document.querySelectorAll('button')].map((node) => node.textContent?.trim()),
    semanticText: document.querySelector('.sr-controls')?.textContent?.replace(/\\s+/g, ' ').trim(),
    nonBlankSamples,
  };
})()`);
const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile(outputPath, Buffer.from(capture.data, 'base64'));
const closeResult = await evaluate(`(() => {
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === '关闭详情');
  button?.click();
  return Boolean(button);
})()`);
await evaluate(`new Promise((resolve) => setTimeout(resolve, 500))`);
state.closeInteraction = {
  clicked: closeResult,
  buttonsAfterClose: await evaluate(`[...document.querySelectorAll('button')].map((node) => node.textContent?.trim())`),
};
socket.close();
console.log(JSON.stringify({ viewport: { width, height }, outputPath, state }, null, 2));
