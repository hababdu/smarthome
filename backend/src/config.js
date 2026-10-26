module.exports = {
  port: +process.env.PORT || 3000,
  apiToken: process.env.API_TOKEN || 'change-me',
  mqttUrl: process.env.MQTT_URL || '',
  mqttPort: +process.env.MQTT_PORT || 1883,
  simulate: (process.env.SIMULATE || 'true') === 'true',
  tariff: +process.env.TARIFF_UZS_PER_KWH || 1000,
  maxTotalWatts: +process.env.MAX_TOTAL_WATTS || 7000,
};
