// Проверка страницы-конвертера: открывает её в Chrome без окна как файл с диска, подаёт CSV
// и сравнивает скачанный data.json с файлом, который на тех же CSV посчитал python3 -I data/build_data.py.
// Запускать после правки шаблона, смены версии Pyodide или пересборки страницы. Нужны Node 22+ и Google Chrome.
// Из корня: node data/check_converter.mjs data/rvb-converter.html deploy/wp-content/rvb-test/data.json transactions-*.csv rents-*.csv
import { spawn } from 'node:child_process';
import { readFileSync, mkdtempSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const [page, expected, ...files] = process.argv.slice(2);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9333;
const profile = mkdtempSync(join(tmpdir(), 'rvb-chrome-'));
const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--no-default-browser-check', 'about:blank'],
  { stdio: 'ignore' });

try {
  let targets;
  for (let i = 0; i < 100 && !targets; i++) { try { targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); } catch { await sleep(100); } }
  const ws = new WebSocket(targets.find(t => t.type === 'page').webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r));
  let seq = 0; const pending = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const id = ++seq; pending.set(id, r); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async expression => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result.result.value;
  const status = () => evaluate(`({ text: document.getElementById('status').textContent, kind: document.getElementById('status').className })`);
  async function waitFor(done, seconds) {
    const start = Date.now();
    for (let s; ; await sleep(250)) {
      if (done(s = await status())) return s;
      if (Date.now() - start > seconds * 1000) throw new Error(`не дождались за ${seconds} с: ${s.text}`);
    }
  }

  await send('Page.navigate', { url: 'file://' + resolve(page) });
  let s = await waitFor(s => s.text.startsWith('Можно') || s.kind === 'stop', 120);
  if (s.kind === 'stop') throw new Error(s.text);
  const { root } = (await send('DOM.getDocument')).result;
  const { nodeId } = (await send('DOM.querySelector', { nodeId: root.nodeId, selector: '#pick' })).result;
  const start = Date.now();
  await send('DOM.setFileInputFiles', { nodeId, files: files.map(f => resolve(f)) });
  s = await waitFor(s => s.kind, 300);
  console.log(`${((Date.now() - start) / 1000).toFixed(1)} с, ${s.text}`);
  if (s.kind !== 'ok') throw new Error('страница не выдала data.json');
  const b64 = await evaluate(`fetch(document.getElementById('download').href).then(r => r.arrayBuffer()).then(b => {
    const u = new Uint8Array(b); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); })`);
  const same = Buffer.from(b64, 'base64').equals(readFileSync(expected));
  console.log(same ? `OK: data.json совпадает с ${expected}` : `ОШИБКА: data.json отличается от ${expected}`);
  process.exitCode = same ? 0 : 1;
  ws.close();
} catch (error) {
  console.error('ОШИБКА:', error.message);
  process.exitCode = 1;
} finally {
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
