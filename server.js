import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { WebSocketServer, WebSocket } from 'ws';

const PORT = 8080;
const INDEX_HTML = path.join(import.meta.dirname, 'public', 'index.html');

const clients = new Set();

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

  if (req.method === 'GET' && req.url === '/clients') {
    const ids = [...clients].map((c) => c.id);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(ids));
    return;
  }

  res.writeHead(404);
  res.end('not found');
});

const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  ws.id = 'c-' + crypto.randomBytes(2).toString('hex');
  clients.add(ws);
  console.log('connect', ws.id);

  ws.send(JSON.stringify({ type: 'welcome', id: ws.id }));

  ws.on('message', (data) => {
    const text = data.toString();
    console.log('msg', ws.id, Buffer.byteLength(text), 'bytes');

    if (text.startsWith('/all ')) {
      const body = text.slice(5);
      const out = `[${ws.id}] ${body}`;
      for (const c of clients) {
        if (c.readyState === WebSocket.OPEN) c.send(out);
      }
      return;
    }

    ws.send('echo: ' + text);
  });

  ws.on('close', (code, reason) => {
    clients.delete(ws);
    console.log('close', ws.id, code, reason.toString() || '(no reason)');
  });
});

server.listen(PORT, () => {
  console.log(`listening on http://localhost:${PORT}`);
});
