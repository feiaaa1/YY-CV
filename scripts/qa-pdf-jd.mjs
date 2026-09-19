import { writeFile } from 'node:fs/promises';

const [url, outputPrefix, framesArg = '12'] = process.argv.slice(2);
if (!url || !outputPrefix) throw new Error('usage: node scripts/qa-pdf-jd.mjs <url> <prefix> [frames]');
const frameCount = Number(framesArg);
const targets = await fetch('http://127.0.0.1:9225/json').then((response) => response.json());
const page = targets.find((entry) => entry.type === 'page');
if (!page) throw new Error('No page target');
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
  message.error ? waiter.reject(new Error(message.error.message)) : waiter.resolve(message.result);
});
const send = (method, params = {}) => {
  const id = nextId++;
  socket.send(JSON.stringify({ id, method, params }));
  return new Promise((resolve, reject) => pending.set(id, { resolve, reject }));
};
const evaluate = async (expression) => {
  const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
  if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
  return result.result.value;
};

await Promise.all([send('Page.enable'), send('Runtime.enable')]);
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 1800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: `${url}#page=1&zoom=page-fit` });
await evaluate('new Promise((resolve) => setTimeout(resolve, 2200))');

const captures = [];
for (let index = 0; index < frameCount; index += 1) {
  if (index > 0) {
    await send('Input.dispatchMouseEvent', {
      type: 'mouseWheel',
      x: 720,
      y: 900,
      deltaX: 0,
      deltaY: 900,
    });
    await evaluate('new Promise((resolve) => setTimeout(resolve, 1200))');
  }
  const capture = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
  const outputPath = `${outputPrefix}-frame-${String(index + 1).padStart(2, '0')}.png`;
  await writeFile(outputPath, Buffer.from(capture.data, 'base64'));
  captures.push(outputPath);
}
socket.close();
console.log(JSON.stringify({ captures }, null, 2));
