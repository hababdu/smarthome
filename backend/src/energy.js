const DAY = 86400000;
const MAX_SAMPLE_GAP_MS = 5 * 60000;

/** Integrate measured power. Long gaps are skipped rather than inventing consumption. */
function sampleKwh(samples, from, to) {
  const by = {};
  for (const s of samples) {
    if (!s || typeof s.id !== 'string' || !Number.isFinite(s.t) || !Number.isFinite(s.w) || s.w < 0) continue;
    (by[s.id] ||= []).push(s);
  }
  const per = {};
  for (const [id, arr] of Object.entries(by)) {
    arr.sort((a, b) => a.t - b.t);
    let wh = 0;
    for (let i = 0; i < arr.length - 1; i++) {
      const a = arr[i];
      const b = arr[i + 1];
      const dt = b.t - a.t;
      if (dt <= 0 || dt > MAX_SAMPLE_GAP_MS) continue;
      const start = Math.max(a.t, from);
      const end = Math.min(b.t, to);
      if (end <= start) continue;
      // Linear interpolation at the window edges; trapezoidal integration between samples.
      const ratioStart = (start - a.t) / dt;
      const ratioEnd = (end - a.t) / dt;
      const wStart = a.w + (b.w - a.w) * ratioStart;
      const wEnd = a.w + (b.w - a.w) * ratioEnd;
      wh += ((wStart + wEnd) / 2) * (end - start) / 3600000;
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

module.exports = { report, tips, sampleKwh, MAX_SAMPLE_GAP_MS };
