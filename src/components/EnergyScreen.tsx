import React, { useEffect, useState } from 'react';
import { Bolt, TrendingUp, Sparkles, AlertCircle, RefreshCw, DollarSign } from 'lucide-react';
import { EnergyReport, Language } from '../types';
import { fetchEnergy, updateTariff } from '../services/api';

interface EnergyScreenProps {
  lang: Language;
}

export const EnergyScreen: React.FC<EnergyScreenProps> = ({ lang }) => {
  const [report, setReport] = useState<EnergyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditingTariff, setIsEditingTariff] = useState(false);
  const [customTariff, setCustomTariff] = useState('1000');

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchEnergy(lang);
      setReport(data);
      setCustomTariff(String(data.tariff || 1000));
    } catch (err: any) {
      setError(err.message || 'Error loading energy data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [lang]);

  const handleSaveTariff = async () => {
    const val = Number(customTariff);
    if (val > 0) {
      await updateTariff(val);
      setIsEditingTariff(false);
      loadData();
    }
  };

  if (loading && !report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] text-white/50 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-[#0A84FF]" />
        <p className="text-sm font-medium">{lang === 'uz' ? 'Ma\'lumotlar yuklanmoqda...' : 'Загрузка данных...'}</p>
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="control-tile rounded-2xl p-6 text-center text-[#FF453A] border-[#FF453A]/30 max-w-md mx-auto">
        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-[#FF453A]" />
        <p className="text-sm">{error || 'Failed to load report'}</p>
        <button
          onClick={loadData}
          className="mt-3 px-4 py-2 bg-[#FF453A] hover:bg-[#FF453A]/80 rounded-full text-xs text-white font-medium cursor-pointer transition"
        >
          {lang === 'uz' ? 'Qayta urinish' : 'Повторить'}
        </button>
      </div>
    );
  }

  // Sorted per-device weekly consumption
  const perDeviceEntries = Object.entries(report.week?.perDevice || {}).sort(
    (a, b) => (b[1] || 0) - (a[1] || 0)
  );
  const maxWeeklyKwh = perDeviceEntries.length > 0 ? Math.max(0.001, perDeviceEntries[0][1]) : 1;

  const periods = [
    {
      title: lang === 'uz' ? 'Bugun' : 'Сегодня',
      data: report.day,
      desc: lang === 'uz' ? '24 soat' : '24 ч.',
    },
    {
      title: lang === 'uz' ? 'Hafta' : 'Неделя',
      data: report.week,
      desc: lang === 'uz' ? '7 kun' : '7 дней',
    },
    {
      title: lang === 'uz' ? 'Oy' : 'Месяц',
      data: report.month,
      desc: lang === 'uz' ? '30 kun' : '30 дней',
    },
  ];

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto">
      {/* Title & Refresh */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {lang === 'uz' ? 'Energiya sarfi' : 'Энергия и затраты'}
          </h2>
          <p className="text-[11px] text-white/50">
            {lang === 'uz' ? 'Elektr hisoboti va tahlili' : 'Аналитика и расходы'}
          </p>
        </div>

        <button
          onClick={loadData}
          className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center transition cursor-pointer"
          title="Yangilash"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 3 Apple-Style Capsule Cards */}
      <div className="control-center-panel rounded-3xl p-3.5 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          {periods.map((p, idx) => (
            <div
              key={idx}
              className="control-tile rounded-2xl p-3 flex flex-col justify-between"
            >
              <div className="text-[11px] font-semibold text-white/60 flex items-center justify-between">
                <span>{p.title}</span>
                <Bolt className="w-3 h-3 text-[#FF9F0A]" />
              </div>
              <div className="mt-2 text-lg font-mono font-bold text-white">
                {p.data?.kwh.toFixed(1)}{' '}
                <span className="text-[10px] font-normal text-white/50">kWh</span>
              </div>
              <div className="text-[11px] text-[#0A84FF] font-medium mt-1 truncate">
                ~{p.data?.cost?.toLocaleString() || 0} {lang === 'uz' ? "so'm" : 'сум'}
              </div>
            </div>
          ))}
        </div>

        {/* Tariff Capsule Bar */}
        <div className="control-tile rounded-2xl p-3 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-white/70">
            <div className="w-7 h-7 rounded-full bg-[#30D158] flex items-center justify-center text-white">
              <DollarSign className="w-3.5 h-3.5" />
            </div>
            <span>
              {lang === 'uz' ? 'Tarif:' : 'Тариф:'}{' '}
              <strong className="text-white font-mono">{report.tariff}</strong> {lang === 'uz' ? "so'm/kWh" : 'сум'}
            </span>
          </div>

          {isEditingTariff ? (
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                value={customTariff}
                onChange={(e) => setCustomTariff(e.target.value)}
                className="w-16 px-2 py-1 bg-white/[0.1] border border-white/20 rounded-lg text-white text-xs font-mono"
              />
              <button
                onClick={handleSaveTariff}
                className="px-2.5 py-1 bg-[#0A84FF] rounded-full text-white font-medium text-[11px] cursor-pointer"
              >
                OK
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditingTariff(true)}
              className="text-[#0A84FF] hover:underline font-medium text-[11px] cursor-pointer"
            >
              {lang === 'uz' ? 'O\'zgartirish' : 'Изменить'}
            </button>
          )}
        </div>
      </div>

      {/* Weekly Consumption Ranking in Control Center Container */}
      <div className="control-center-panel rounded-3xl p-3.5 space-y-3">
        <div className="flex items-center justify-between px-1">
          <span className="font-semibold text-xs text-white flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#0A84FF]" />
            {lang === 'uz' ? 'Haftalik sarf qurilmalar bo\'yicha' : 'Расход устройств за неделю'}
          </span>
          <span className="text-[11px] text-white/40">{perDeviceEntries.length} {lang === 'uz' ? 'qurilma' : 'устройств'}</span>
        </div>

        <div className="space-y-2.5">
          {perDeviceEntries.map(([devId, kwh]) => {
            const ratio = Math.max(0.06, kwh / maxWeeklyKwh);
            return (
              <div key={devId} className="control-tile rounded-2xl p-2.5 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-white capitalize">{devId.replace('-', ' ')}</span>
                  <span className="font-mono text-white/60 text-[11px]">{kwh.toFixed(2)} kWh</span>
                </div>
                <div className="w-full h-2 rounded-full bg-white/[0.1] overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#0A84FF] to-[#64D2FF] rounded-full transition-all duration-300"
                    style={{ width: `${ratio * 100}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Saving Tips */}
      <div className="control-tile rounded-3xl p-3.5 space-y-2 border-[#30D158]/30 bg-[#30D158]/10">
        <div className="text-xs font-semibold text-[#30D158] flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{lang === 'uz' ? 'Tejash tavsiyalari' : 'Советы по экономии'}</span>
        </div>
        <div className="space-y-1 text-xs text-white/80 leading-relaxed pl-1">
          {report.tips && report.tips.map((tip, i) => (
            <p key={i}>• {tip}</p>
          ))}
        </div>
      </div>
    </div>
  );
};
