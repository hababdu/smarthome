const http = require('http');
const crypto = require('crypto');
const express = require('express');
const { WebSocketServer } = require('ws');
const cfg = require('./config');
const store = require('./store');
const broker = require('./broker');
const devices = require('./devices');
const scenes = require('./scenes');
const scheduler = require('./scheduler');
const energy = require('./energy');
const voice = require('./voice');

store.db; // yuklash
broker.startBroker();

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '2mb', strict: true }));

const safeEqual = (a, b) => { const x = Buffer.from(a); const y = Buffer.from(b); return x.length === y.length && crypto.timingSafeEqual(x, y); };
const auth = (req, res, next) => {
  if (!cfg.apiToken || cfg.apiToken.length < 24) return res.status(503).json({ error: 'server_auth_not_configured' });
  const match = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '');
  if (!match || !safeEqual(match[1].trim(), cfg.apiToken)) return res.status(401).json({ error: 'unauthorized' });
  next();
};
const wsTickets = new Map();
setInterval(() => { const now = Date.now(); for (const [ticket, expires] of wsTickets) if (expires <= now) wsTickets.delete(ticket); }, 30000).unref();
app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api', auth);
app.post('/api/ws-ticket', (req, res) => { const ticket = crypto.randomBytes(32).toString('hex'); wsTickets.set(ticket, Date.now() + 30000); res.json({ ticket, expiresIn: 30 }); });

app.get('/api/home', (_, res) => res.json(devices.snapshot()));
app.post('/api/devices/:id/power', (req, res) => {
  if (typeof req.body?.on !== 'boolean') return res.status(400).json({ error: 'on_must_be_boolean' });
  try { res.status(202).json(devices.setPower(req.params.id, req.body.on)); }
  catch (e) { res.status(String(e.message).startsWith('unknown device') ? 404 : 409).json({ error: e.message }); }
});
app.get('/api/energy', (req, res) => {
  const lang = req.query.lang === 'ru' ? 'ru' : 'uz';
  const rep = energy.report(store.db.samples, cfg.tariff);
  res.json({ ...rep, tips: energy.tips(rep, store.db.devices, lang) });
});
app.get('/api/scenes', (_, res) => res.json(scenes.list()));
app.post('/api/scenes/:id/run', (req, res) => {
  try { scenes.run(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(e.message === 'unknown scene' ? 404 : 409).json({ error: e.message }); }
});
app.get('/api/schedules', (_, res) => res.json(scheduler.list()));
app.post('/api/schedules', (req, res) => { try { res.status(201).json(scheduler.add(req.body)); } catch (e) { res.status(400).json({ error: e.message }); } });
app.delete('/api/schedules/:id', (req, res) => { try { scheduler.remove(req.params.id); res.json({ ok: true }); } catch (e) { res.status(404).json({ error: e.message }); } });
app.post('/api/voice', (req, res) => {
  const text = String(req.body.text || '').slice(0, 300);
  res.json(voice.handle(text));
});

const server = http.createServer(app);
const wss = new WebSocketServer({ server, path: '/ws' });
const broadcast = (msg) => {
  const data = JSON.stringify(msg);
  wss.clients.forEach((c) => c.readyState === 1 && c.send(data));
};
wss.on('connection', (ws, req) => {
  const ticket = new URL(req.url, 'http://localhost').searchParams.get('ticket') || '';
  const expires = wsTickets.get(ticket);
  if (!ticket || !expires || expires <= Date.now()) return ws.close(4401, 'unauthorized');
  wsTickets.delete(ticket);
  ws.send(JSON.stringify({ type: 'snapshot', ...devices.snapshot() }));
});

const mqttClient = broker.connect();
devices.init(mqttClient, broadcast);
scheduler.start();
if (cfg.simulate) setTimeout(() => require('./simulator').start(), 500);

if (!cfg.apiToken || cfg.apiToken.length < 24) {
  console.error('[api] API_TOKEN majburiy va kamida 24 belgidan iborat bo‘lishi kerak.');
  process.exit(1);
}
server.listen(cfg.port, () => console.log(`[api] http://0.0.0.0:${cfg.port}`));

function shutdown() {
  scheduler.stop();
  try { store.flush(); } catch {}
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
