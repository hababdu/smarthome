const store = require('./store');
const devices = require('./devices');

const SCENES = {
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
