// Qoidalarga asoslangan NLU: o'zbek + rus. Tashqi kutubxonasiz, tez va oflayn.
// Natija: { intent, lang, room, device, time, scene, raw }

const norm = (s) => s.toLowerCase()
  .replace(/[ʻʼ’‘`´]/g, "'")
  .replace(/[?!.,]/g, ' ')
  .replace(/\s+/g, ' ').trim();

const ROOMS = {
  living: ['mehmonxona', 'zal', 'гостин', 'зал'],
  bedroom: ['yotoqxona', 'yotoq', 'спальн'],
  kitchen: ['oshxona', 'кухн'],
};
// kind -> kalit so'zlar (store.js dagi device.kind bilan mos)
const DEVICES = {
  light: ['chiroq', 'yorug', 'свет', 'лампа', 'лампочк'],
  iron: ['dazmol', 'утюг'],
  coffee: ['kofevarka', 'kofe', 'кофеварк', 'кофе'],
  tv: ['televizor', 'телевизор'],
  fridge: ['muzlatkich', 'холодильник'],
};
const SCENES = {
  all_off: ['hamma chiroqni ochir', "hammasini o'chir", "barchasini o'chir", 'выключи все', 'выключи всё', 'погаси все'],
  evening: ['oqshom rejimi', 'kechki rejim', 'вечерний режим', 'вечерний сценарий'],
  morning: ['ertalabki rejim', 'ertalab rejim', 'uygondim', 'утренний режим', 'доброе утро'],
  leave_home: ['uydan ket', 'uydan chiq', 'ketyapman', 'ketdim', 'ухожу', 'ушел', 'ушёл', 'уход из дома'],
  good_night: ['xayrli tun', 'yotaman', 'uxlayman', 'спокойной ночи', 'доброй ночи', 'ложусь спать'],
};
const ON = ['yoq', 'yoqing', 'yoqib', 'ishga tushir', 'включи', 'зажги', 'вруби'];
const OFF = ["o'chir", "o'chiring", 'ochir', 'uzib', 'uzing', 'выключи', 'погаси', 'отключи', 'вырубь'];
const QUERY = ['yoqilganmi', "o'chiqmi", 'yoniqmi', 'holati', 'включен', 'включён', 'включена', 'горит', 'работает', 'статус'];

const has = (t, words) => words.some((w) => t.includes(w));
const findKey = (t, map) => Object.keys(map).find((k) => has(t, map[k])) || null;
const detectLang = (raw) => (/[а-яё]/i.test(raw) ? 'ru' : 'uz');

function parseTime(t) {
  // Supports: soat 7 da, soat 7:30, в 7 утра, в 7 вечера, в 19:00.
  const m = t.match(/(?:soat|в)\s*(\d{1,2})(?:[:.](\d{2}))?/);
  if (!m) return null;
  let h = Number(m[1]);
  const min = m[2] === undefined ? 0 : Number(m[2]);
  if (h > 23 || min > 59) return null;
  if (/вечера|дня|kechqurun|kunduzi/.test(t) && h < 12) h += 12;
  if (/ночи/.test(t) && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function parse(raw) {
  const t = norm(raw);
  const out = { intent: 'unknown', lang: detectLang(raw), room: null, device: null, time: null, scene: null, raw };

  const scene = findKey(t, SCENES);
  if (scene) return { ...out, intent: 'scene', scene };

  out.room = findKey(t, ROOMS);
  out.device = findKey(t, DEVICES);

  const isQuery = has(t, QUERY) || /\bли\b/.test(t) || /\bmi\b/.test(t);
  const wantsOff = has(t, OFF);
  // "yoqilganmi" so'zi "yoq" ni ham o'z ichiga oladi — shuning uchun so'rovni oldin tekshiramiz
  if (isQuery) return { ...out, intent: 'query' };
  const wantsOn = has(t, ON);

  if (/(soat|в)\s*\d/.test(t) && (wantsOn || wantsOff)) {
    out.time = parseTime(t);
    out.intent = wantsOff ? 'schedule_off' : 'schedule_on';
    return out;
  }
  if (/qancha|сколько|sarf|расход/.test(t)) return { ...out, intent: 'energy' };
  if (wantsOff) out.intent = 'turn_off';
  else if (wantsOn) out.intent = 'turn_on';
  return out;
}

module.exports = { parse, norm };
