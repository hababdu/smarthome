// Qurilmalar yo'q paytda test uchun: MQTT orqali haqiqiy ESP32 kabi javob beradi.
const store = require('./store');
const { connect } = require('./broker');

function start() {
  const c = connect('simulator');
  const sim = new Map(store.db.devices.map((d) => [d.id, { on: false }]));
  c.on('connect', () => {
    c.subscribe('home/+/cmd');
    for (const id of sim.keys()) c.publish(`home/${id}/status`, 'online', { retain: true });
  });
  c.on('message', (topic, buf) => {
    const id = topic.split('/')[1];
    if (sim.has(id)) sim.get(id).on = buf.toString() === 'ON';
  });
  setInterval(() => {
    for (const d of store.db.devices) {
      const s = sim.get(d.id);
      const noise = 1 + (Math.random() - 0.5) * 0.1;
      const watts = s.on ? d.ratedWatts * noise : 0;
      c.publish(`home/${d.id}/state`, JSON.stringify({ on: s.on, watts: +watts.toFixed(1) }));
    }
  }, 3000);
  instance = {
    spike(id, watts) { c.publish(`home/${id}/state`, JSON.stringify({ on: true, watts })); },
    c,
  };
  return instance;
}

let instance = null;

module.exports = {
  start,
  spike: (id, watts) => {
    if (instance) instance.spike(id, watts);
  },
  getInstance: () => instance,
};

