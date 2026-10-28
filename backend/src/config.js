// Central configuration. Production must provide secrets explicitly.
const positiveNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

module.exports = {
  port: positiveNumber(process.env.PORT, 3000),
  apiToken: process.env.API_TOKEN || '',
  mqttUrl: process.env.MQTT_URL || '',
  mqttUsername: process.env.MQTT_USERNAME || '',
  mqttPassword: process.env.MQTT_PASSWORD || '',
  mqttPort: positiveNumber(process.env.MQTT_PORT, 1883),
  mqttBindHost: process.env.MQTT_BIND_HOST || '127.0.0.1',
  simulate: (process.env.SIMULATE || 'false').toLowerCase() === 'true',
  tariff: positiveNumber(process.env.TARIFF_UZS_PER_KWH, 1000),
  maxTotalWatts: positiveNumber(process.env.MAX_TOTAL_WATTS, 7000),
  nodeEnv: process.env.NODE_ENV || 'development',
};
