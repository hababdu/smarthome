import http from 'node:http';
import path from 'node:path';
import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createRequire } from 'node:module';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { GoogleGenAI } from '@google/genai';

const require = createRequire(import.meta.url);
const cfg = require('./backend/src/config.js');
const store = require('./backend/src/store.js');
const broker = require('./backend/src/broker.js');
const devices = require('./backend/src/devices.js');
const scenes = require('./backend/src/scenes.js');
const scheduler = require('./backend/src/scheduler.js');
const energy = require('./backend/src/energy.js');
const voice = require('./backend/src/voice.js');
const simulator = require('./backend/src/simulator.js');

// Create the external AI client lazily so the server can run without an AI key.
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY sozlanmagan');
  return new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'smarthome-assistant' } } });
};

// Load database store
store.db;

// Start MQTT broker
broker.startBroker();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb', strict: true }));
app.use(express.urlencoded({ extended: true, limit: '64kb', parameterLimit: 100 }));

// This API-token scheme is suitable only for a trusted LAN/demo. A production
// deployment should replace it with per-user authentication and authorization.
const safeTokenEqual = (provided: string, expected: string) => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};
const auth = (req: Request, res: Response, next: NextFunction) => {
  if (!cfg.apiToken) return res.status(503).json({ error: 'server_auth_not_configured' });
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!match || !safeTokenEqual(match[1].trim(), cfg.apiToken)) return res.status(401).json({ error: 'unauthorized' });
  next();
};

const rateBuckets = new Map<string, { count: number; resetAt: number }>();
const rateLimit = (limit: number, windowMs: number) => (req: Request, res: Response, next: NextFunction) => {
  const now = Date.now();
  const key = `${req.ip}:${req.path}`;
  let bucket = rateBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) { bucket = { count: 0, resetAt: now + windowMs }; rateBuckets.set(key, bucket); }
  bucket.count += 1;
  res.setHeader('RateLimit-Limit', String(limit));
  res.setHeader('RateLimit-Remaining', String(Math.max(0, limit - bucket.count)));
  if (bucket.count > limit) return res.status(429).json({ error: 'rate_limit_exceeded' });
  next();
};

// Short-lived one-time tickets avoid putting the long-lived API token in the WS URL.
const wsTickets = new Map<string, number>();
setInterval(() => { const now = Date.now(); for (const [ticket, expires] of wsTickets) if (expires <= now) wsTickets.delete(ticket); }, 30000).unref();

// Health endpoint
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// API router
app.post('/api/ws-ticket', auth, (_req, res) => {
  const ticket = randomBytes(32).toString('hex');
  wsTickets.set(ticket, Date.now() + 30000);
  res.json({ ticket, expiresIn: 30 });
});

app.get('/api/home', auth, (_req, res) => {
  res.json(devices.snapshot());
});

app.post('/api/devices/:id/power', auth, rateLimit(30, 60000), (req, res) => {
  if (typeof req.body?.on !== 'boolean') return res.status(400).json({ error: 'on_must_be_boolean' });
  try {
    const result = devices.setPower(req.params.id, req.body.on);
    res.status(202).json({ ...result, state: devices.snapshot() });
  } catch (e: any) {
    const message = String(e?.message || 'device_command_failed');
    const status = message.startsWith('unknown device') ? 404 : 409;
    res.status(status).json({ error: message });
  }
});

app.get('/api/energy', auth, (req, res) => {
  const lang = req.query.lang === 'ru' ? 'ru' : 'uz';
  const rep = energy.report(store.db.samples, cfg.tariff);
  res.json({ ...rep, tips: energy.tips(rep, store.db.devices, lang) });
});

app.get('/api/scenes', auth, (_req, res) => {
  res.json(scenes.list());
});

app.post('/api/scenes/:id/run', auth, (req, res) => {
  try {
    scenes.run(req.params.id);
    res.json({ ok: true, message: `Scene ${req.params.id} executed` });
  } catch (e: any) {
    const message = String(e?.message || 'scene_failed');
    res.status(message === 'unknown scene' ? 404 : 409).json({ error: message });
  }
});

app.get('/api/schedules', auth, (_req, res) => {
  res.json(scheduler.list());
});

app.post('/api/schedules', auth, (req, res) => {
  try {
    const item = scheduler.add(req.body);
    res.json(item);
  } catch (e: any) {
    res.status(400).json({ error: e.message });
  }
});

app.delete('/api/schedules/:id', auth, (req, res) => {
  try {
    scheduler.remove(req.params.id);
    res.json({ ok: true });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
  }
});

app.post('/api/voice', auth, rateLimit(60, 60000), (req, res) => {
  if (typeof req.body?.text !== 'string' || !req.body.text.trim()) return res.status(400).json({ error: 'text_required' });
  const text = req.body.text.trim().slice(0, 300);
  res.json(voice.handle(text));
});

