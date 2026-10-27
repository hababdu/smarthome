const store = require('./store');
const devices = require('./devices');

const SCENES = {
  all_off: {
    name: { uz: "Barchasini o'chirish", ru: 'Выключить всё' },
    run() {
      for (const d of store.db.devices) if (!d.essential) devices.setPower(d.id, false);
    },
  },
  evening: {
    name: { uz: 'Oqshom rejimi', ru: 'Вечерний режим' },
    run() {
      // Mehmonxona va oshxona chiroqlari, televizor yoqiladi; yotoqxona va og'ir yuklamalar o'chadi
      devices.setPower('living-light', true);
      devices.setPower('living-tv', true);
      devices.setPower('kitchen-light', true);
      devices.setPower('bedroom-light', false);
      devices.setPower('kitchen-iron', false);
      devices.setPower('kitchen-coffee', false);
    },
  },
  morning: {
    name: { uz: 'Ertalab', ru: 'Утренний режим' },
    run() {
      // Oshxona va yotoqxona chiroqlari, kofevarka yoqiladi
      devices.setPower('kitchen-light', true);
      devices.setPower('kitchen-coffee', true);
      devices.setPower('bedroom-light', true);
      devices.setPower('living-light', false);
      devices.setPower('living-tv', false);
      devices.setPower('kitchen-iron', false);
    },
  },
  leave_home: {
    name: { uz: 'Uydan ketish', ru: 'Уход из дома' },
    run() { // muhim bo'lmagan hamma narsani o'chiradi (muzlatkich qoladi)
      for (const d of store.db.devices) if (!d.essential) devices.setPower(d.id, false);
    },
  },
  good_night: {
    name: { uz: 'Xayrli tun', ru: 'Спокойной ночи' },
    run() { // ortiqchasini o'chiradi, tungi chiroqni yoqadi
      for (const d of store.db.devices) if (!d.essential) devices.setPower(d.id, !!d.night);
    },
  },
};

module.exports = {
  list: () => Object.entries(SCENES).map(([id, s]) => ({ id, name: s.name })),
  run(id) { if (!SCENES[id]) throw new Error('unknown scene'); SCENES[id].run(); },
};
