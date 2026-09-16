import { writeFile } from 'node:fs/promises';

const [widthArg, heightArg, outputPath, baseUrl = 'http://127.0.0.1:4176/'] = process.argv.slice(2);
const width = Number(widthArg);
const height = Number(heightArg);
if (!width || !height || !outputPath) {
  throw new Error('usage: node scripts/browser-qa-loading.mjs <width> <height> <output.png> [url]');
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
const consoleErrors = [];
const networkFailures = [];
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (message.method === 'Runtime.consoleAPICalled' && message.params.type === 'error') {
    consoleErrors.push(message.params.args.map((arg) => arg.value ?? arg.description).join(' '));
  }
  if (message.method === 'Network.loadingFailed') networkFailures.push(message.params.errorText);
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

await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable')]);
await send('Network.clearBrowserCache');
await send('Emulation.setDeviceMetricsOverride', {
  width,
  height,
  deviceScaleFactor: 1,
  mobile: width < 720,
});
await send('Emulation.setEmulatedMedia', {
  features: [{ name: 'prefers-reduced-motion', value: 'no-preference' }],
});
await send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 120,
  downloadThroughput: 1_500_000,
  uploadThroughput: 750_000,
  connectionType: 'cellular3g',
});
await send('Page.navigate', { url: baseUrl });

await evaluate(`new Promise((resolve) => setTimeout(resolve, 300))`);
const loadingState = await evaluate(`(() => ({
  busy: document.querySelector('#app')?.getAttribute('aria-busy'),
  visible: document.querySelector('.scene-loader')?.dataset.visible,
  label: document.querySelector('.scene-loader__label')?.textContent,
}))()`);
const loadingCapture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
const loadingOutputPath = outputPath.replace(/\.png$/i, '-loading.png');
await writeFile(loadingOutputPath, Buffer.from(loadingCapture.data, 'base64'));

await evaluate(`new Promise((resolve, reject) => {
  const started = performance.now();
  const poll = () => {
    if (document.querySelector('#app')?.getAttribute('aria-busy') === 'false') return resolve();
    if (performance.now() - started > 60000) return reject(new Error('Initial loading timed out'));
    setTimeout(poll, 100);
  };
  poll();
})`);

const initialResources = await evaluate(`performance.getEntriesByType('resource').map((entry) => ({
  name: entry.name,
  transferSize: entry.transferSize,
  duration: entry.duration,
}))`);
await evaluate(`performance.clearResourceTimings()`);

const directoryFrames = await evaluate(`new Promise((resolve, reject) => {
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === '进入作品目录');
  if (!button) return reject(new Error('Enter-directory button not found'));
  const gaps = [];
  let previous = performance.now();
  const started = previous;
  const sample = (now) => {
    gaps.push(now - previous);
    previous = now;
    if (now - started < 1800) requestAnimationFrame(sample);
    else resolve(gaps);
  };
  button.click();
  requestAnimationFrame(sample);
})`);
await evaluate(`new Promise((resolve) => setTimeout(resolve, 250))`);

const directoryResources = await evaluate(`performance.getEntriesByType('resource').map((entry) => ({
  name: entry.name,
  transferSize: entry.transferSize,
  duration: entry.duration,
}))`);
const directoryState = await evaluate(`(() => ({
  buttons: [...document.querySelectorAll('button')].map((node) => node.textContent?.trim()),
  busy: document.querySelector('#app')?.getAttribute('aria-busy'),
  loaderVisible: document.querySelector('.scene-loader')?.dataset.visible,
}))()`);

const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile(outputPath, Buffer.from(capture.data, 'base64'));

await evaluate(`performance.clearResourceTimings()`);
const detailFrames = await evaluate(`new Promise((resolve, reject) => {
  const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.trim() === '打开实习经历');
  if (!button) return reject(new Error('Internship button not found'));
  const gaps = [];
  let previous = performance.now();
  const started = previous;
  const sample = (now) => {
    gaps.push(now - previous);
    previous = now;
    if (now - started < 1800) requestAnimationFrame(sample);
    else resolve(gaps);
  };
  button.click();
  requestAnimationFrame(sample);
})`);
await evaluate(`new Promise((resolve) => setTimeout(resolve, 250))`);
const detailResources = await evaluate(`performance.getEntriesByType('resource').map((entry) => ({
  name: entry.name,
  transferSize: entry.transferSize,
  duration: entry.duration,
}))`);
const detailCapture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
const detailOutputPath = outputPath.replace(/\.png$/i, '-detail.png');
await writeFile(detailOutputPath, Buffer.from(detailCapture.data, 'base64'));

const summarizeFrames = (frames) => {
  const sorted = [...frames].sort((a, b) => a - b);
  const percentile = (ratio) => sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * ratio))];
  return {
    sampledFrames: frames.length,
    medianFrameMs: percentile(0.5),
    p95FrameMs: percentile(0.95),
    maxFrameMs: Math.max(...frames),
  };
};
const report = {
  viewport: { width, height },
  loadingState,
  initialLoad: {
    resourceCount: initialResources.length,
    imageCount: initialResources.filter((entry) => /\.(webp|png)(?:$|\?)/.test(entry.name)).length,
    pngCount: initialResources.filter((entry) => /\.png(?:$|\?)/.test(entry.name)).length,
    transferredImageBytes: initialResources
      .filter((entry) => /\.(webp|png)(?:$|\?)/.test(entry.name))
      .reduce((total, entry) => total + entry.transferSize, 0),
    longestResourceMs: Math.max(0, ...initialResources.map((entry) => entry.duration)),
  },
  directoryAnimation: {
    ...summarizeFrames(directoryFrames),
    resourceEntriesDuringEntrance: directoryResources.length,
    transferredBytesDuringEntrance: directoryResources.reduce((total, entry) => total + entry.transferSize, 0),
    resourcesDuringEntrance: directoryResources,
  },
  detailAnimation: {
    ...summarizeFrames(detailFrames),
    resourceEntriesDuringEntrance: detailResources.length,
    transferredBytesDuringEntrance: detailResources.reduce((total, entry) => total + entry.transferSize, 0),
    resourcesDuringEntrance: detailResources,
  },
  directoryState,
  consoleErrors,
  networkFailures,
  outputPath,
  loadingOutputPath,
  detailOutputPath,
};

socket.close();
console.log(JSON.stringify(report, null, 2));
