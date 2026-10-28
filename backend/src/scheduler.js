// Schedule manager. Set TZ=Asia/Tashkent in deployment environment.
const crypto = require('crypto');
const store = require('./store');
const devices = require('./devices');
const scenes = require('./scenes');

const hhmm = (d) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
const VALID_ACTIONS = new Set(['on', 'off']);
const VALID_DAYS = new Set([0, 1, 2, 3, 4, 5, 6]);

function validateSchedule(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Jadval ma’lumoti noto‘g‘ri');
  const { time, action, deviceIds, scene, days = null } = input;
  if (typeof time !== 'string' || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) throw new Error('Vaqt HH:MM formatida bo‘lishi kerak');
  const hasScene = typeof scene === 'string' && scene.length > 0;
  if (hasScene) {
    if (!scenes.list().some((item) => item.id === scene)) throw new Error('Bunday ssenariy mavjud emas');
    if (deviceIds !== undefined && deviceIds !== null) throw new Error('Ssenariy jadvalida deviceIds yuborilmasin');
    if (action !== undefined && action !== null) throw new Error('Ssenariy jadvalida action yuborilmasin');
  } else {
    if (!VALID_ACTIONS.has(action)) throw new Error('action faqat on yoki off bo‘lishi mumkin');
    if (!Array.isArray(deviceIds) || deviceIds.length === 0) throw new Error('Kamida bitta qurilma tanlanishi kerak');
    if (deviceIds.some((id) => typeof id !== 'string' || !store.db.devices.some((d) => d.id === id))) throw new Error('Jadvalda noma’lum qurilma bor');
    if (new Set(deviceIds).size !== deviceIds.length) throw new Error('Qurilma ID takrorlanmasligi kerak');
  }
  if (days !== null && (!Array.isArray(days) || days.length === 0 || days.some((day) => !Number.isInteger(day) || !VALID_DAYS.has(day)))) {
    throw new Error('days 0–6 oralig‘idagi hafta kunlari ro‘yxati bo‘lishi kerak yoki null');
  }
  return { time, action: hasScene ? null : action, deviceIds: hasScene ? [] : deviceIds, scene: hasScene ? scene : null, days: days === null ? null : [...new Set(days)] };
}

function add(input) {
  const clean = validateSchedule(input);
  const signature = (item) => JSON.stringify({ time: item.time, action: item.action, deviceIds: [...(item.deviceIds || [])].sort(), scene: item.scene, days: item.days });
  if (store.db.schedules.some((item) => signature(item) === signature(clean))) throw new Error('Bu jadval allaqachon mavjud');
  const s = { id: crypto.randomUUID(), ...clean, lastRun: null };
  store.db.schedules.push(s);
  store.save();
  return s;
}
function remove(id) {
  const before = store.db.schedules.length;
  store.db.schedules = store.db.schedules.filter((s) => s.id !== id);
  if (store.db.schedules.length === before) throw new Error('Jadval topilmadi');
  store.save();
}
function tick(now = new Date()) {
  const key = `${now.toDateString()} ${hhmm(now)}`;
  for (const s of store.db.schedules) {
    if (s.time !== hhmm(now) || s.lastRun === key) continue;
    if (s.days && !s.days.includes(now.getDay())) continue;
    try {
      if (s.scene) scenes.run(s.scene);
      else for (const id of s.deviceIds || []) devices.setPower(id, s.action === 'on');
      s.lastRun = key;
      store.save();
    } catch (err) {
      console.error(`[scheduler] jadval ${s.id} bajarilmadi:`, err.message);
    }
  }
}
let interval = null;
const start = () => { if (!interval) interval = setInterval(tick, 15000); return interval; };
const stop = () => { if (interval) clearInterval(interval); interval = null; };

module.exports = { add, remove, tick, start, stop, list: () => store.db.schedules, validateSchedule };
