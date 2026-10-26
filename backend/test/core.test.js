const test = require('node:test');
const assert = require('node:assert');
const nlu = require('../src/nlu');
const { checkDevice, shedList } = require('../src/safety');
const { sampleKwh } = require('../src/energy');

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
