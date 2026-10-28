// JSON persistence for MVP. Use SQLite/PostgreSQL for multi-process production deployments.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data.json');
const TEMP_FILE = `${FILE}.tmp`;

const defaults = {
  rooms: [
    { id: 'living', name: { uz: 'Mehmonxona', ru: 'Гостиная' } },
    { id: 'bedroom', name: { uz: 'Yotoqxona', ru: 'Спальня' } },
    { id: 'kitchen', name: { uz: 'Oshxona', ru: 'Кухня' } },
  ],
  devices: [
    { id: 'living-light', room: 'living', kind: 'light', name: { uz: 'chiroq', ru: 'свет' }, ratedWatts: 60, priority: 2 },
    { id: 'living-tv', room: 'living', kind: 'tv', name: { uz: 'televizor', ru: 'телевизор' }, ratedWatts: 150, priority: 3 },
    { id: 'bedroom-light', room: 'bedroom', kind: 'light', night: true, name: { uz: 'chiroq', ru: 'свет' }, ratedWatts: 40, priority: 2 },
    { id: 'kitchen-light', room: 'kitchen', kind: 'light', name: { uz: 'chiroq', ru: 'свет' }, ratedWatts: 50, priority: 2 },
    { id: 'kitchen-iron', room: 'kitchen', kind: 'iron', name: { uz: 'dazmol', ru: 'утюг' }, ratedWatts: 2000, priority: 3 },
    { id: 'kitchen-coffee', room: 'kitchen', kind: 'coffee', name: { uz: 'kofevarka', ru: 'кофеварка' }, ratedWatts: 1000, priority: 3 },
    { id: 'kitchen-fridge', room: 'kitchen', kind: 'fridge', name: { uz: 'muzlatkich', ru: 'холодильник' }, ratedWatts: 150, priority: 1, essential: true },
  ],
  schedules: [],
  samples: [],
};

let db;
function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    if (!parsed || !Array.isArray(parsed.devices) || !Array.isArray(parsed.rooms) || !Array.isArray(parsed.schedules) || !Array.isArray(parsed.samples)) throw new Error('invalid database shape');
    db = parsed;
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('[store] data.json o‘qilmadi, boshlang‘ich ma’lumotlar ishlatiladi:', err.message);
    db = JSON.parse(JSON.stringify(defaults));
  }
  return db;
}
let timer;
function flush() {
  clearTimeout(timer);
  timer = null;
  try {
    fs.writeFileSync(TEMP_FILE, JSON.stringify(db), { mode: 0o600 });
    fs.renameSync(TEMP_FILE, FILE);
  } catch (err) {
    console.error('[store] saqlashda xato:', err.message);
    throw err;
  }
}
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => { try { flush(); } catch {} }, 250);
}
module.exports = { get db() { return db || load(); }, save, flush };
