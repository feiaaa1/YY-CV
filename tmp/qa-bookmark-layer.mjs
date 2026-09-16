import { writeFile } from 'node:fs/promises';

const tabs = await fetch('http://127.0.0.1:9226/json/list').then((response) => response.json());
const page = tabs.find((entry) => entry.type === 'page' && entry.url.startsWith('http://127.0.0.1:4174'));
if (!page) throw new Error('Portfolio tab not found');
const socket = new WebSocket(page.webSocketDebuggerUrl);
await new Promise((resolve, reject) => {
  socket.addEventListener('open', resolve, { once: true });
  socket.addEventListener('error', reject, { once: true });
});
let id = 0;
const pending = new Map();
socket.addEventListener('message', (event) => {
  const message = JSON.parse(event.data);
  if (!message.id || !pending.has(message.id)) return;
  const task = pending.get(message.id);
  pending.delete(message.id);
  message.error ? task.reject(new Error(message.error.message)) : task.resolve(message.result);
});
const send = (method, params = {}) => {
  const messageId = ++id;
  socket.send(JSON.stringify({ id: messageId, method, params }));
  return new Promise((resolve, reject) => pending.set(messageId, { resolve, reject }));
};
const evaluate = (expression) => send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const labels = async () => (await evaluate(`[...document.querySelectorAll('button')].map((button) => ({ label: button.textContent?.trim(), current: button.getAttribute('aria-current') }))`)).result.value;
const waitFor = async (label) => {
  for (let attempt = 0; attempt < 100; attempt += 1) {
    if ((await labels()).some((button) => button.label === label)) return;
    await wait(200);
  }
  throw new Error(`Timed out waiting for ${label}: ${JSON.stringify(await labels())}`);
};
const clickControl = async (label, next) => {
  await evaluate(`([...document.querySelectorAll('button')].find((button) => button.textContent?.trim() === ${JSON.stringify(label)}))?.click()`);
  await waitFor(next);
  await wait(1500);
};

await send('Runtime.enable');
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 857, deviceScaleFactor: 1, mobile: false });
await send('Page.reload', { ignoreCache: true });
await waitFor('进入作品目录');
await clickControl('进入作品目录', '打开校园经历');
await clickControl('打开校园经历', '本科');
const shot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile('tmp/bookmarks-between-pages.png', Buffer.from(shot.data, 'base64'));
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 900, y: 450, button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 900, y: 450, button: 'left', clickCount: 1 });
await wait(350);
const forwardShot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile('tmp/bookmarks-forward-midturn.png', Buffer.from(forwardShot.data, 'base64'));
await wait(1150);
const bachelor = await labels();
await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: 450, y: 500, button: 'left', clickCount: 1 });
await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 450, y: 500, button: 'left', clickCount: 1 });
await wait(350);
const backwardShot = await send('Page.captureScreenshot', { format: 'png', fromSurface: true });
await writeFile('tmp/bookmarks-backward-midturn.png', Buffer.from(backwardShot.data, 'base64'));
await wait(1150);
console.log(JSON.stringify({ bachelor, master: await labels() }));
socket.close();
