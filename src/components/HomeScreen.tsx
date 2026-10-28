import React, { useState } from 'react';
import {
  Lightbulb,
  Tv,
  Coffee,
  Refrigerator,
  Zap,
  Power,
  Moon,
  Sparkles,
  Box,
  Sliders,
  Cast,
  Sun,
  Volume2,
  VolumeX,
  Lock,
  AlertTriangle,
  X,
  Check,
  Radio,
  SlidersHorizontal,
} from 'lucide-react';
import { Device, Room, SafetyAlert, Language } from '../types';
import { triggerHaptic } from '../utils/haptics';

interface HomeScreenProps {
  rooms: Room[];
  devices: Device[];
  totalWatts: number;
  maxWatts?: number;
  alert: SafetyAlert | null;
  onDismissAlert: () => void;
  onTogglePower: (id: string, nextState: boolean) => void;
  onRunQuickAction: (actionKey: string) => void;
  onOpen3DView: () => void;
  lang: Language;
}

export const HomeScreen: React.FC<HomeScreenProps> = ({
  rooms,
  devices,
  totalWatts,
  maxWatts = 7000,
  alert,
  onDismissAlert,
  onTogglePower,
  onRunQuickAction,
  onOpen3DView,
  lang,
}) => {
  const [interactiveBrightness, setInteractiveBrightness] = useState<number>(75);
  const loadPercentage = Math.min(100, Math.round((totalWatts / maxWatts) * 100));

  // Find devices
  const livingLight = devices.find((d) => d.id === 'living-light');
  const livingTv = devices.find((d) => d.id === 'living-tv');
  const bedroomLight = devices.find((d) => d.id === 'bedroom-light');
  const kitchenLight = devices.find((d) => d.id === 'kitchen-light');
  const kitchenCoffee = devices.find((d) => d.id === 'kitchen-coffee');
  const kitchenFridge = devices.find((d) => d.id === 'kitchen-fridge');
  const kitchenIron = devices.find((d) => d.id === 'kitchen-iron');

  // Quick State evaluations
  const allLightsOn = [livingLight, bedroomLight, kitchenLight].every((d) => d?.on);
  const anyLightOn = [livingLight, bedroomLight, kitchenLight].some((d) => d?.on);
  const lightsCount = [livingLight, bedroomLight, kitchenLight].filter((d) => d?.on).length;

  const isGoodNightActive =
    bedroomLight?.on && !livingLight?.on && !kitchenLight?.on && !livingTv?.on;
  const isEveningActive =
    livingLight?.on && livingTv?.on && kitchenLight?.on && !bedroomLight?.on;

  // Toggle All Lights
  const handleToggleAllLights = () => {
    triggerHaptic('toggle');
    const nextState = !anyLightOn;
    if (livingLight) onTogglePower(livingLight.id, nextState);
    if (bedroomLight) onTogglePower(bedroomLight.id, nextState);
    if (kitchenLight) onTogglePower(kitchenLight.id, nextState);
  };

  const getDeviceIcon = (kind: string, isOn: boolean) => {
    const iconClass = 'w-4 h-4 text-white';
    switch (kind) {
      case 'light':
        return <Lightbulb className={iconClass} />;
      case 'tv':
        return <Tv className={iconClass} />;
      case 'iron':
        return <Zap className={iconClass} />;
      case 'coffee':
        return <Coffee className={iconClass} />;
      case 'fridge':
        return <Refrigerator className={iconClass} />;
      default:
        return <Power className={iconClass} />;
    }
  };

  const capitalize = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto">
      {/* Alert Card if Active */}
      {alert && (
        <div
          className={`control-tile rounded-2xl p-3.5 flex items-start justify-between gap-3 shadow-xl animate-in fade-in duration-200 ${
            alert.level === 'critical'
              ? 'bg-[#FF453A]/20 border-[#FF453A]/40 text-[#FF453A]'
              : 'bg-[#FF9F0A]/20 border-[#FF9F0A]/40 text-[#FF9F0A]'
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                alert.level === 'critical' ? 'bg-[#FF453A] text-white' : 'bg-[#FF9F0A] text-black'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                {alert.level === 'critical'
                  ? (lang === 'uz' ? 'Xavf: Qisqa tutashuv' : 'Тревога: Короткое замыкание')
                  : (lang === 'uz' ? 'Ortiqcha yuklama' : 'Перегрузка сети')}
              </div>
              <p className="text-xs font-medium text-white/90 mt-0.5 leading-snug">{alert.message}</p>
            </div>
          </div>
          <button
            onClick={onDismissAlert}
            className="p-1 rounded-full hover:bg-white/10 transition text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ======================================================== */}
      {/* APPLE CONTROL CENTER MAIN BENTO PANEL (MATCHING IMAGE) */}
      {/* ======================================================== */}
      <div className="control-center-panel rounded-3xl p-3.5 sm:p-4 space-y-3">
        {/* TOP ROW: 2 Columns */}
        <div className="grid grid-cols-2 gap-3">
          {/* LEFT COLUMN: Stacked 3-Row Module (like Wi-Fi / Bluetooth / AirDrop) */}
          <div className="control-tile rounded-2xl p-3 flex flex-col justify-between gap-2.5">
            {/* Row 1: Wi-Fi / Yoritish (Lights) */}
            <button
              onClick={handleToggleAllLights}
              className="flex items-center gap-2.5 text-left w-full group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  anyLightOn
                    ? 'bg-[#0A84FF] text-white shadow-md shadow-blue-500/25'
                    : 'bg-white/[0.12] text-white/70 group-hover:bg-white/[0.18]'
                }`}
              >
                <Lightbulb className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-white truncate leading-tight">
                  {lang === 'uz' ? 'Yoritish' : 'Wi-Fi'}
                </div>
                <div className="text-[11px] text-white/50 truncate leading-tight mt-0.5">
                  {anyLightOn
                    ? lang === 'uz'
                      ? `${lightsCount} ta yoniq`
                      : `${lightsCount} вкл.`
                    : lang === 'uz'
                    ? "O'chiq"
                    : 'Выкл.'}
                </div>
              </div>
            </button>

            {/* Row 2: Bluetooth / Televizor (TV) */}
            <button
              onClick={() => livingTv && onTogglePower(livingTv.id, !livingTv.on)}
              className="flex items-center gap-2.5 text-left w-full group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  livingTv?.on
                    ? 'bg-[#0A84FF] text-white shadow-md shadow-blue-500/25'
                    : 'bg-white/[0.12] text-white/70 group-hover:bg-white/[0.18]'
                }`}
              >
                <Tv className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-white truncate leading-tight">
                  {lang === 'uz' ? 'Televizor' : 'Bluetooth'}
                </div>
                <div className="text-[11px] text-white/50 truncate leading-tight mt-0.5">
                  {livingTv?.on
                    ? `${Math.round(livingTv.watts)} W`
                    : lang === 'uz'
                    ? "O'chiq"
                    : 'Выкл.'}
                </div>
              </div>
            </button>

            {/* Row 3: AirDrop / Kofevarka (Coffee) */}
            <button
              onClick={() => kitchenCoffee && onTogglePower(kitchenCoffee.id, !kitchenCoffee.on)}
              className="flex items-center gap-2.5 text-left w-full group cursor-pointer"
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  kitchenCoffee?.on
                    ? 'bg-[#30D158] text-white shadow-md shadow-emerald-500/25'
                    : 'bg-white/[0.12] text-white/70 group-hover:bg-white/[0.18]'
                }`}
              >
                <Coffee className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-white truncate leading-tight">
                  {lang === 'uz' ? 'Kofevarka' : 'AirDrop'}
                </div>
                <div className="text-[11px] text-white/50 truncate leading-tight mt-0.5">
                  {kitchenCoffee?.on
                    ? `${Math.round(kitchenCoffee.watts)} W`
                    : lang === 'uz'
                    ? "O'chiq"
                    : 'Выкл.'}
                </div>
              </div>
            </button>
          </div>

          {/* RIGHT COLUMN: "Не беспокоить" + 2 Square Tiles */}
          <div className="flex flex-col gap-3 justify-between">
            {/* Top Wide Tile: "Не беспокоить" / "Xayrli tun" */}
            <button
              onClick={() => onRunQuickAction('good_night')}
              className={`control-tile rounded-2xl p-3 flex items-center gap-2.5 cursor-pointer text-left w-full transition-all ${
                isGoodNightActive ? 'bg-[#5E5CE6]/30 border-[#5E5CE6]/50' : ''
              }`}
            >
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                  isGoodNightActive
                    ? 'bg-[#5E5CE6] text-white shadow-md shadow-indigo-500/30'
                    : 'bg-[#5E5CE6] text-white'
                }`}
              >
                <Moon className="w-4 h-4 fill-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold text-xs text-white leading-tight">
                  {lang === 'uz' ? 'Xayrli tun' : 'Не беспо-'}
                </div>
                <div className="font-semibold text-xs text-white leading-tight">
                  {lang === 'uz' ? 'rejimi' : 'коить'}
                </div>
              </div>
            </button>

            {/* Bottom 2 Square Tiles */}
            <div className="grid grid-cols-2 gap-2.5">
              {/* Tile 1: "Яркость клавиш" / "Oqshom rejimi" */}
              <button
                onClick={() => onRunQuickAction('evening')}
                className={`control-tile rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-square ${
                  isEveningActive ? 'bg-[#FF9F0A]/20 border-[#FF9F0A]/50' : ''
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center mb-1 ${
                    isEveningActive ? 'text-[#FF9F0A]' : 'text-white/80'
                  }`}
                >
                  <Sparkles className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-semibold text-white leading-tight">
                  {lang === 'uz' ? 'Oqshom' : 'Яркость'}
                </div>
                <div className="text-[10px] font-semibold text-white leading-tight">
                  {lang === 'uz' ? 'rejimi' : 'клавиш'}
                </div>
              </button>

              {/* Tile 2: "Повтор экрана" / "3D Uy Modeli" */}
              <button
                onClick={onOpen3DView}
                className="control-tile rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-square group"
              >
                <div className="w-7 h-7 rounded-full flex items-center justify-center mb-1 text-white/80 group-hover:text-[#0A84FF] transition">
                  <Box className="w-4 h-4" />
                </div>
                <div className="text-[10px] font-semibold text-white leading-tight">
                  {lang === 'uz' ? '3D Uy' : 'Повтор'}
                </div>
                <div className="text-[10px] font-semibold text-white leading-tight">
                  {lang === 'uz' ? 'Modeli' : 'экрана'}
                </div>
              </button>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ROW 2: "Дисплей" (Display / Elektr yuklamasi Slider Card) */}
        {/* ======================================================== */}
        <div className="control-tile rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <span>{lang === 'uz' ? 'Elektr yuklamasi' : 'Дисплей'}</span>
            <span className="font-mono text-[11px] text-white/60">
              {totalWatts} W <span className="text-white/40">/ {maxWatts}W</span>
            </span>
          </div>

          {/* Thick Capsule Slider Track with Sun Icon */}
          <div className="h-8 rounded-full bg-white/[0.12] p-1 flex items-center relative overflow-hidden">
            {/* Active filled level */}
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                loadPercentage > 85
                  ? 'bg-gradient-to-r from-[#FF453A]/70 to-[#FF453A]'
                  : loadPercentage > 60
                  ? 'bg-gradient-to-r from-[#FF9F0A]/70 to-[#FF9F0A]'
                  : 'bg-gradient-to-r from-white/30 to-white/45'
              }`}
              style={{ width: `${Math.max(6, loadPercentage)}%` }}
            />

            {/* Embedded Left Icon */}
            <div className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-white/60">
              <Sun className="w-4 h-4" />
            </div>

            {/* Percentage text */}
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none font-mono text-[11px] font-semibold text-white/70">
              {loadPercentage}%
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* ROW 3: "Звук" (Sound / Quvvat va Tarif Slider Card)      */}
        {/* ======================================================== */}
        <div className="control-tile rounded-2xl p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-white">
            <span>{lang === 'uz' ? 'Quvvat va xavfsizlik' : 'Звук'}</span>
            <span className="text-[11px] text-white/60 font-mono">
              {lang === 'uz' ? "Tarif: 1000 so'm/kWh" : 'Тариф: 1000 сум'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Slider track with draggable/active white thumb pill */}
            <div className="flex-1 h-8 rounded-full bg-white/[0.12] p-1 flex items-center relative overflow-hidden">
              {/* Floating Pill Thumb on Left (matching screenshot) */}
              <div
                className="bg-white text-black h-full px-3 rounded-full flex items-center justify-center shadow-lg transition-transform"
                style={{ width: '42px' }}
              >
                {totalWatts > 0 ? (
                  <Volume2 className="w-3.5 h-3.5 text-black" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-black/60" />
                )}
              </div>

              {/* Progress background strip */}
              <div
                className="h-full bg-white/20 rounded-r-full -ml-2"
                style={{ width: `${Math.min(100, Math.max(10, loadPercentage))}%` }}
              />
            </div>

            {/* AirPlay-style Circle Button (matches screenshot circle button on right) */}
            <button
              onClick={() => onRunQuickAction('all_off')}
              title={lang === 'uz' ? "Barchasini o'chirish" : 'Выключить всё'}
              className="w-8 h-8 rounded-full bg-white/[0.14] hover:bg-white/[0.24] flex items-center justify-center text-white cursor-pointer transition flex-shrink-0"
            >
              <Cast className="w-4 h-4 text-white/80" />
            </button>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* QUICK ACTIONS ROW (ONE-TAP SCENE SHORTCUTS)              */}
      {/* ======================================================== */}
      <div className="control-center-panel rounded-3xl p-3 sm:p-3.5 space-y-2">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0A84FF]" />
            <span className="text-xs font-semibold text-white/90">
              {lang === 'uz' ? 'Tezkor amallar' : 'Быстрые действия'}
            </span>
          </div>
          <span className="text-[10px] text-white/40">
            {lang === 'uz' ? '1-teginishda faollashtirish' : 'В одно касание'}
          </span>
        </div>

        <div className="grid grid-cols-4 gap-2">
          {/* Action 1: All Off */}
          <button
            onClick={() => onRunQuickAction('all_off')}
            title={lang === 'uz' ? "Barcha chiroq va jihozlarni o'chirish" : 'Выключить всё'}
            className="control-tile rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-white/[0.12] active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-full bg-white/[0.12] group-hover:bg-[#FF453A] group-hover:text-white flex items-center justify-center text-white/80 mb-1 transition-all">
              <Power className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-white truncate max-w-full">
              {lang === 'uz' ? "O'chirish" : 'Все выкл'}
            </span>
          </button>

          {/* Action 2: Evening Mode */}
          <button
            onClick={() => onRunQuickAction('evening')}
            title={lang === 'uz' ? 'Oqshom rejimi: televizor va chiroqlar' : 'Вечерний режим'}
            className={`control-tile rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-white/[0.12] active:scale-95 group ${
              isEveningActive ? 'bg-[#FF9F0A]/20 border-[#FF9F0A]/50' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                isEveningActive
                  ? 'bg-[#FF9F0A] text-white shadow-md shadow-amber-500/25'
                  : 'bg-white/[0.12] text-white/80 group-hover:bg-[#FF9F0A] group-hover:text-white'
              }`}
            >
              <Sun className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-white truncate max-w-full">
              {lang === 'uz' ? 'Oqshom' : 'Вечер'}
            </span>
          </button>

          {/* Action 3: Good Night */}
          <button
            onClick={() => onRunQuickAction('good_night')}
            title={lang === 'uz' ? 'Xayrli tun: faqat yotoqxona' : 'Спокойной ночи'}
            className={`control-tile rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-white/[0.12] active:scale-95 group ${
              isGoodNightActive ? 'bg-[#5E5CE6]/25 border-[#5E5CE6]/50' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 transition-all ${
                isGoodNightActive
                  ? 'bg-[#5E5CE6] text-white shadow-md shadow-indigo-500/30'
                  : 'bg-white/[0.12] text-white/80 group-hover:bg-[#5E5CE6] group-hover:text-white'
              }`}
            >
              <Moon className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-white truncate max-w-full">
              {lang === 'uz' ? 'Tun' : 'Ночь'}
            </span>
          </button>

          {/* Action 4: Morning */}
          <button
            onClick={() => onRunQuickAction('morning')}
            title={lang === 'uz' ? 'Ertalab: oshxona va kofe' : 'Доброе утро'}
            className="control-tile rounded-2xl p-2.5 flex flex-col items-center justify-center text-center cursor-pointer transition-all hover:bg-white/[0.12] active:scale-95 group"
          >
            <div className="w-8 h-8 rounded-full bg-white/[0.12] group-hover:bg-[#30D158] group-hover:text-white flex items-center justify-center text-white/80 mb-1 transition-all">
              <Coffee className="w-4 h-4" />
            </div>
            <span className="text-[10px] font-semibold text-white truncate max-w-full">
              {lang === 'uz' ? 'Ertalab' : 'Утро'}
            </span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ROOMS & DEVICES IN MATCHING APPLE CONTROL CENTER TILES   */}
      {/* ======================================================== */}
      <div className="space-y-4 pt-1">
        <div className="flex items-center justify-between px-1">
          <h3 className="font-semibold text-sm text-white/90">
            {lang === 'uz' ? 'Xonalar va qurilmalar' : 'Комнаты и приборы'}
          </h3>
          <span className="text-xs text-white/50">
            {devices.filter((d) => d.on).length} / {devices.length} {lang === 'uz' ? 'yoniq' : 'вкл.'}
          </span>
        </div>

        {rooms.map((room) => {
          const roomDevices = devices.filter((d) => d.room === room.id);

          return (
            <div key={room.id} className="control-center-panel rounded-3xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between px-1">
                <span className="font-semibold text-xs text-white/80">
                  {room.name[lang] || room.name.uz}
                </span>
                <span className="text-[11px] text-white/40">
                  {roomDevices.filter((d) => d.on).length} {lang === 'uz' ? 'faol' : 'активно'}
                </span>
              </div>

              {/* Grid of Device Tiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {roomDevices.map((device) => {
                  const isEssential = !!device.essential;
                  const isOnline = device.online;
                  const isPending = device.pendingPower !== undefined && device.pendingPower !== null;
                  const canToggle = isOnline && !isEssential && !isPending;

                  // Dynamic color matching Apple Control Center
                  const activeColorClass =
                    device.kind === 'fridge'
                      ? 'bg-[#30D158] shadow-emerald-500/30'
                      : device.kind === 'iron'
                      ? 'bg-[#FF9F0A] shadow-amber-500/30'
                      : 'bg-[#0A84FF] shadow-blue-500/30';

                  return (
                    <div
                      key={device.id}
                      className={`control-tile rounded-2xl p-3 flex items-center justify-between gap-3 transition-all ${
                        device.on
                          ? 'bg-white/[0.09] border-white/[0.14]'
                          : 'bg-white/[0.04] opacity-75'
                      }`}
                    >
                      {/* Left: Round icon + Title/watts */}
                      <button
                        type="button"
                        disabled={!canToggle}
                        onClick={() => canToggle && onTogglePower(device.id, !device.on)}
                        className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer disabled:cursor-not-allowed"
                      >
                        <div
                          className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-all shadow-md ${
                            device.on ? activeColorClass : 'bg-white/[0.12] text-white/60'
                          }`}
                        >
                          {getDeviceIcon(device.kind, device.on)}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-xs text-white truncate leading-tight">
                              {capitalize(device.name[lang] || device.name.uz)}
                            </span>
                            {isEssential && (
                              <span
                                title={
                                  lang === 'uz'
                                    ? 'Muzlatkich doim yoniq turishi shart'
                                    : 'Холодильник всегда включен'
                                }
                                className="text-[#FF9F0A]"
                              >
                                <Lock className="w-3 h-3" />
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-white/50 truncate leading-tight mt-0.5 font-mono">
                            {!isOnline ? (
                              <span>{lang === 'uz' ? 'Tarmoqda emas' : 'Не в сети'}</span>
                            ) : isPending ? (
                              <span className="text-amber-300">{lang === 'uz' ? 'Tasdiq kutilmoqda…' : 'Ожидается подтверждение…'}</span>
                            ) : device.on ? (
                              <span className="text-[#0A84FF] font-medium">{Math.round(device.watts)} W</span>
                            ) : (
                              <span>{lang === 'uz' ? "O'chiq" : 'Выкл.'}</span>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Right: iOS-Style Rounded Switch */}
                      <button
                        type="button"
                        disabled={!canToggle}
                        onClick={() => onTogglePower(device.id, !device.on)}
                        className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                          !canToggle ? 'cursor-not-allowed opacity-40' : ''
                        } ${device.on ? 'bg-[#30D158]' : 'bg-white/20'}`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                            device.on ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
