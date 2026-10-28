const test = require('node:test');
const assert = require('node:assert');
const nlu = require('../src/nlu');
const { checkDevice, shedList } = require('../src/safety');
const { sampleKwh } = require('../src/energy');
const scheduler = require('../src/scheduler');

test('NLU: uzbek o\'chirish', () => {
  const r = nlu.parse("Yordamchi, mehmonxonadagi chiroqni o'chir");
  assert.deepStrictEqual([r.intent, r.room, r.device, r.lang], ['turn_off', 'living', 'light', 'uz']);
});
test('NLU: uzbek so\'rov', () => {
  const r = nlu.parse('Dazmol yoqilganmi?');
  assert.deepStrictEqual([r.intent, r.device], ['query', 'iron']);
});
test('NLU: uzbek jadval', () => {
  const r = nlu.parse('Ertalab soat 7 da kofevarkani yoq');
  assert.deepStrictEqual([r.intent, r.device, r.time], ['schedule_on', 'coffee', '07:00']);
});
test('NLU: rus', () => {
  assert.strictEqual(nlu.parse('Выключи свет в спальне').intent, 'turn_off');
  assert.strictEqual(nlu.parse('Утюг включен?').intent, 'query');
  const r = nlu.parse('Включи кофеварку в 7 утра');
  assert.deepStrictEqual([r.intent, r.time, r.lang], ['schedule_on', '07:00', 'ru']);
});
test('NLU: stsenariy', () => {
  assert.strictEqual(nlu.parse('Xayrli tun').scene, 'good_night');
  assert.strictEqual(nlu.parse('Я ухожу').scene, 'leave_home');
});
test('Safety: spike va overload', () => {
  const d = { id: 'x', ratedWatts: 100 };
  const st = new Map();
  assert.strictEqual(checkDevice(d, 350, st).level, 'critical');
  assert.strictEqual(checkDevice(d, 150, st, 0), null);
  assert.strictEqual(checkDevice(d, 150, st, 11000).action, 'cut');
});
test('Safety: shedList muhimini saqlaydi', () => {
  const devs = [
    { id: 'a', priority: 3 }, { id: 'b', priority: 2 }, { id: 'f', priority: 1, essential: true },
  ];
  const cut = shedList(devs, { a: 2000, b: 1000, f: 150 }, 1500);
  assert.deepStrictEqual(cut, ['a']);
});
test('Energy: kWh', () => {
  const s = [{ t: 0, id: 'a', w: 1000 }, { t: 3600000 / 20, id: 'a', w: 1000 }];
  assert.ok(Math.abs(sampleKwh(s, 0, 1e9).a - 0.05) < 1e-6);
});


test('Scheduler: vaqt va amal validatsiyasi', () => {
  assert.throws(() => scheduler.validateSchedule({ time: '25:70', action: 'on', deviceIds: ['living-light'] }));
  assert.throws(() => scheduler.validateSchedule({ time: '07:30', action: 'toggle', deviceIds: ['living-light'] }));
  assert.throws(() => scheduler.validateSchedule({ time: '07:30', action: 'on', deviceIds: ['missing-device'] }));
  assert.deepStrictEqual(scheduler.validateSchedule({ time: '07:30', action: 'on', deviceIds: ['living-light'], days: [1, 3] }).days, [1, 3]);
});

test('Energy: katta namuna oralig‘ida sarfni taxmin qilib qo‘shmaydi', () => {
  const samples = [{ t: 0, id: 'x', w: 1000 }, { t: 20 * 60000, id: 'x', w: 1000 }];
  assert.strictEqual(sampleKwh(samples, 0, 30 * 60000).x, 0);
});

test('Energy: vaqt oralig‘i chegarasida to‘g‘ri integratsiya', () => {
  const samples = [{ t: 0, id: 'x', w: 1000 }, { t: 3 * 60000, id: 'x', w: 1000 }];
  assert.ok(Math.abs(sampleKwh(samples, 60000, 2 * 60000).x - (1 / 60)) < 1e-6);
});


test('NLU: Russian time-of-day markers', () => {
  assert.strictEqual(nlu.parse('Включи кофеварку в 7 вечера').time, '19:00');
  assert.strictEqual(nlu.parse('Включи свет в 7 дня').time, '19:00');
  assert.strictEqual(nlu.parse('Включи свет в 12 ночи').time, '00:00');
});

test('Scheduler: duplicate days are normalized', () => {
  const clean = scheduler.validateSchedule({ time: '08:00', action: 'on', deviceIds: ['living-light'], days: [1, 1, 3] });
  assert.deepStrictEqual([...new Set(clean.days)], [1, 3]);
});
