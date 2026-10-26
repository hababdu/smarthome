# SmartHome Electric Assistant (MVP)

Uy chiroq/rozetkalarini ovoz (o'zbek/rus) va ilova orqali boshqarish, xavfsizlik monitori, energiya analitikasi, stsenariylar va jadvallar.

```
backend/    Node.js: REST + WebSocket + MQTT + NLU + xavfsizlik + energiya
mobile/     Flutter ilova (Uy, Energiya, Stsenariy, Ovozli yordamchi)
firmware/   ESP32 reley + tok sensori (Arduino)
docs/       Arxitektura va UI/UX
```

## Tez ishga tushirish (qurilmasiz — simulyator bilan)

```bash
cd backend
cp .env.example .env        # API_TOKEN ni o'zgartiring
npm install
export TZ=Asia/Tashkent     # jadval to'g'ri vaqtda ishlashi uchun
npm start                   # API :3000, MQTT :1883, simulyator yoqilgan
npm test                    # NLU, xavfsizlik, energiya testlari
npm run demo                # kutubxonasiz demo (npm install shart emas)
```

Tekshirish:
```bash
curl -H "Authorization: Bearer change-me" localhost:3000/api/home
curl -X POST -H "Authorization: Bearer change-me" -H "Content-Type: application/json" \
  -d '{"text":"Mehmonxonadagi chiroqni yoq"}' localhost:3000/api/voice
```

## Mobil ilova

```bash
cd mobile
flutter create . --project-name smarthome_assistant   # android/ios papkalarini yaratadi
flutter pub get
flutter run --dart-define=API_URL=http://<KOMPYUTER_IP>:3000 --dart-define=API_TOKEN=change-me
```
- Android: `android/app/src/main/AndroidManifest.xml` ga `<uses-permission android:name="android.permission.RECORD_AUDIO"/>`, `INTERNET` va `<application android:usesCleartextTraffic="true">` (faqat lokal tarmoq uchun) qo'shing.
- iOS: `Info.plist` ga `NSMicrophoneUsageDescription` va `NSSpeechRecognitionUsageDescription`.
- O'zbek tilida nutqni tanish/aytish qurilmaga bog'liq; bo'lmasa rus tiliga o'tadi yoki matn maydonidan foydalaning.

## Haqiqiy qurilmalar
`firmware/esp32_relay/esp32_relay.ino` ni yuklang (`DEVICE_ID` ni `backend/src/store.js` dagi id ga moslang), `.env` da `SIMULATE=false` qiling.
Qurilmalarni `store.js` (keyin `data.json`) da o'zgartiring.

## Muhim eslatmalar
- Qisqa tutashuv/ortiqcha yuklamadan **asosiy himoya apparat bo'lishi shart** (avtomat, UZO). Dasturiy o'chirish qo'shimcha qatlam.
- 220V bilan ishlashni malakali elektrikka topshiring.
- Tarif `TARIFF_UZS_PER_KWH` da — haqiqiy tarifingizga moslang.
- Kod hozircha yig'ib sinab ko'rilmagan qismlar: Flutter ilova (`flutter analyze` ishlatib ko'ring) va ESP32 firmware; backend mantig'i testlardan o'tgan.
