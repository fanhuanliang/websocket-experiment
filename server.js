import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { WebSocketServer } from 'ws';

const PORT = 8080;
const INDEX_HTML = path.join(import.meta.dirname, 'public', 'index.html');

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
    fs.readFile(INDEX_HTML, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('server error');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
    return;
  }
  res.writeHead(404);
  res.end('not found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('connect');

  ws.on('message', (data) => {
    const text = data.toString();
    console.log('msg', Buffer.byteLength(text), 'bytes');
    ws.send('echo: ' + text);
  });

  ws.on('close', (code, reason) => {
    console.log('close', code, reason.toString() || '(no reason)');
  });
});

server.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
