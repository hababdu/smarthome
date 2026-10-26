# SmartHome Electric Assistant — arxitektura

## 1. Texnik arxitektura

```
 ┌────────────┐  HTTPS/WSS   ┌──────────────────────────────┐   MQTT    ┌─────────────────┐
 │ Flutter    │◄────────────►│ Backend (Node.js)            │◄─────────►│ MQTT broker     │
 │ ilova      │  REST + WS   │ • REST API + WebSocket       │           │ (Aedes/Mosquitto│
 │ STT + TTS  │              │ • NLU (uz/ru)                │           │  /EMQX)         │
 └────────────┘              │ • Xavfsizlik monitori        │           └───────┬─────────┘
                             │ • Energiya analitikasi       │                   │ MQTT
                             │ • Scheduler / Stsenariylar   │      ┌────────────┼─────────────┐
                             └──────────────────────────────┘      ▼            ▼             ▼
                                                                ESP32+reley  ESP32+reley   Tuya/Zigbee
                                                                +tok sensori +tok sensori  (Zigbee2MQTT
                                                                                           yoki Tuya Cloud)
```

**Qatlamlar**
- **Mobil ilova** — UI, mikrofon (speech_to_text), ovozli javob (flutter_tts). Faqat matnni backendga yuboradi, NLU backendda (ikki platforma uchun bir xil mantiq).
- **Backend** — yagona "miya". Qurilmalarga faqat MQTT orqali buyruq beradi, holatni MQTT dan oladi.
- **MQTT** — yengil, uzilishga bardoshli (LWT, retained, QoS1). Uyda Mosquitto/EMQX, prototipda o'rnatilgan Aedes.
- **Qurilmalar** — (a) ESP32 + reley + tok sensori (ACS712 yoki PZEM-004T) — o'zingiz yig'adigan variant; (b) Tuya/Zigbee tayyor rozetkalar: Zigbee2MQTT ularni xuddi shu `home/<id>/...` mavzulariga ko'prik qiladi (adapter kerak), Tuya uchun Tuya Cloud API yoki Local Tuya.

**MQTT mavzulari**

| Mavzu | Yo'nalish | Mazmun |
|---|---|---|
| `home/<id>/cmd` | backend → qurilma | `ON` / `OFF` |
| `home/<id>/state` | qurilma → backend | `{"on":true,"watts":43.2}` |
| `home/<id>/status` | qurilma → backend | `online` / `offline` (LWT, retained) |

**Xavfsizlik (3 qatlam)**
1. **Apparat**: avtomat + UZO + saqlagich (majburiy, dasturga bog'liq emas).
2. **Firmware**: ESP32 o'zi nominaldan 3x oshganda releyni uzadi (server aloqasiz ham ishlaydi).
3. **Backend** (`safety.js`): nominaldan 3x — zudlik bilan o'chirish ("qisqa tutashuv shubhasi"); 1.3x va 10 s dan ortiq — o'chirish; uy bo'yicha umumiy limit oshsa — `priority` bo'yicha eng kam muhim qurilmalarni o'chirish (muzlatkich `essential` — hech qachon). Ogohlantirish WebSocket orqali ilovaga boradi.

Mobil/serverga kirish: Bearer token (MVP). Ishlab chiqarishda: JWT + HTTPS + MQTT username/parol va TLS.

## 2. UI/UX struktura

Uslub: minimal, zamonaviy, Dark Mode, mobile-first.

| Modul | Mazmun |
|---|---|
| **Uy (Home)** | Jami yuklama (W); ogohlantirish banneri; xonalar bo'yicha qurilma kartalari: ikonka, nom, holat/quvvat, switch. Offline qurilma xira. `essential` qurilmani qo'lda o'chirib bo'lmaydi |
| **Mikrofon (FAB)** | Bottom sheet: katta mikrofon tugmasi, jonli matn (partial), javob matni + TTS, til tanlash (uz/ru), matn bilan yozish zaxirasi |
| **Energiya** | Bugun / hafta / oy: kWh va so'm; qurilmalar bo'yicha sarf; tejash tavsiyalari |
| **Stsenariylar** | "Uydan ketish", "Xayrli tun" kartalari + bir tugma |
| **Keyingi bosqich** | Jadvallar ro'yxati ekrani, xonalar/qurilmalar qo'shish, push bildirishnomalar, oylik grafik (fl_chart) |

## 3. Ovozli buyruqlar (NLU)

Qoidalarga asoslangan (oflayn, tez), `nlu.js`. Qo'llab-quvvatlanadi:
- `Mehmonxonadagi chiroqni o'chir` / `Выключи свет в спальне`
- `Dazmol yoqilganmi?` / `Утюг включен?`
- `Ertalab soat 7 da kofevarkani yoq` / `Включи кофеварку в 7 утра`
- `Xayrli tun`, `Uydan ketyapman` / `Я ухожу`, `Спокойной ночи`

Keyingi bosqich: erkinroq tushunish uchun LLM (masalan Claude API) ni fallback sifatida ulash — NLU `unknown` qaytarganda matnni modelga yuborib, tuzilgan JSON olish. Wake-word ("Yordamchi") uchun Porcupine kabi qurilma ichidagi kutubxona kerak; hozir mikrofon tugmasi bilan ishga tushadi.
