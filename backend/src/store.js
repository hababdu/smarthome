// Oddiy JSON-fayl asosidagi saqlash (MVP). Keyin PostgreSQL/SQLite ga almashtirish mumkin.
const fs = require('fs');
const path = require('path');
const FILE = path.join(__dirname, '..', 'data.json');

const defaults = {
  rooms: [
    { id: 'living', name: { uz: 'Mehmonxona', ru: 'Гостиная' } },
    { id: 'bedroom', name: { uz: 'Yotoqxona', ru: 'Спальня' } },
    { id: 'kitchen', name: { uz: 'Oshxona', ru: 'Кухня' } },
  ],
  // priority: 1 = muhim (o'chirilmaydi), 3 = ortiqcha yuklamada birinchi o'chiriladi
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
  samples: [], // { t, id, w }
};

let db;
function load() {
  try { db = JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { db = JSON.parse(JSON.stringify(defaults)); }
  return db;
}
let timer;
function save() {
  clearTimeout(timer);
  timer = setTimeout(() => fs.writeFileSync(FILE, JSON.stringify(db)), 500);
}
module.exports = { get db() { return db || load(); }, save };
