const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const server = http.createServer((req, res) => {
  const url = (req.url || '/').split('?')[0];
  if (url === '/' || url === '/index.html') {
    fs.readFile(path.join(ROOT, 'index.html'), (err, buf) => {
      if (err) {
        res.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
        res.end('index.html bulunamadi');
        return;
      }
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
      res.end(buf);
    });
    return;
  }
  if (url === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' });
    res.end('ok');
    return;
  }
  if (url === '/favicon.ico') {
    res.writeHead(204);
    res.end();
    return;
  }
  res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
  res.end('not found');
});

const wss = new WebSocketServer({ server });
const rooms = new Map();
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function newCode() {
  let c;
  do {
    c = Array.from({ length: 4 }, () => CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]).join('');
  } while (rooms.has(c));
  return c;
}

function send(ws, o) {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(o));
}

function partnerOf(ws) {
  const r = rooms.get(ws.room);
  if (!r) return null;
  return ws.role === 'host' ? r.guest : r.host;
}

wss.on('connection', (ws) => {
  ws.room = null;
  ws.role = null;
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let d;
    try { d = JSON.parse(raw); } catch (e) { return; }

    if (d.t === 'create') {
      if (ws.room) return;
      const code = newCode();
      rooms.set(code, { host: ws, guest: null });
      ws.room = code;
      ws.role = 'host';
      send(ws, { t: 'room', code, role: 'host' });
      return;
    }

    if (d.t === 'join') {
      const code = String(d.code || '').toUpperCase().trim();
      const r = rooms.get(code);
      if (!r) { send(ws, { t: 'err', m: 'Oda bulunamadi. Kodu kontrol et.' }); return; }
      if (r.guest) { send(ws, { t: 'err', m: 'Oda dolu.' }); return; }
      if (r.host === ws) { send(ws, { t: 'err', m: 'Kendi odana katilamazsin.' }); return; }
      r.guest = ws;
      ws.room = code;
      ws.role = 'guest';
      send(ws, { t: 'room', code, role: 'guest' });
      send(r.host, { t: 'peer', ev: 'join' });
      return;
    }

    if (d.t === 'relay') {
      const p = partnerOf(ws);
      if (p) send(p, { t: 'relay', d: d.d });
    }
  });

  ws.on('close', () => {
    const r = rooms.get(ws.room);
    if (!r) return;
    const other = ws.role === 'host' ? r.guest : r.host;
    if (ws.role === 'host') {
      rooms.delete(ws.room);
      if (other) send(other, { t: 'peer', ev: 'leave' });
    } else {
      r.guest = null;
      if (other) send(other, { t: 'peer', ev: 'leave' });
    }
  });
});

const heartbeat = setInterval(() => {
  for (const ws of wss.clients) {
    if (ws.isAlive === false) { ws.terminate(); continue; }
    ws.isAlive = false;
    ws.ping();
  }
}, 30000);
wss.on('close', () => clearInterval(heartbeat));

server.listen(PORT, () => console.log('Seathopya server on ' + PORT));
