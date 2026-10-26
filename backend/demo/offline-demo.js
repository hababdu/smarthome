// Tashqi kutubxonasiz demo: haqiqiy backend mantig'i (voice, devices, safety, scenes,
// scheduler, energy) xotiradagi soxta MQTT shina va soxta qurilmalar bilan ishlaydi.
// Ishga tushirish: node demo/offline-demo.js
const { EventEmitter } = require('events');
const cfg = require('../src/config');
const store = require('../src/store');
const devices = require('../src/devices');
const scheduler = require('../src/scheduler');
const energy = require('../src/energy');
const voice = require('../src/voice');

// --- soxta MQTT klient + soxta ESP32 qurilmalar ---
const hw = new Map(store.db.devices.map((d) => [d.id, { on: false, extra: 0 }]));
const bus = new EventEmitter();
bus.subscribe = () => {};
bus.publish = (topic, msg) => {
  const [, id, kind] = topic.split('/');
  if (kind === 'cmd' && hw.has(id)) { hw.get(id).on = String(msg) === 'ON'; setImmediate(() => report(id)); }
};
function report(id) {
  const d = store.db.devices.find((x) => x.id === id); const h = hw.get(id);
  const watts = h.on ? (h.extra || d.ratedWatts) : 0;
  bus.emit('message', `home/${id}/state`, Buffer.from(JSON.stringify({ on: h.on, watts })));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const alerts = [];
const bold = (s) => `\x1b[1m${s}\x1b[0m`;
const say = async (text) => {
  const r = voice.handle(text);
  console.log(`  🎤 «${text}»\n  🔊 ${r.reply}   [${r.intent}]`);
  await sleep(20);
};
const show = () => {
  const s = devices.snapshot();
  console.log('  ' + s.devices.map((d) => `${d.id}:${d.on ? 'ON ' + Math.round(d.watts) + 'W' : 'off'}`).join(' | ') + `\n  jami: ${s.totalWatts} W`);
};

(async () => {
  store.db.samples.length = 0;
  devices.init(bus, (m) => { if (m.type === 'alert') alerts.push(m); });
  bus.emit('connect');
  for (const id of hw.keys()) { bus.emit('message', `home/${id}/status`, Buffer.from('online')); report(id); }
  hw.get('kitchen-fridge').on = true; report('kitchen-fridge');
  await sleep(50);

  console.log(bold('\n1) Ovozli buyruqlar (o\'zbek)'));
  await say('Mehmonxonadagi chiroqni yoq');
  await say('Oshxonada dazmolni yoq');
  await say('Dazmol yoqilganmi?');
  await say('Mehmonxonadagi chiroqni o\'chir');
  show();

  console.log(bold('\n2) Ovozli buyruqlar (rus)'));
  await say('Включи свет в спальне');
  await say('Утюг включен?');
  await say('Выключи утюг');
  await say('Холодильник включен?');

  console.log(bold('\n3) Jadval: "soat HH:MM da kofevarkani yoq"'));
  const now = new Date(); const hh = String(now.getHours()).padStart(2, '0'); const mm = now.getMinutes();
  await say(`Soat ${now.getHours()}:${String(mm).padStart(2, '0')} da kofevarkani yoq`);
  scheduler.tick(now); await sleep(30);
  console.log(`  taymer ishladi -> kofevarka: ${devices.state.get('kitchen-coffee').on ? 'ON' : 'off'}`);

  console.log(bold('\n4) Stsenariylar'));
  await say('Xayrli tun'); show();
  await say('Uydan ketyapman'); show();

  console.log(bold('\n5) Xavfsizlik: qisqa tutashuv (dazmol 2000W nominal, 7000W keldi)'));
  await say('Dazmolni yoq');
  hw.get('kitchen-iron').extra = 7000; report('kitchen-iron'); await sleep(30);
  hw.get('kitchen-iron').extra = 0;
  console.log('  🚨 ' + (alerts.at(-1) ? alerts.at(-1).message : 'ogohlantirish yo\'q'));
  console.log(`  dazmol relesi: ${devices.state.get('kitchen-iron').on ? 'ON' : 'OFF (avtomatik uzildi)'}`);

  console.log(bold('\n6) Xavfsizlik: uy yuklamasi limiti (limit 2500W ga tushirildi)'));
  cfg.maxTotalWatts = 2500;
  await say('Dazmolni yoq'); await say('Kofevarkani yoq');
  await say('Televizorni yoq'); await sleep(30);
  show();
  alerts.slice(-3).forEach((a) => console.log('  🚨 ' + a.message));
  cfg.maxTotalWatts = 7000;

  console.log(bold('\n7) Energiya (sun\'iy 7 kunlik namunalar bilan)'));
  const t0 = Date.now();
  for (let i = 0; i < 7 * 24 * 12; i++) { // har 5 daqiqada
    const t = t0 - i * 300000;
    store.db.samples.push({ t, id: 'kitchen-fridge', w: 120 });
    if (new Date(t).getHours() >= 19 && new Date(t).getHours() < 22) store.db.samples.push({ t, id: 'living-tv', w: 150 });
    if (i % 288 < 3) store.db.samples.push({ t, id: 'kitchen-iron', w: 2000 });
  }
  const rep = energy.report(store.db.samples, cfg.tariff, t0);
  console.log(`  bugun: ${rep.day.kwh} kWh (~${rep.day.cost} so'm) | hafta: ${rep.week.kwh} kWh (~${rep.week.cost} so'm) | oy: ${rep.month.kwh} kWh`);
  energy.tips(rep, store.db.devices, 'uz').forEach((t) => console.log('  💡 ' + t));
  await say('Bugun qancha tok sarfladim?');
  console.log('\n' + bold('Demo tugadi ✔'));
  process.exit(0);
})();
