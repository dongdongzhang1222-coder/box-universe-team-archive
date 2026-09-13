#!/usr/bin/env node
'use strict';

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const STATE_FILE = path.join(DATA_DIR, 'state.json');
const PORT = Number(process.env.PORT || 8767);
const MAX_BODY = 150 * 1024 * 1024;

fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function emptyState() {
  return { likes: 0, comments: [], cases: [], uploads: [] };
}

function readState() {
  try {
    return { ...emptyState(), ...JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) };
  } catch (_) {
    return emptyState();
  }
}

function writeState(state) {
  const temporary = `${STATE_FILE}.tmp`;
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2));
  fs.renameSync(temporary, STATE_FILE);
}

function json(res, status, payload) {
  const body = Buffer.from(JSON.stringify(payload));
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': body.length,
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  res.end(body);
}

function receiveJson(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
      size += chunk.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('文件过大'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
      } catch (_) {
        reject(Object.assign(new Error('请求格式错误'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

function safeName(name) {
  const ext = path.extname(String(name || '')).toLowerCase().replace(/[^.a-z0-9]/g, '').slice(0, 10);
  return `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
}

function saveDataUrl(dataUrl, originalName) {
  const match = String(dataUrl || '').match(/^data:([^;,]+)?;base64,(.+)$/s);
  if (!match) throw Object.assign(new Error('文件数据无效'), { status: 400 });
  const bytes = Buffer.from(match[2], 'base64');
  if (!bytes.length || bytes.length > 110 * 1024 * 1024) {
    throw Object.assign(new Error('文件为空或超过 110 MiB'), { status: 413 });
  }
  const filename = safeName(originalName);
  fs.writeFileSync(path.join(UPLOAD_DIR, filename), bytes);
  return { url: `/uploads/${filename}`, size: bytes.length, type: match[1] || 'application/octet-stream' };
}

function contentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  return ({
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.pdf': 'application/pdf',
    '.mp4': 'video/mp4', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.woff2': 'font/woff2',
  })[ext] || 'application/octet-stream';
}

function serveFile(req, res, filename) {
  let stat;
  try { stat = fs.statSync(filename); } catch (_) { return false; }
  if (!stat.isFile()) return false;
  const isUpload = filename.startsWith(UPLOAD_DIR + path.sep);
  const detectedType = contentType(filename);
  const type = isUpload && /^(text\/html|text\/javascript)/.test(detectedType)
    ? 'application/octet-stream'
    : detectedType;
  const range = req.headers.range;
  const noStore = /\.(?:html|js|css)$/i.test(filename);
  const headers = { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'X-Content-Type-Options': 'nosniff', 'Cache-Control': noStore ? 'no-store' : 'public, max-age=3600' };
  if (range) {
    const match = range.match(/bytes=(\d*)-(\d*)/);
    if (match) {
      const start = match[1] ? Number(match[1]) : 0;
      const end = match[2] ? Math.min(Number(match[2]), stat.size - 1) : stat.size - 1;
      if (start <= end && start < stat.size) {
        res.writeHead(206, { ...headers, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${stat.size}` });
        fs.createReadStream(filename, { start, end }).pipe(res);
        return true;
      }
    }
  }
  res.writeHead(200, { ...headers, 'Content-Length': stat.size });
  fs.createReadStream(filename).pipe(res);
  return true;
}

async function handleApi(req, res, pathname) {
  const state = readState();
  if (pathname === '/api/health' && req.method === 'GET') return json(res, 200, { ok: true });
  if (pathname === '/api/state' && req.method === 'GET') return json(res, 200, { count: state.likes, comments: state.comments.slice(-30) });
  if (pathname === '/api/like' && req.method === 'POST') {
    state.likes += 1; writeState(state); return json(res, 200, { count: state.likes });
  }
  if (pathname === '/api/comments' && req.method === 'POST') {
    const payload = await receiveJson(req);
    const body = String(payload.body || '').replace(/\s+/g, ' ').trim();
    if (!body || body.length > 60) return json(res, 400, { error: '评论需为 1–60 个字符' });
    const comment = { id: Date.now(), body, created_at: new Date().toISOString() };
    state.comments.push(comment); state.comments = state.comments.slice(-200); writeState(state);
    return json(res, 201, { comment });
  }
  if (pathname === '/api/cases' && req.method === 'GET') return json(res, 200, { cases: state.cases });
  if (pathname === '/api/cases/sync' && req.method === 'POST') {
    const payload = await receiveJson(req);
    const incoming = Array.isArray(payload.cases) ? payload.cases.slice(0, 100) : [];
    state.cases = incoming.map(item => {
      const next = { ...item };
      if (String(next.image || '').startsWith('data:')) next.image = saveDataUrl(next.image, `${next.id || 'case'}.jpg`).url;
      return next;
    });
    writeState(state); return json(res, 200, { cases: state.cases });
  }
  if (pathname === '/api/uploads' && req.method === 'GET') {
    return json(res, 200, { uploads: state.uploads });
  }
  if (pathname === '/api/uploads' && req.method === 'POST') {
    const payload = await receiveJson(req);
    const saved = saveDataUrl(payload.data, payload.name);
    const item = {
      id: `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`,
      name: String(payload.name || '未命名文件').slice(0, 180),
      title: String(payload.title || payload.name || '未命名存档').slice(0, 40),
      description: String(payload.description || '').slice(0, 70),
      space: payload.space === 'joy' ? 'joy' : 'idea',
      format: String(payload.format || path.extname(payload.name || '').slice(1) || 'FILE').toUpperCase().slice(0, 12),
      type: saved.type, size: saved.size, url: saved.url, created_at: new Date().toISOString(),
    };
    state.uploads.push(item); state.uploads = state.uploads.slice(-300); writeState(state);
    return json(res, 201, { upload: item });
  }
  const uploadMatch = pathname.match(/^\/api\/uploads\/([^/]+)$/);
  if (uploadMatch && req.method === 'DELETE') {
    const index = state.uploads.findIndex(item => item.id === decodeURIComponent(uploadMatch[1]));
    if (index < 0) return json(res, 404, { error: '文件不存在' });
    const [removed] = state.uploads.splice(index, 1);
    const diskPath = path.join(ROOT, removed.url.replace(/^\//, ''));
    try { fs.unlinkSync(diskPath); } catch (_) {}
    writeState(state); return json(res, 200, { ok: true });
  }
  return json(res, 404, { error: '接口不存在' });
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    if (pathname.startsWith('/api/')) return await handleApi(req, res, pathname);
    if (pathname === '/server.js' || pathname.startsWith('/data/')) {
      return json(res, 404, { error: '页面不存在' });
    }
    const relative = pathname === '/' ? 'index.html' : pathname.replace(/^\/+/, '');
    const filename = path.resolve(ROOT, relative);
    if (!filename.startsWith(ROOT + path.sep) || !serveFile(req, res, filename)) {
      json(res, 404, { error: '页面不存在' });
    }
  } catch (error) {
    if (!res.headersSent) json(res, error.status || 500, { error: error.message || '服务器错误' });
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`BOX UNIVERSE CN 已启动：http://localhost:${PORT}`);
});
