// Jadval/taymer. Server vaqti ishlatiladi: TZ=Asia/Tashkent o'rnating.
const crypto = require('crypto');
const store = require('./store');
const devices = require('./devices');
const scenes = require('./scenes');

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

function add({ time, action, deviceIds, scene, days = null }) {
  const s = { id: crypto.randomUUID(), time, action, deviceIds, scene, days, lastRun: null };
  store.db.schedules.push(s); store.save();
  return s;
}
function remove(id) {
  store.db.schedules = store.db.schedules.filter((s) => s.id !== id); store.save();
}
function tick(now = new Date()) {
  const key = `${now.toDateString()} ${hhmm(now)}`;
  for (const s of store.db.schedules) {
    if (s.time !== hhmm(now) || s.lastRun === key) continue;
    if (s.days && !s.days.includes(now.getDay())) continue;
    s.lastRun = key;
    if (s.scene) scenes.run(s.scene);
    else for (const id of s.deviceIds || []) devices.setPower(id, s.action === 'on');
    store.save();
  }
}
const start = () => setInterval(tick, 15000);

module.exports = { add, remove, tick, start, list: () => store.db.schedules };
