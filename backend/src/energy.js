const DAY = 86400000;

/** Namunalardan (t, id, w) qurilma bo'yicha kWh hisoblaydi. */
function sampleKwh(samples, from, to) {
  const by = {};
  for (const s of samples) {
    if (s.t >= from && s.t <= to) (by[s.id] ||= []).push(s);
  }
  const per = {};
  for (const [id, arr] of Object.entries(by)) {
    arr.sort((a, b) => a.t - b.t);
    let wh = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      const dt = Math.min(arr[i + 1].t - arr[i].t, 5 * 60000); // katta bo'shliqlarni kesamiz
      wh += (arr[i].w * dt) / 3600000;
    }
    per[id] = wh / 1000;
  }
  return per;
}

function report(samples, tariff, now = Date.now()) {
  const mk = (days) => {
    const perDevice = sampleKwh(samples, now - days * DAY, now);
    const kwh = Object.values(perDevice).reduce((a, b) => a + b, 0);
    return { kwh: +kwh.toFixed(3), cost: Math.round(kwh * tariff), perDevice };
  };
  return { day: mk(1), week: mk(7), month: mk(30), tariff };
}

function tips(rep, devices, lang = 'uz') {
  const top = Object.entries(rep.week.perDevice).sort((a, b) => b[1] - a[1])[0];
  const out = [];
  if (top) {
    const d = devices.find((x) => x.id === top[0]);
    const n = d ? d.name[lang] : top[0];
    out.push(lang === 'ru'
      ? `Больше всего энергии за неделю: ${n} (${top[1].toFixed(1)} кВт·ч). Проверьте, нужно ли оставлять его включённым.`
      : `Haftada eng ko'p tok: ${n} (${top[1].toFixed(1)} kWh). Keraksiz vaqtda yoqilgan qoldirmang.`);
  }
  out.push(lang === 'ru'
    ? 'Сценарий «Ухожу из дома» отключает лишнюю нагрузку.'
    : "«Uydan ketish» stsenariysi keraksiz yuklamalarni o'chirib, tejaydi.");
  return out;
}

module.exports = { report, tips, sampleKwh };
