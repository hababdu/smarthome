import React from 'react';
import {
  Wifi,
  WifiOff,
  Box,
  Cpu,
  ShieldCheck,
  ShieldAlert,
  Sun,
  Moon,
} from 'lucide-react';
import { Language, SafetyAlert } from '../types';

interface HeaderProps {
  totalWatts: number;
  maxWatts?: number;
  isConnected: boolean;
  alert: SafetyAlert | null;
  lang: Language;
  onLanguageChange: (lang: Language) => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
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
  theme,
  onToggleTheme,
  onOpenSimulator,
  onOpen3DView,
}) => {
  const percentage = Math.min(100, Math.round((totalWatts / maxWatts) * 100));
  const isHighLoad = percentage > 85;

  return (
    <header className="app-header sticky top-0 z-30 backdrop-blur-2xl border-b px-4 py-3 transition-colors">
      <div className="app-header-inner max-w-md mx-auto flex items-center justify-between gap-3">
        {/* Apple macOS-style Left: Brand & WiFi */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-xs shadow-md shadow-violet-500/20">
            ⚡
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-semibold text-sm app-fg tracking-tight">
                SmartHome
              </span>
              <span className="text-[10px] app-muted font-medium">
                {lang === 'uz' ? 'Boshqaruv' : 'Центр'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] app-muted">
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
          <div className="app-status-pill flex items-center gap-1.5 px-2.5 py-1.5 rounded-full border text-[11px]">
            {alert ? (
              <ShieldAlert className="w-3.5 h-3.5 text-[#FF453A]" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5 text-[#30D158]" />
            )}
            <span className={`font-mono font-medium ${isHighLoad ? 'text-[#FF9F0A]' : 'app-fg'}`}>
              {totalWatts}W
            </span>
          </div>

          {/* 3D Model Button */}
          <button
            onClick={onOpen3DView}
            title={lang === 'uz' ? '3D Uy Modeli' : '3D Модель Дома'}
            className="app-icon-button flex items-center justify-center w-8 h-8 rounded-xl transition cursor-pointer"
          >
            <Box className="w-3.5 h-3.5 text-[#0A84FF]" />
          </button>

          {/* Simulator Button */}
          <button
            onClick={onOpenSimulator}
            title={lang === 'uz' ? 'Xavfsizlik testi' : 'Тест безопасности'}
            className="app-icon-button flex items-center justify-center w-8 h-8 rounded-xl transition cursor-pointer"
          >
            <Cpu className="w-3.5 h-3.5 text-[#64D2FF]" />
          </button>

          <button
            onClick={onToggleTheme}
            title={theme === 'dark' ? (lang === 'uz' ? 'Yorug‘ rejim' : 'Светлая тема') : (lang === 'uz' ? 'Qorong‘i rejim' : 'Тёмная тема')}
            aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="app-icon-button flex items-center justify-center w-8 h-8 rounded-xl transition cursor-pointer"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Language Switch Capsule */}
          <div className="app-language-switch flex items-center p-0.5 rounded-full border">
            <button
              onClick={() => onLanguageChange('uz')}
              className={`px-2 py-0.5 text-[10px] rounded-full font-semibold transition ${
                lang === 'uz'
                  ? 'app-language-active shadow-sm'
                  : 'app-muted hover:opacity-100'
              }`}
            >
              UZ
            </button>
            <button
              onClick={() => onLanguageChange('ru')}
              className={`px-2 py-0.5 text-[10px] rounded-full font-semibold transition ${
                lang === 'ru'
                  ? 'app-language-active shadow-sm'
                  : 'app-muted hover:opacity-100'
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
