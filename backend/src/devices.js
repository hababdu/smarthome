// Qurilmalar holati, MQTT orqali boshqaruv va xavfsizlik tekshiruvi.
// MQTT mavzular:
//   home/<id>/cmd     (backend -> qurilma)  "ON" | "OFF"
//   home/<id>/state   (qurilma -> backend)  {"on":true,"watts":43.2}   (retained emas, har 2-5 s)
//   home/<id>/status  (qurilma -> backend)  "online" | "offline"       (LWT, retained)
const cfg = require('./config');
const store = require('./store');
const { checkDevice, shedList } = require('./safety');

const state = new Map();       // id -> { on, watts, online, ts }
const overloadSince = new Map();
const lastSample = new Map();
let client; let emit = () => {};

function init(mqttClient, broadcast) {
  client = mqttClient; emit = broadcast;
  for (const d of store.db.devices) state.set(d.id, { on: false, watts: 0, online: false, ts: 0 });
  client.on('connect', () => client.subscribe(['home/+/state', 'home/+/status'], { qos: 1 }));
  client.on('message', (topic, buf) => {
    const [, id, kind] = topic.split('/');
    const st = state.get(id);
    if (!st) return;
    const msg = buf.toString();
    if (kind === 'status') st.online = msg === 'online';
    else {
      try { Object.assign(st, JSON.parse(msg), { online: true, ts: Date.now() }); } catch { return; }
      recordSample(id, st.watts);
      runSafety(id);
    }
    emit({ type: 'state', id, state: st });
  });
}

function recordSample(id, w) {
  const now = Date.now();
  if (now - (lastSample.get(id) || 0) < 10000) return; // har 10 s da bitta namuna
  lastSample.set(id, now);
  const { samples } = store.db;
  samples.push({ t: now, id, w: Math.round(w * 10) / 10 });
  if (samples.length > 200000) samples.splice(0, samples.length - 200000);
  store.save();
}

function runSafety(id) {
  const dev = store.db.devices.find((d) => d.id === id);
  const st = state.get(id);
  const alert = checkDevice(dev, st.watts, overloadSince);
  if (alert) {
    setPower(id, false);
    emit({ type: 'alert', level: alert.level, deviceId: id, message: `${dev.name.uz}: ${alert.reason}`, ts: Date.now() });
  }
  const power = Object.fromEntries([...state].map(([k, v]) => [k, v.on ? v.watts : 0]));
  for (const cutId of shedList(store.db.devices, power, cfg.maxTotalWatts)) {
    setPower(cutId, false);
    emit({ type: 'alert', level: 'warning', deviceId: cutId, ts: Date.now(),
      message: `Uy yuklamasi ${cfg.maxTotalWatts}W dan oshdi, ${cutId} o'chirildi` });
  }
}

function setPower(id, on) {
  const st = state.get(id);
  if (!st) throw new Error('unknown device ' + id);
  client.publish(`home/${id}/cmd`, on ? 'ON' : 'OFF', { qos: 1 });
  st.on = on; // optimistik; qurilma tasdiqlagach state yangilanadi
  if (!on) st.watts = 0;
  emit({ type: 'state', id, state: st });
}

const snapshot = () => ({
  rooms: store.db.rooms,
  devices: store.db.devices.map((d) => ({ ...d, ...state.get(d.id) })),
  totalWatts: Math.round([...state.values()].reduce((a, s) => a + (s.on ? s.watts : 0), 0)),
});

module.exports = { init, setPower, snapshot, state };