// Audio transcription endpoint using gemini-3.5-transcribe
app.post('/api/transcribe', auth, rateLimit(10, 60000), async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body || {};
    if (typeof audioBase64 !== 'string' || !audioBase64) {
      return res.status(400).json({ error: 'Audio ma\'lumoti topilmadi (audioBase64 talab qilinadi)' });
    }

    // Clean base64 if it has data URL prefix
    const cleanBase64 = audioBase64.replace(/^data:audio\/[a-z0-9.+-]+;base64,/i, '');
    if (cleanBase64.length > 1500000 || !/^[A-Za-z0-9+/]*={0,2}$/.test(cleanBase64)) {
      return res.status(400).json({ error: 'audio_payload_invalid_or_too_large' });
    }
    const allowedMimeTypes = new Set(['audio/webm', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/mp4']);
    const safeMimeType = typeof mimeType === 'string' && allowedMimeTypes.has(mimeType) ? mimeType : 'audio/webm';
    const ai = getAi();
    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: safeMimeType,
              data: cleanBase64,
            },
          },
          {
            text: 'Transcribe this spoken audio verbatim into text. Maintain the original spoken language (Uzbek, Russian, or English). Return only the transcript text without preamble, commentary, or markdown formatting.',
          },
        ],
      },
    });

    const text = (response.text || '').trim();
    return res.json({
      text,
      model: 'gemini-3.5-transcribe',
      ok: true,
    });
  } catch (err: any) {
    console.error('[Gemini Transcribe Error]:', err);
    return res.status(502).json({
      error: 'Audio transkripsiyasi xizmati vaqtincha ishlamayapti',
    });
  }
});

// Simulator & testing endpoints
app.post('/api/simulator/spike', auth, rateLimit(5, 60000), (req, res) => {
  if (!cfg.simulate) return res.status(403).json({ error: 'simulator_disabled' });
  const { id, watts } = req.body || {};
  const targetId = typeof id === 'string' ? id : 'kitchen-iron';
  const targetWatts = Number(watts);
  if (!store.db.devices.some((d: any) => d.id === targetId)) return res.status(404).json({ error: 'unknown_device' });
  if (!Number.isFinite(targetWatts) || targetWatts <= 0 || targetWatts > 100000) return res.status(400).json({ error: 'invalid_watts' });
  simulator.spike(targetId, targetWatts);
  res.json({ ok: true, message: `Spike injected on ${targetId}: ${targetWatts}W` });
});

app.get('/api/simulator/status', auth, (_req, res) => {
  res.json({
    active: true,
    simulate: cfg.simulate,
    maxTotalWatts: cfg.maxTotalWatts,
    tariff: cfg.tariff,
  });
});

app.post('/api/tariff', auth, (req, res) => {
  const newTariff = Number(req.body?.tariff);
  if (Number.isFinite(newTariff) && newTariff > 0 && newTariff <= 100000000) {
    cfg.tariff = newTariff;
    return res.json({ ok: true, tariff: cfg.tariff });
  }
  res.status(400).json({ error: 'invalid tariff' });
});

// Create HTTP server
const server = http.createServer(app);

server.on('error', (err: any) => {
  console.error('[http] Server error:', err.message || err);
});

// WebSocket server
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('error', (err) => {
  console.warn('[wss] WebSocketServer error:', err.message || err);
});

const broadcast = (msg: any) => {
  const data = JSON.stringify(msg);
  wss.clients.forEach((c) => {
    if (c.readyState === WebSocket.OPEN) {
      c.send(data);
    }
  });
};

wss.on('connection', (ws, req) => {
  try {
    const ticket = new URL(req.url || '', 'http://localhost').searchParams.get('ticket') || '';
    const expires = wsTickets.get(ticket);
    if (!ticket || !expires || expires <= Date.now()) return ws.close(4401, 'unauthorized');
    wsTickets.delete(ticket); // one-time use
    ws.send(JSON.stringify({ type: 'snapshot', ...devices.snapshot() }));
  } catch (err) {
    console.error('[ws] connection error:', err);
    ws.close(1011, 'connection error');
  }
});

// Wire devices, mqtt, and scheduler
const mqttClient = broker.connect();
devices.init(mqttClient, broadcast);
scheduler.start();

if (cfg.simulate) {
  setTimeout(() => {
    simulator.start();
    console.log('[simulator] Ishga tushirildi');
  }, 500);
}

// Vite middleware for dev / static serving for prod
const isProd = process.env.NODE_ENV === 'production';

// Parse port from CLI args (--port) or process.env.PORT, default 3000
const portArgIndex = process.argv.indexOf('--port');
const cliPort = portArgIndex !== -1 ? Number(process.argv[portArgIndex + 1]) : NaN;
const PORT = !isNaN(cliPort) && cliPort > 0 ? cliPort : (Number(process.env.PORT) || 3000);

const hostArgIndex = process.argv.indexOf('--host');
const cliHost = hostArgIndex !== -1 ? process.argv[hostArgIndex + 1] : undefined;
const HOST = cliHost || process.env.HOST || '0.0.0.0';

async function startServer() {
  if (!cfg.apiToken || cfg.apiToken.length < 24) {
    throw new Error('API_TOKEN majburiy va kamida 24 belgidan iborat bo‘lishi kerak. .env.example faylini ko‘ring.');
  }
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`[SmartHome Assistant] Server running at http://${HOST}:${PORT}`);
  });
}

// Graceful cleanup on restart
const cleanExit = () => {
  try {
    scheduler.stop();
    store.flush();
    server.close();
    wss.close();
  } catch (err) { console.error('[shutdown] cleanup error:', err); }
  process.exit(0);
};

process.on('SIGTERM', cleanExit);
process.on('SIGINT', cleanExit);

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

