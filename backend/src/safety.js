// Xavfsizlik mantig'i.
// MUHIM: bu dasturiy qatlam. Haqiqiy himoya uchun avtomat (UZO/MCB) va qurilma ichidagi
// apparat himoyasi shart — bu modul ularning o'rnini bosmaydi.

const SPIKE_FACTOR = 3;       // nominaldan 3x oshsa — qisqa tutashuv shubhasi
const OVERLOAD_FACTOR = 1.3;  // nominaldan 30% oshib, davom etsa — ortiqcha yuklama
const OVERLOAD_SECONDS = 10;

/** Bitta qurilma quvvatini tekshiradi. state — Map (ortiqcha yuklama boshlanish vaqti). */
function checkDevice(device, watts, state, now = Date.now()) {
  if (watts > device.ratedWatts * SPIKE_FACTOR) {
    return { level: 'critical', action: 'cut', reason: `Quvvat keskin oshdi (${Math.round(watts)}W): qisqa tutashuv shubhasi` };
  }
  if (watts > device.ratedWatts * OVERLOAD_FACTOR) {
    const since = state.get(device.id) ?? now;
    state.set(device.id, since);
    if (now - since > OVERLOAD_SECONDS * 1000) {
      return { level: 'warning', action: 'cut', reason: `Uzoq ortiqcha yuklama (${Math.round(watts)}W)` };
    }
  } else state.delete(device.id);
  return null;
}

/** Uy umumiy yuklamasi chegaradan oshsa, eng kam muhim qurilmalar ro'yxatini qaytaradi. */
function shedList(devices, powerById, maxTotal) {
  let total = Object.values(powerById).reduce((a, b) => a + b, 0);
  if (total <= maxTotal) return [];
  const cut = [];
  const candidates = devices
    .filter((d) => !d.essential && (powerById[d.id] || 0) > 0)
    .sort((a, b) => b.priority - a.priority || (powerById[b.id] || 0) - (powerById[a.id] || 0));
  for (const d of candidates) {
    if (total <= maxTotal) break;
    cut.push(d.id);
    total -= powerById[d.id];
  }
  return cut;
}

module.exports = { checkDevice, shedList };
