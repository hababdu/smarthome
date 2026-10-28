// Ovozli buyruq matni -> amal -> javob matni (TTS uchun). Til: uz/ru.
const nlu = require('./nlu');
const store = require('./store');
const devices = require('./devices');
const scenes = require('./scenes');
const scheduler = require('./scheduler');
const energy = require('./energy');
const cfg = require('./config');

const T = {
  uz: {
    on: (n) => `${n} uchun yoqish buyrug'i yuborildi, tasdiq kutilmoqda`, off: (n) => `${n} uchun o'chirish buyrug'i yuborildi, tasdiq kutilmoqda`,
    isOn: (n, w) => `Ha, ${n} yoniq, ${w} vatt`, isOff: (n) => `Yo'q, ${n} o'chiq`,
    offline: (n) => `${n} tarmoqda emas`,
    notFound: "Bunday qurilmani topa olmadim", unknown: "Tushunmadim. Masalan: «mehmonxonadagi chiroqni o'chir»", clarify: "Qaysi xona yoki qurilmani nazarda tutdingiz? Iltimos, aniqroq ayting.",
    scene: (n) => `${n} stsenariysi bajarildi`,
    sched: (n, t, a) => `Soat ${t} da ${n} ${a === 'on' ? 'yoqiladi' : "o'chiriladi"}`,
    noTime: "Qaysi soatda? Masalan: «soat 7 da kofevarkani yoq»",
    energy: (k, c) => `Bugun ${k} kilovatt-soat, taxminan ${c} so'm`,
  },
  ru: {
    on: (n) => `Команда включения для ${n} отправлена, ожидается подтверждение`, off: (n) => `Команда выключения для ${n} отправлена, ожидается подтверждение`,
    isOn: (n, w) => `Да, включено: ${n}, ${w} ватт`, isOff: (n) => `Нет, выключено: ${n}`,
    offline: (n) => `${n} не в сети`,
    notFound: 'Не нашла такое устройство', unknown: 'Не поняла. Например: «выключи свет в гостиной»', clarify: 'Уточните, пожалуйста, комнату или конкретное устройство.',
    scene: (n) => `Сценарий «${n}» выполнен`,
    sched: (n, t, a) => `В ${t} ${n} ${a === 'on' ? 'включится' : 'выключится'}`,
    noTime: 'На какое время? Например: «включи кофеварку в 7 утра»',
    energy: (k, c) => `Сегодня ${k} киловатт-часов, примерно ${c} сумов`,
  },
};

function resolve(p) {
  let list = store.db.devices;
  if (p.room) list = list.filter((d) => d.room === p.room);
  if (p.device) list = list.filter((d) => d.kind === p.device);
  else if (p.room) list = list.filter((d) => d.kind === 'light'); // faqat xona aytilsa — chiroqlar
  return p.room || p.device ? list : [];
}
const label = (ds, lang) => ds.length === 1 ? ds[0].name[lang] : `${ds.length} ${lang === 'ru' ? 'устройства' : 'ta qurilma'}`;

function handle(text) {
  const p = nlu.parse(text);
  const t = T[p.lang];
  const done = (reply, extra = {}) => ({ reply, lang: p.lang, intent: p.intent, ...extra });

  if (p.intent === 'scene') {
    try {
      scenes.run(p.scene);
      return done(t.scene(scenes.list().find((s) => s.id === p.scene).name[p.lang]));
    } catch (err) {
      return done(p.lang === 'ru' ? 'Не удалось выполнить сценарий: проверьте подключение устройств.' : 'Ssenariy bajarilmadi: qurilmalar ulanishini tekshiring.');
    }
  }
  if (p.intent === 'energy') {
    const r = energy.report(store.db.samples, cfg.tariff);
    return done(t.energy(r.day.kwh.toFixed(1), r.day.cost));
  }
  if (p.intent === 'unknown') return done(t.unknown);

  const targets = resolve(p);
  if (!targets.length) return done(t.notFound);
  if (targets.length > 1 && !p.room && p.intent !== 'query') return done(t.clarify);

  if (p.intent === 'query') {
    const parts = targets.map((d) => {
      const st = devices.state.get(d.id);
      if (!st.online) return t.offline(d.name[p.lang]);
      return st.on ? t.isOn(d.name[p.lang], Math.round(st.watts)) : t.isOff(d.name[p.lang]);
    });
    return done(parts.join('. '));
  }
  if (p.intent === 'turn_on' || p.intent === 'turn_off') {
    const on = p.intent === 'turn_on';
    const offline = targets.filter((d) => !devices.state.get(d.id)?.online);
    if (offline.length) return done(t.offline(label(offline, p.lang)));
    try {
      targets.forEach((d) => devices.setPower(d.id, on));
      return done((on ? t.on : t.off)(label(targets, p.lang)));
    } catch (err) {
      return done(p.lang === 'ru' ? 'Команда не отправлена. Проверьте подключение устройства.' : 'Buyruq yuborilmadi. Qurilma ulanishini tekshiring.');
    }
  }
  if (p.intent.startsWith('schedule')) {
    if (!p.time) return done(t.noTime);
    const action = p.intent === 'schedule_on' ? 'on' : 'off';
    try {
      scheduler.add({ time: p.time, action, deviceIds: targets.map((d) => d.id) });
      return done(t.sched(label(targets, p.lang), p.time, action));
    } catch (err) {
      return done(p.lang === 'ru' ? 'Не удалось сохранить расписание. Проверьте время и устройство.' : 'Jadval saqlanmadi. Vaqt va qurilmani tekshiring.');
    }
  }
  return done(t.unknown);
}

module.exports = { handle };
