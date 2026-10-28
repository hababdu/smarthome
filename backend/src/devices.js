// Device state and MQTT control. UI state is confirmed only by device telemetry.
const cfg = require('./config');
const store = require('./store');
const { checkDevice, shedList } = require('./safety');

const state = new Map();
const overloadSince = new Map();
const lastSample = new Map();
const pendingTimers = new Map();
const COMMAND_TIMEOUT_MS = 10000;
let client;
let emit = () => {};

function init(mqttClient, broadcast) {
  client = mqttClient;
  emit = broadcast;
  for (const d of store.db.devices) {
    if (!state.has(d.id)) state.set(d.id, { on: false, watts: 0, online: false, ts: 0, pendingPower: null });
  }
  client.on('connect', () => client.subscribe(['home/+/state', 'home/+/status'], { qos: 1 }));
  client.on('message', (topic, buf) => {
    const [, id, kind] = topic.split('/');
    const st = state.get(id);
    if (!st) return;
    const msg = buf.toString();
    if (kind === 'status') {
      if (msg !== 'online' && msg !== 'offline') return;
      st.online = msg === 'online';
      if (!st.online) {
        // Offline state is unknown; never present stale telemetry as current.
        st.on = false;
        st.watts = 0;
        st.ts = 0;
        clearPending(id, 'device_offline');
      }
    } else if (kind === 'state') {
      let parsed;
      try { parsed = JSON.parse(msg); } catch { return; }
      if (typeof parsed.on !== 'boolean' || !Number.isFinite(Number(parsed.watts)) || Number(parsed.watts) < 0) return;
      st.on = parsed.on;
      st.watts = Math.min(Number(parsed.watts), 100000);
      st.online = true;
      st.ts = Date.now();
      if (st.pendingPower === parsed.on) clearPending(id, 'confirmed');
      recordSample(id, st.watts);
      runSafety(id);
    }
    emit({ type: 'state', id, state: { ...st } });
  });
}

function clearPending(id, reason) {
  const st = state.get(id);
  const timer = pendingTimers.get(id);
  if (timer) clearTimeout(timer);
  pendingTimers.delete(id);
  if (st) st.pendingPower = null;
  if (reason && st) emit({ type: 'command_status', id, status: reason, state: { ...st } });
}

function recordSample(id, w) {
  const now = Date.now();
  if (now - (lastSample.get(id) || 0) < 10000) return;
  lastSample.set(id, now);
  const samples = store.db.samples;
  samples.push({ t: now, id, w: Math.round(w * 10) / 10 });
  if (samples.length > 200000) samples.splice(0, samples.length - 200000);
  store.save();
}

function runSafety(id) {
  const dev = store.db.devices.find((d) => d.id === id);
  const st = state.get(id);
  if (!dev || !st) return;
  const alert = checkDevice(dev, st.watts, overloadSince);
  if (alert) {
    try { setPower(id, false); } catch (err) { console.error('[safety] qurilmani o‘chirish buyrug‘i yuborilmadi:', err.message); }
    emit({ type: 'alert', level: alert.level, deviceId: id, message: `${dev.name.uz}: ${alert.reason}`, ts: Date.now() });
  }
  const power = Object.fromEntries([...state].map(([k, v]) => [k, v.on ? v.watts : 0]));
  for (const cutId of shedList(store.db.devices, power, cfg.maxTotalWatts)) {
    try { setPower(cutId, false); } catch (err) { console.error('[safety] yuklama buyrug‘i yuborilmadi:', err.message); }
    emit({ type: 'alert', level: 'warning', deviceId: cutId, ts: Date.now(),
      message: `Uy yuklamasi ${cfg.maxTotalWatts}W dan oshdi, ${cutId} uchun o‘chirish buyrug‘i yuborildi` });
  }
}

function setPower(id, on) {
  const st = state.get(id);
  if (!st) throw new Error('unknown device ' + id);
  const device = store.db.devices.find((item) => item.id === id);
  if (device?.essential && on === false) throw new Error('essential_device_protected');
  if (typeof on !== 'boolean') throw new Error('power value must be boolean');
  if (!client || !client.connected) throw new Error('MQTT broker ulanmagan');
  if (!st.online) throw new Error('qurilma offline');
  if (st.pendingPower === on) return { ok: true, pending: true, state: { ...st } };

  st.pendingPower = on;
  const oldTimer = pendingTimers.get(id);
  if (oldTimer) clearTimeout(oldTimer);
  emit({ type: 'state', id, state: { ...st } });
  client.publish(`home/${id}/cmd`, on ? 'ON' : 'OFF', { qos: 1, retain: false }, (err) => {
    if (err) {
      clearPending(id, 'publish_failed');
      emit({ type: 'error', id, message: 'MQTT buyruqni yubora olmadi' });
    }
  });
  const timer = setTimeout(() => {
    if (st.pendingPower === on) clearPending(id, 'timeout');
  }, COMMAND_TIMEOUT_MS);
  pendingTimers.set(id, timer);
  return { ok: true, pending: true, state: { ...st } };
}

const snapshot = () => ({
  rooms: store.db.rooms,
  devices: store.db.devices.map((d) => ({ ...d, ...(state.get(d.id) || { on: false, watts: 0, online: false, ts: 0, pendingPower: null }) })),
  totalWatts: Math.round([...state.values()].reduce((a, s) => a + (s.on ? s.watts : 0), 0)),
});

module.exports = { init, setPower, snapshot, state };
