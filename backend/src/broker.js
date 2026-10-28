// MQTT broker/client. The embedded broker is loopback-only by default.
const net = require('net');
const mqtt = require('mqtt');
const cfg = require('./config');

function startBroker() {
  if (cfg.mqttUrl) return null; // Use Mosquitto/EMQX for hardware or multi-host deployments.
  try {
    const Aedes = require('aedes');
    const aedes = (Aedes.createBroker || Aedes)();
    const server = net.createServer(aedes.handle);
    server.on('error', (err) => {
      console.warn(`[mqtt] broker port ${cfg.mqttPort} warning:`, err.message);
    });
    server.listen(cfg.mqttPort, cfg.mqttBindHost, () =>
      console.log(`[mqtt] embedded broker listening at ${cfg.mqttBindHost}:${cfg.mqttPort}`));
    return aedes;
  } catch (err) {
    console.warn('[mqtt] broker startup failed:', err.message);
    return null;
  }
}

function connect(clientId = 'smarthome-backend') {
  const url = cfg.mqttUrl || `mqtt://127.0.0.1:${cfg.mqttPort}`;
  const options = {
    clientId,
    reconnectPeriod: 2000,
    connectTimeout: 10000,
    clean: true,
  };
  if (cfg.mqttUsername) options.username = cfg.mqttUsername;
  if (cfg.mqttPassword) options.password = cfg.mqttPassword;
  const c = mqtt.connect(url, options);
  c.on('connect', () => console.log(`[mqtt] ${clientId} connected`));
  c.on('error', (e) => console.error('[mqtt] error:', e.message));
  return c;
}

module.exports = { startBroker, connect };
