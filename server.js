const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

// ─── Config ───────────────────────────────────────────────────────────────────
// Change these credentials before deploying!
const USERS = {
  'boy': '1234',   // Edit these
  'girl': '1234'    // Edit these
};

// Store messages in memory + persist to file
const DATA_FILE = path.join(__dirname, 'messages.json');
let messages = [];
if (fs.existsSync(DATA_FILE)) {
  try { messages = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { }
}

function saveMessages() {
  fs.writeFileSync(DATA_FILE, JSON.stringify(messages.slice(-500))); // keep last 500
}

// ─── Upload Setup ─────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public/uploads')),
  filename: (req, file, cb) => cb(null, uuidv4() + path.extname(file.originalname))
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|mp4|mov|pdf/;
    cb(null, allowed.test(path.extname(file.originalname).toLowerCase()));
  }
});

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Auth ─────────────────────────────────────────────────────────────────────
const sessions = new Map(); // token -> username

app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (USERS[username] && USERS[username] === password) {
    const token = uuidv4();
    sessions.set(token, username);
    res.json({ success: true, token, username });
  } else {
    // Delay to slow brute force
    setTimeout(() => res.status(401).json({ success: false }), 1000);
  }
});

app.post('/api/logout', (req, res) => {
  const token = req.headers['x-auth-token'];
  sessions.delete(token);
  res.json({ success: true });
});

function authMiddleware(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token || !sessions.has(token)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  req.username = sessions.get(token);
  next();
}

// ─── Messages API ─────────────────────────────────────────────────────────────
app.get('/api/messages', authMiddleware, (req, res) => {
  res.json(messages);
});

app.post('/api/upload', authMiddleware, upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file' });
  res.json({ url: '/uploads/' + req.file.filename, name: req.file.originalname });
});

// ─── WebSocket ────────────────────────────────────────────────────────────────
const clients = new Map(); // ws -> username

wss.on('connection', (ws) => {
  ws.on('message', (data) => {
    try {
      const msg = JSON.parse(data);

      // Auth handshake
      if (msg.type === 'auth') {
        if (sessions.has(msg.token)) {
          const username = sessions.get(msg.token);
          clients.set(ws, username);
          ws.send(JSON.stringify({ type: 'auth_ok', username }));
          // Send online status to others
          broadcast({ type: 'presence', username, online: true }, ws);
        } else {
          ws.close();
        }
        return;
      }

      // Only authenticated clients past here
      const username = clients.get(ws);
      if (!username) return;

      if (msg.type === 'message') {
        const newMsg = {
          id: uuidv4(),
          from: username,
          text: msg.text || '',
          media: msg.media || null,
          mediaType: msg.mediaType || null,
          timestamp: Date.now(),
          read: false
        };
        messages.push(newMsg);
        saveMessages();
        // Broadcast to ALL clients (including sender for confirmation)
        broadcastAll({ type: 'message', message: newMsg });
      }

      if (msg.type === 'typing') {
        broadcast({ type: 'typing', username, isTyping: msg.isTyping }, ws);
      }

      if (msg.type === 'read') {
        messages.forEach(m => { if (m.from !== username) m.read = true; });
        saveMessages();
        broadcast({ type: 'read_receipt' }, ws);
      }

      if (msg.type === 'delete') {
        const idx = messages.findIndex(m => m.id === msg.id && m.from === username);
        if (idx !== -1) {
          messages.splice(idx, 1);
          saveMessages();
          broadcastAll({ type: 'deleted', id: msg.id });
        }
      }

    } catch (e) { }
  });

  ws.on('close', () => {
    const username = clients.get(ws);
    if (username) broadcast({ type: 'presence', username, online: false }, ws);
    clients.delete(ws);
  });
});

function broadcast(data, excludeWs) {
  const str = JSON.stringify(data);
  clients.forEach((_, ws) => {
    if (ws !== excludeWs && ws.readyState === WebSocket.OPEN) ws.send(str);
  });
}

function broadcastAll(data) {
  const str = JSON.stringify(data);
  clients.forEach((_, ws) => {
    if (ws.readyState === WebSocket.OPEN) ws.send(str);
  });
}

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`\n🔒 Phantom Messenger running on http://localhost:${PORT}`);
  console.log(`   Open this in two browser windows to test\n`);
  console.log(`   Users configured in server.js → USERS object`);
  console.log(`   Edit usernames/passwords before deploying!\n`);
});
