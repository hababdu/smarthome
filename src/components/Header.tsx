import React from 'react';
import {
  Wifi,
  WifiOff,
  SlidersHorizontal,
  Box,
  Cpu,
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { Language, SafetyAlert } from '../types';

interface HeaderProps {
  totalWatts: number;
  maxWatts?: number;
  isConnected: boolean;
  alert: SafetyAlert | null;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  onOpenSimulator: () => void;
  onOpen3DView: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalWatts,
  maxWatts = 7000,
  isConnected,
  alert,
  lang,
  onLanguageChange,
  onOpenSimulator,
  onOpen3DView,
}) => {
  const percentage = Math.min(100, Math.round((totalWatts / maxWatts) * 100));
  const isHighLoad = percentage > 85;

  return (
    <header className="sticky top-0 z-30 bg-[#16161B]/80 backdrop-blur-2xl border-b border-white/[0.08] px-4 py-2.5 transition-colors">
      <div className="max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Apple macOS-style Left: Brand & WiFi */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-[#0A84FF] flex items-center justify-center text-white font-bold text-xs shadow-md shadow-blue-500/20">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm text-white tracking-tight">
                SmartHome
              </span>
              <span className="text-[10px] text-white/50 font-medium">
                {lang === 'uz' ? 'Boshqaruv' : 'Центр'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-white/60">
              {isConnected ? (
                <span className="flex items-center gap-1 text-[#30D158]">
                  <Wifi className="w-3 h-3" />
                  <span>{lang === 'uz' ? 'Onlayn' : 'В сети'}</span>
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[#FF9F0A]">
                  <WifiOff className="w-3 h-3" />
                  <span>{lang === 'uz' ? 'Ulanmoqda' : 'Поиск...'}</span>
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: Load, 3D, Test, Lang */}
        <div className="flex items-center gap-2">
          {/* Quick Safety / Load pill */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.08] border border-white/[0.08] text-[11px]">
            {alert ? (
              <ShieldAlert className="w-3.5 h-3.5 text-[#FF453A]" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-[#30D158]" />
            )}
            <span className={`font-mono font-medium ${isHighLoad ? 'text-[#FF9F0A]' : 'text-white'}`}>
              {totalWatts}W
            </span>
          </div>

          {/* 3D Model Button */}
          <button
            onClick={onOpen3DView}
            title={lang === 'uz' ? '3D Uy Modeli' : '3D Модель Дома'}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/[0.08] transition cursor-pointer"
          >
            <Box className="w-3.5 h-3.5 text-[#0A84FF]" />
          </button>

          {/* Simulator Button */}
          <button
            onClick={onOpenSimulator}
            title={lang === 'uz' ? 'Xavfsizlik testi' : 'Тест безопасности'}
            className="flex items-center justify-center w-7 h-7 rounded-full bg-white/[0.08] hover:bg-white/[0.14] text-white/80 hover:text-white border border-white/[0.08] transition cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[#64D2FF]" />
          </button>

          {/* Language Switch Capsule */}
          <div className="flex items-center p-0.5 rounded-full bg-white/[0.08] border border-white/[0.08]">
            <button
              onClick={() => onLanguageChange('uz')}
              className={`px-2 py-0.5 text-[10px] rounded-full font-semibold transition ${
                lang === 'uz'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => onLanguageChange('ru')}
              className={`px-2 py-0.5 text-[10px] rounded-full font-semibold transition ${
                lang === 'ru'
                  ? 'bg-white text-black shadow-sm'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              RU
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
