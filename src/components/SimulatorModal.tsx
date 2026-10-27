import React, { useState } from 'react';
import { Cpu, Zap, AlertTriangle, X, CheckCircle2, ShieldAlert, Activity } from 'lucide-react';
import { Device, Language } from '../types';
import { injectSpike } from '../services/api';

interface SimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  devices: Device[];
  totalWatts: number;
  maxWatts?: number;
  lang: Language;
}

export const SimulatorModal: React.FC<SimulatorModalProps> = ({
  isOpen,
  onClose,
  devices,
  totalWatts,
  maxWatts = 7000,
  lang,
}) => {
  const [spikeDevice, setSpikeDevice] = useState<string>('kitchen-iron');
  const [spikeWatts, setSpikeWatts] = useState<number>(6500);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleInjectSpike = async () => {
    try {
      setLoading(true);
      await injectSpike(spikeDevice, spikeWatts);
      setStatusMsg(
        lang === 'uz'
          ? `⚡ ${spikeWatts}W yuklama yuborildi! Xavfsizlik moduli darhol o'chiradi.`
          : `⚡ Подана нагрузка ${spikeWatts}W! Модуль безопасности мгновенно отключит прибор.`
      );
      setTimeout(() => setStatusMsg(null), 4000);
    } catch (e: any) {
      setStatusMsg(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="control-center-panel w-full max-w-md rounded-3xl p-5 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#64D2FF] text-black flex items-center justify-center font-bold">
              <Cpu className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">
                {lang === 'uz' ? 'Xavfsizlik & Simulyator' : 'Симулятор и Безопасность'}
              </h3>
              <p className="text-[10px] text-white/50">
                ESP32 + MQTT apparat taqlidi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Status Notification */}
        {statusMsg && (
          <div className="mt-4 p-3 bg-amber-950/60 border border-amber-500/40 rounded-xl text-xs text-amber-200 flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* 3-Layer Architecture Card */}
        <div className="mt-3.5 control-tile rounded-2xl p-3.5 space-y-1.5 text-xs">
          <div className="font-semibold text-white/90 flex items-center gap-2">
            <ShieldAlert className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span>{lang === 'uz' ? '3 Qatlamli Himoya Tizimi:' : '3-Уровневая защита:'}</span>
          </div>
          <ul className="text-[11px] text-white/60 space-y-1 pl-1">
            <li>• <strong>1. Apparat:</strong> Avtomat & UZO (fizik himoya).</li>
            <li>• <strong>2. Firmware:</strong> ESP32 nominaldan 3x oshganda darhol uzadi.</li>
            <li>• <strong>3. Backend (Safety.js):</strong> 3x oshganda zudlik bilan, ortiqcha yuklamada esa ustuvorlik bo'yicha uzish.</li>
          </ul>
        </div>

        {/* Test Tool 1: Short-Circuit Spike */}
        <div className="mt-3 control-tile rounded-2xl p-3.5 space-y-2.5 bg-[#FF453A]/10 border-[#FF453A]/30">
          <div className="flex items-center gap-2 text-[#FF453A] text-xs font-semibold">
            <AlertTriangle className="w-4 h-4" />
            <span>{lang === 'uz' ? 'Qisqa tutashuv / Tok zarbasi testi' : 'Тест на короткое замыкание'}</span>
          </div>
          <p className="text-[11px] text-white/60 leading-relaxed">
            {lang === 'uz'
              ? 'Tanlangan qurilma quvvatini birdan 3x dan oshirib yuboradi. Safety.js zudlik bilan releyni uzadi.'
              : 'Резко превышает номинал прибора в 3 раза. Модуль безопасности немедленно отключает реле.'}
          </p>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] text-white/50 block mb-1">
                {lang === 'uz' ? 'Qurilma:' : 'Устройство:'}
              </label>
              <select
                value={spikeDevice}
                onChange={(e) => setSpikeDevice(e.target.value)}
                className="w-full bg-white/[0.1] border border-white/20 rounded-xl px-2 py-1.5 text-xs text-white"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id} className="bg-[#24242C] text-white">
                    {d.name[lang] || d.name.uz} ({d.ratedWatts}W)
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-1">
                {lang === 'uz' ? 'Zarba (W):' : 'Мощность (Вт):'}
              </label>
              <input
                type="number"
                value={spikeWatts}
                onChange={(e) => setSpikeWatts(Number(e.target.value))}
                className="w-full bg-white/[0.1] border border-white/20 rounded-xl px-2 py-1.5 text-xs text-white font-mono"
              />
            </div>
          </div>

          <button
            onClick={handleInjectSpike}
            disabled={loading}
            className="w-full py-2 bg-[#FF453A] hover:bg-[#FF453A]/90 disabled:opacity-40 text-white rounded-full text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>{lang === 'uz' ? 'Tok zarbasini yuborish (Spike)' : 'Смоделировать скачок'}</span>
          </button>
        </div>

        {/* Live Simulator telemetry indicator */}
        <div className="mt-3 pt-3 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-white/50">
          <div className="flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-[#30D158]" />
            <span>{lang === 'uz' ? 'Simulyator faol' : 'Симулятор активен'}</span>
          </div>
          <span className="font-mono text-white font-semibold">{totalWatts} W</span>
        </div>
      </div>
    </div>
  );
};

