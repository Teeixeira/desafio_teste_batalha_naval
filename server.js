import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT) || 3000;
const files = new Map([
  ['/', ['index.html', 'text/html; charset=utf-8']],
  ['/index.html', ['index.html', 'text/html; charset=utf-8']],
  ['/browser.js', ['browser.js', 'text/javascript; charset=utf-8']],
  ['/styles.css', ['styles.css', 'text/css; charset=utf-8']],
  ['/src/jogo.js', ['src/jogo.js', 'text/javascript; charset=utf-8']]
]);

createServer(async (req, res) => {
  const path = new URL(req.url, 'http://localhost').pathname;
  const file = files.get(path);
  if (!file) { res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Não encontrado'); return; }
  try {
    const content = await readFile(join(root, file[0]));
    res.writeHead(200, { 'content-type': file[1], 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' });
    res.end(content);
  } catch {
    res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); res.end('Não foi possível carregar o jogo.');
  }
}).listen(port, '127.0.0.1', () => {
  console.log(`Batalha Naval disponível em http://127.0.0.1:${port}`);
});

