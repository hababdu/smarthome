// ESP32 reley + tok sensori (ACS712 / PZEM-004T o'rniga ishlatish mumkin)
// Kutubxona: PubSubClient (Nick O'Leary), WiFi (ESP32 core)
// MQTT: home/<ID>/cmd  <- "ON"/"OFF"
//       home/<ID>/state -> {"on":true,"watts":43.2}
//       home/<ID>/status -> "online"/"offline" (LWT, retained)
//
// !!! XAVFSIZLIK: 220V tarmoq bilan ishlash hayot uchun xavfli. Faqat litsenziyali elektrik
// yig'sin. Reley moduli, saqlagich (fuse) va UZO/avtomat albatta bo'lsin.
#include <WiFi.h>
#include <PubSubClient.h>

const char* WIFI_SSID = "YOUR_WIFI";
const char* WIFI_PASS = "YOUR_PASS";
const char* MQTT_HOST = "192.168.1.10";   // backend kompyuter IP si
const int   MQTT_PORT = 1883;
const char* DEVICE_ID = "kitchen-iron";   // backend store.js dagi id bilan bir xil
const float RATED_WATTS = 2000;           // shu qurilmaning nominal quvvati

const int RELAY_PIN = 26;
const int CURRENT_PIN = 34;               // ACS712 analog chiqishi
const float MAINS_V = 220.0;
const float HW_CUT_FACTOR = 3.0;          // MUHIM: backend o'chmasa ham qurilma o'zi uzadi

WiFiClient net;
PubSubClient mqtt(net);
bool relayOn = false;
String tCmd, tState, tStatus;

float readWatts() {
  // ACS712-20A: 100 mV/A, 3.3V ADC. RMS ni 200 ta namunadan hisoblaymiz.
  const int N = 200; double sum = 0, mean = 0; int v[N];
  for (int i = 0; i < N; i++) { v[i] = analogRead(CURRENT_PIN); mean += v[i]; delayMicroseconds(200); }
  mean /= N;
  for (int i = 0; i < N; i++) { double d = v[i] - mean; sum += d * d; }
  double rmsAdc = sqrt(sum / N);
  double amps = (rmsAdc * 3.3 / 4095.0) / 0.100;   // sensor kalibrovkasi talab qilinadi
  if (amps < 0.05) amps = 0;
  return amps * MAINS_V;
}

void setRelay(bool on) {
  relayOn = on;
  digitalWrite(RELAY_PIN, on ? HIGH : LOW);
}

void onMessage(char* topic, byte* payload, unsigned int len) {
  String msg; for (unsigned i = 0; i < len; i++) msg += (char)payload[i];
  if (msg == "ON") setRelay(true);
  else if (msg == "OFF") setRelay(false);
}

void connectMqtt() {
  while (!mqtt.connected()) {
    if (mqtt.connect(DEVICE_ID, nullptr, nullptr, tStatus.c_str(), 1, true, "offline")) {
      mqtt.publish(tStatus.c_str(), "online", true);
      mqtt.subscribe(tCmd.c_str(), 1);
    } else delay(2000);
  }
}

void setup() {
  pinMode(RELAY_PIN, OUTPUT); setRelay(false);
  analogReadResolution(12);
  tCmd = String("home/") + DEVICE_ID + "/cmd";
  tState = String("home/") + DEVICE_ID + "/state";
  tStatus = String("home/") + DEVICE_ID + "/status";
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) delay(300);
  mqtt.setServer(MQTT_HOST, MQTT_PORT);
  mqtt.setCallback(onMessage);
}

unsigned long lastPub = 0;
void loop() {
  if (WiFi.status() != WL_CONNECTED) { setRelay(false); WiFi.reconnect(); delay(1000); return; }
  if (!mqtt.connected()) connectMqtt();
  mqtt.loop();

  float w = relayOn ? readWatts() : 0;
  // Apparat-darajadagi himoya: server bilan aloqadan mustaqil
  if (relayOn && w > RATED_WATTS * HW_CUT_FACTOR) {
    setRelay(false);
    mqtt.publish(tState.c_str(), "{\"on\":false,\"watts\":0,\"fault\":\"overcurrent\"}");
  }
  if (millis() - lastPub > 3000) {
    lastPub = millis();
    char buf[64]; snprintf(buf, sizeof buf, "{\"on\":%s,\"watts\":%.1f}", relayOn ? "true" : "false", w);
    mqtt.publish(tState.c_str(), buf);
  }
}
