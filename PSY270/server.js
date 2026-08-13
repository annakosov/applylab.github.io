// Minimal backend for the visual search experiment. Render-ready.
// Stores each session's summary (POST /sessions) and returns all
// stored sessions (GET /sessions) so the client can compute a group average.
//
// LOCAL RUN:
//   npm install
//   npm start
//   -> set BACKEND_URL in the experiment HTML to http://localhost:3001
//
// RENDER DEPLOY:
//   1. Push this folder (server.js, package.json, render.yaml) to a GitHub repo.
//   2. On Render: New -> Blueprint -> point at the repo (uses render.yaml), or
//      New -> Web Service manually with:
//        Build command: npm install
//        Start command: npm start
//   3. Once deployed you'll get a URL like https://your-service.onrender.com
//      -> set that as BACKEND_URL in the experiment HTML (must be https://,
//         since a GitHub Pages/https site can't call an http:// backend).
//
// PERSISTENCE NOTE: Render's free web service tier has an EPHEMERAL filesystem
// -- sessions.json is wiped on every restart/redeploy/idle-spindown. To keep
// data across restarts, attach a Render persistent disk (paid instance type,
// see render.yaml) mounted at /data; DATA_DIR below will use it automatically
// if present. Without a disk, treat this as demo/session-scoped storage only.

const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Use a mounted Render disk if configured (see render.yaml), otherwise
// fall back to a local file next to this script. If DATA_DIR is set but
// isn't actually writable (e.g. no disk attached -- free plan doesn't
// support persistent disks), fall back instead of crashing.
let DATA_DIR = process.env.DATA_DIR || __dirname;
try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  fs.accessSync(DATA_DIR, fs.constants.W_OK);
} catch (err) {
  console.warn(`DATA_DIR "${DATA_DIR}" isn't writable (${err.code}). Falling back to ${__dirname}. ` +
    `If you meant to use a persistent disk, check it's attached in Render (requires a paid instance type).`);
  DATA_DIR = __dirname;
}
const DATA_FILE = path.join(DATA_DIR, 'sessions.json');

// Restrict allowed origins in production by setting ALLOWED_ORIGIN, e.g.
// "https://yourname.github.io". Defaults to allowing any origin.
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin === '*' ? true : allowedOrigin }));
app.use(express.json({ limit: '2mb' }));

function readSessions() {
  if (!fs.existsSync(DATA_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
  } catch (err) {
    console.error('Failed to read sessions.json, returning empty list:', err);
    return [];
  }
}

function writeSessions(sessions) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(sessions, null, 2));
}

// Store one session's summary
app.post('/sessions', (req, res) => {
  const { timestamp, summary } = req.body || {};
  if (!summary || !Array.isArray(summary)) {
    return res.status(400).json({ error: 'Request body must include a "summary" array' });
  }
  const sessions = readSessions();
  sessions.push({ timestamp: timestamp || Date.now(), summary });
  writeSessions(sessions);
  res.status(201).json({ ok: true, totalSessions: sessions.length });
});

// Return every stored session (client computes the group average)
app.get('/sessions', (req, res) => {
  res.json(readSessions());
});

// Render pings the service on startup/health checks -- give it a 200 on both.
app.get('/', (req, res) => res.json({ ok: true, service: 'visual-search-backend' }));
app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`Visual search backend listening on port ${PORT}`);
  console.log(`Data file: ${DATA_FILE}`);
});
