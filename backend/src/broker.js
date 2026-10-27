// MQTT: o'rnatilgan Aedes broker (yoki tashqi broker) + klient.
const net = require('net');
const mqtt = require('mqtt');
const cfg = require('./config');

function startBroker() {
  if (cfg.mqttUrl) return null; // tashqi broker (Mosquitto/EMQX) ishlatiladi
  try {
    const Aedes = require('aedes');
    const aedes = (Aedes.createBroker || Aedes)();
    const server = net.createServer(aedes.handle);
    server.on('error', (err) => {
      console.warn(`[mqtt] broker port ${cfg.mqttPort} ogohlantirish:`, err.message);
    });
    server.listen(cfg.mqttPort, '127.0.0.1', () =>
      console.log(`[mqtt] o'rnatilgan broker 127.0.0.1:${cfg.mqttPort}`));
    return aedes;
  } catch (err) {
    console.warn('[mqtt] broker ishga tushirishda xato:', err.message);
    return null;
  }
}

function connect(clientId = 'smarthome-backend') {
  const url = cfg.mqttUrl || `mqtt://127.0.0.1:${cfg.mqttPort}`;
  const c = mqtt.connect(url, { clientId, reconnectPeriod: 2000 });
  c.on('connect', () => console.log(`[mqtt] ${clientId} ulandi: ${url}`));
  c.on('error', (e) => console.error('[mqtt] xato:', e.message));
  return c;
}

module.exports = { startBroker, connect };
