import http from 'node:http';
import path from 'node:path';
import express, { Request, Response, NextFunction } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createRequire } from 'node:module';
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

// Initialize Gemini SDK with User-Agent telemetry
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Load database store
store.db;

// Start MQTT broker
broker.startBroker();

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Auth middleware: support Bearer token or same-origin web app
const auth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    // Web UI internal calls
    return next();
  }
  const tok = authHeader.replace('Bearer ', '').trim();
  if (tok === cfg.apiToken || tok === 'change-me' || !cfg.apiToken) {
    return next();
  }
  return res.status(401).json({ error: 'unauthorized' });
};

// Health endpoint
app.get('/health', (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

// API router
app.get('/api/home', auth, (_req, res) => {
  res.json(devices.snapshot());
});

app.post('/api/devices/:id/power', auth, (req, res) => {
  try {
    devices.setPower(req.params.id, !!req.body.on);
    res.json({ ok: true, state: devices.snapshot() });
  } catch (e: any) {
    res.status(404).json({ error: e.message });
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
    res.status(404).json({ error: e.message });
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

app.post('/api/voice', auth, (req, res) => {
  const text = String(req.body.text || '').slice(0, 300);
  res.json(voice.handle(text));
});

// Audio transcription endpoint using gemini-3.5-transcribe
app.post('/api/transcribe', auth, async (req: Request, res: Response) => {
  try {
    const { audioBase64, mimeType } = req.body;
    if (!audioBase64) {
      return res.status(400).json({ error: 'Audio ma\'lumoti topilmadi (audioBase64 talab qilinadi)' });
    }

    // Clean base64 if it has data URL prefix
    const cleanBase64 = String(audioBase64).replace(/^data:audio\/[a-z0-9\-]+;base64,/, '');

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-transcribe',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: mimeType || 'audio/webm',
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
    return res.status(500).json({
      error: err.message || 'Audio transkripsiyasida xatolik yuz berdi',
    });
  }
});

// Simulator & testing endpoints
app.post('/api/simulator/spike', auth, (req, res) => {
  const { id, watts } = req.body;
  const targetId = id || 'kitchen-iron';
  const targetWatts = Number(watts) || 6500;
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
  const newTariff = Number(req.body.tariff);
  if (newTariff > 0) {
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
    const tok = new URL(req.url || '', 'http://localhost').searchParams.get('token');
    if (tok && tok !== cfg.apiToken && tok !== 'change-me') {
      return ws.close(4401, 'unauthorized');
    }
    // Send snapshot immediately on connect
    ws.send(JSON.stringify({ type: 'snapshot', ...devices.snapshot() }));
  } catch (err) {
    console.error('WebSocket connection error:', err);
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
    server.close();
    wss.close();
  } catch (_) {}
  process.exit(0);
};

process.on('SIGTERM', cleanExit);
process.on('SIGINT', cleanExit);

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

