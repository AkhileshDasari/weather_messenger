#   Weather_Messenger

A private, self-hosted 2-person messenger with a disguised login page.

---

## 🚀 Quick Start

### 1. Install Node.js
Download from https://nodejs.org (v18+ recommended)

### 2. Install dependencies
```bash
cd phantom-messenger
npm install
```

### 3. Set your credentials
Open `server.js` and find the USERS object near the top:

```js
const USERS = {
  'alice': 'my_secret_pass_123',   // ← Change these!
  'bob':   'another_pass_456'      // ← Change these!
};
```

Replace `alice`, `bob`, and the passwords with your own.

### 4. Run the server
```bash
node server.js
```

The server starts at **http://localhost:3000**

---

## 🕵️ How to Access the Messenger

The page looks like a **weather app** to anyone who stumbles onto it.

### To reveal the login form:
**Option A:** Click the **bottom-right corner** of the weather card **3 times**

**Option B:** Type the word **`phantom`** anywhere on the weather screen (keyboard)

Then enter your username and password.

---

## ✨ Features

- **Real-time messaging** via WebSockets
- **Image upload** (tap 📎)
- **Camera capture** (tap 📷) — takes a photo and sends it
- **Emoji panel** (tap 😊)
- **Typing indicators** — shows when the other person is typing
- **Online/offline presence**
- **Delete your messages**
- **Image lightbox** — tap any received image to enlarge
- **Auto-reconnect** if connection drops
- **Message persistence** — messages saved to `messages.json`
- **Session tokens** — stays logged in across page refreshes

---

## 🌐 Running on a Network / VPS

To access from another device on the same WiFi:

```bash
node server.js
# Then open: http://YOUR_LOCAL_IP:3000
# e.g. http://192.168.1.100:3000
```

For internet access, deploy on a VPS (DigitalOcean, Linode, etc.) and run:
```bash
PORT=80 node server.js
# or use a reverse proxy like nginx
```

---

## 🔐 Security Notes

- Change the default usernames and passwords in `server.js` before use
- For internet deployment, use HTTPS (via nginx + Let's Encrypt)
- Messages are stored locally in `messages.json`
- Uploaded files are in `public/uploads/`

---

## 📁 File Structure

```
phantom-messenger/
├── server.js          ← Main server (edit USERS here)
├── package.json
├── messages.json      ← Auto-created, stores message history
└── public/
    ├── index.html     ← The disguised weather + messenger UI
    └── uploads/       ← Uploaded images/files stored here
```
