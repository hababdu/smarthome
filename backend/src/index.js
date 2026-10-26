const http = require('http');
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
app.use(express.json());

const auth = (req, res, next) => {
  const tok = (req.headers.authorization || '').replace('Bearer ', '');
  if (tok !== cfg.apiToken) return res.status(401).json({ error: 'unauthorized' });
  next();
};
app.get('/health', (_, res) => res.json({ ok: true }));
app.use('/api', auth);

app.get('/api/home', (_, res) => res.json(devices.snapshot()));
app.post('/api/devices/:id/power', (req, res) => {
  try { devices.setPower(req.params.id, !!req.body.on); res.json({ ok: true }); }
  catch (e) { res.status(404).json({ error: e.message }); }
});
app.get('/api/energy', (req, res) => {
  const lang = req.query.lang === 'ru' ? 'ru' : 'uz';
  const rep = energy.report(store.db.samples, cfg.tariff);
  res.json({ ...rep, tips: energy.tips(rep, store.db.devices, lang) });
});
app.get('/api/scenes', (_, res) => res.json(scenes.list()));
app.post('/api/scenes/:id/run', (req, res) => {
  try { scenes.run(req.params.id); res.json({ ok: true }); }
  catch (e) { res.status(404).json({ error: e.message }); }
});
app.get('/api/schedules', (_, res) => res.json(scheduler.list()));
app.post('/api/schedules', (req, res) => res.json(scheduler.add(req.body)));
app.delete('/api/schedules/:id', (req, res) => { scheduler.remove(req.params.id); res.json({ ok: true }); });
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
  const tok = new URL(req.url, 'http://x').searchParams.get('token');
  if (tok !== cfg.apiToken) return ws.close(4401, 'unauthorized');
  ws.send(JSON.stringify({ type: 'snapshot', ...devices.snapshot() }));
});

const mqttClient = broker.connect();
devices.init(mqttClient, broadcast);
scheduler.start();
if (cfg.simulate) setTimeout(() => require('./simulator').start(), 500);

server.listen(cfg.port, () => console.log(`[api] http://0.0.0.0:${cfg.port}`));
