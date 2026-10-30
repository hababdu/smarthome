# SmartHome Electric Assistant

SmartHome boshqaruv paneli (React/Vite), Node.js API, MQTT qurilma qatlami, ESP32 firmware va Flutter mobil ilovasi.

## Muhim xavfsizlik eslatmasi

- Haqiqiy elektr qurilmalarini boshqarishdan oldin apparat himoyasi, rele turi, sensor kalibrovkasi va fail-safe holatini malakali elektrik bilan tekshiring. Dasturiy himoya avtomat/UZO o'rnini bosmaydi.
- `API_TOKEN` kamida 24 belgili tasodifiy maxfiy qiymat bo'lishi kerak. `change-me` ishlatmang.
- `VITE_API_TOKEN` Vite orqali brauzer bundle'iga kiritiladi va foydalanuvchilardan yashirin emas. Shu sababli bu tokenli usul faqat ishonchli lokal demo/LAN uchun. Internetga chiqarishdan oldin haqiqiy foydalanuvchi login/session autentifikatsiyasi va rolga asoslangan ruxsatlar qo'shilishi shart.
- Embedded MQTT broker faqat `127.0.0.1` ga bog'langan. ESP32 boshqa qurilmada bo'lsa, autentifikatsiya va ACL yoqilgan Mosquitto/EMQX kabi alohida broker ishlating; broker portini himoyasiz internetga ochmang.
- Simulyatsiya standart holatda o‘chiq. Demo uchun `.env` ichida `SIMULATE=true` qiling; haqiqiy qurilmalarda `SIMULATE=false` qoldiring.

## Ishga tushirish (Node.js 22+)

1. `.env.example` nusxasini `.env` nomi bilan yarating.
2. Tasodifiy token yarating, masalan macOS/Linux terminalida:

   ```bash
   openssl rand -hex 32
   ```

3. `.env` faylida `API_TOKEN` va `VITE_API_TOKEN` qiymatlarini aynan bir xil token bilan almashtiring. `GEMINI_API_KEY` faqat audio transkripsiyasi kerak bo'lsa to'ldiriladi.
4. Bog'liqliklarni o'rnating va ishga tushiring:

   ```bash
   npm install
   npm run dev
   ```

5. Demo/simulyator kerak bo‘lsa, `.env` ichida `SIMULATE=true` qiling. Haqiqiy apparat uchun `false` qoldiring.
6. Testlar:

   ```bash
   npm test
   ```

## API misollari

Tokenni terminaldagi muhit o'zgaruvchisidan oling; tokenni GitHub yoki frontend kodiga yozmang.

```bash
curl -H "Authorization: Bearer $API_TOKEN" http://localhost:3000/health
curl -H "Authorization: Bearer $API_TOKEN" http://localhost:3000/api/home
```

`/health` faqat servis holatini bildiradi; u qurilmalar ishlayotganini kafolatlamaydi.

## Flutter

Android emulyatorida backend manzili `http://10.0.2.2:3000`; haqiqiy telefonda server kompyuterining lokal IP manzilidan foydalaning. Flutter build/run vaqtida `API_TOKEN` va `API_URL` `--dart-define` orqali beriladi:

```bash
flutter run --dart-define=API_URL=http://10.0.2.2:3000 --dart-define=API_TOKEN=YOUR_LONG_TOKEN
```

Bu tokenni mobil ilova ichidan ham chiqarib olish mumkin; internetga mo'ljallangan release uchun per-user autentifikatsiya zarur.

## MQTT

- Local demo: embedded broker `127.0.0.1:1883`.
- ESP32 bilan: `MQTT_URL`, `MQTT_USERNAME`, `MQTT_PASSWORD` orqali autentifikatsiyalangan broker sozlang. Broker ACL har bir qurilmaga faqat o'zining `home/<id>/cmd`, `state` va `status` mavzulariga kerakli ruxsatni berishi kerak.
- ESP32 firmware'dagi Wi-Fi, broker va qurilma sozlamalarini real muhitga moslang.

## Test qamrovi

Unit testlar asosiy NLU, xavfsizlik va energiya integratsiyasini tekshiradi. Ular API autentifikatsiyasi, haqiqiy MQTT broker, ESP32 apparati yoki elektr xavfsizligini to'liq tasdiqlamaydi; bu yo'nalishlar alohida integratsion va laboratoriya sinovlarini talab qiladi.

## Figma-ready design kit

The `figma-kit/` directory contains editable/importable SVG mockups for onboarding, the mobile home dashboard, bedroom controls, energy usage, and a desktop dashboard, plus design tokens and a component inventory. See `figma-kit/README.md` for import instructions. These are Figma-importable SVG assets, not a native `.fig` file.
