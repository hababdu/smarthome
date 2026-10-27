import React, { useState, useEffect } from 'react';
import {
  Home,
  Zap,
  Sparkles,
  Clock,
  Mic,
  CheckCircle2,
} from 'lucide-react';
import { Header } from './components/Header';
import { HomeScreen } from './components/HomeScreen';
import { EnergyScreen } from './components/EnergyScreen';
import { ScenesScreen } from './components/ScenesScreen';
import { SchedulesScreen } from './components/SchedulesScreen';
import { VoiceModal } from './components/VoiceModal';
import { SimulatorModal } from './components/SimulatorModal';
import { SmartHome3DModal } from './components/SmartHome3DModal';
import { Device, Room, SafetyAlert, Language } from './types';
import { fetchHome, setDevicePower, runScene, createWebSocket } from './services/api';
import { triggerHaptic } from './utils/haptics';

export function App() {
  const [tab, setTab] = useState<number>(0);
  const [lang, setLang] = useState<Language>('uz');
  const [rooms, setRooms] = useState<Room[]>([]);
  const [devices, setDevices] = useState<Device[]>([]);
  const [totalWatts, setTotalWatts] = useState<number>(0);
  const [alert, setAlert] = useState<SafetyAlert | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isVoiceOpen, setIsVoiceOpen] = useState<boolean>(false);
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [is3DOpen, setIs3DOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initial load
  const loadInitialData = async () => {
    try {
      setLoading(true);
      const snapshot = await fetchHome();
      setRooms(snapshot.rooms || []);
      setDevices(snapshot.devices || []);
      setTotalWatts(snapshot.totalWatts || 0);
    } catch (e) {
      console.error('Error fetching initial home snapshot:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();

    // Connect WebSocket
    const cleanupWs = createWebSocket(
      (data) => {
        if (data.type === 'snapshot') {
          setRooms(data.rooms || []);
          setDevices(data.devices || []);
          setTotalWatts(data.totalWatts || 0);
        } else if (data.type === 'state') {
          setDevices((prev) => {
            const updated = prev.map((d) => {
              if (d.id === data.id) {
                return {
                  ...d,
                  ...data.state,
                };
              }
              return d;
            });
            // Recalculate total watts
            const newTotal = updated.reduce(
              (acc, d) => acc + (d.on ? Number(d.watts || 0) : 0),
              0
            );
            setTotalWatts(Math.round(newTotal));
            return updated;
          });
        } else if (data.type === 'alert') {
          setAlert({
            message: data.message,
            level: data.level || 'warning',
            deviceId: data.deviceId,
            ts: data.ts,
          });
        }
      },
      (connected) => setIsConnected(connected)
    );

    return () => {
      cleanupWs();
    };
  }, []);

  const handleTogglePower = async (id: string, nextState: boolean) => {
    // Trigger subtle tactile haptic feedback on device switch
    triggerHaptic('toggle');

    // Optimistic local update
    setDevices((prev) =>
      prev.map((d) => (d.id === id ? { ...d, on: nextState, watts: nextState ? d.ratedWatts : 0 } : d))
    );
    try {
      await setDevicePower(id, nextState);
    } catch (e) {
      console.error(e);
      loadInitialData(); // Rollback if error
    }
  };

  const handleRunQuickAction = async (actionKey: string) => {
    // Trigger crisp double-pulse haptic feedback on quick action execution
    triggerHaptic('quickAction');

    try {
      if (actionKey === 'all_off') {
        // Turn off all except essential fridge
        setDevices((prev) =>
          prev.map((d) => (d.essential ? d : { ...d, on: false, watts: 0 }))
        );
        await runScene('all_off');
        setToastMessage(
          lang === 'uz'
            ? "Barcha qurilmalar o'chirildi (muzlatkich qoldi)"
            : 'Все устройства отключены (кроме холодильника)'
        );
      } else if (actionKey === 'evening') {
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id === 'living-light' || d.id === 'living-tv' || d.id === 'kitchen-light') {
              return { ...d, on: true, watts: d.ratedWatts };
            }
            if (d.essential) return d;
            return { ...d, on: false, watts: 0 };
          })
        );
        await runScene('evening');
        setToastMessage(
          lang === 'uz' ? '«Oqshom rejimi» faollashtirildi' : 'Вечерний режим активирован'
        );
      } else if (actionKey === 'good_night') {
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id === 'bedroom-light') return { ...d, on: true, watts: d.ratedWatts };
            if (d.essential) return d;
            return { ...d, on: false, watts: 0 };
          })
        );
        await runScene('good_night');
        setToastMessage(
          lang === 'uz' ? '«Xayrli tun» rejimi faollashtirildi' : 'Режим «Спокойной ночи» активирован'
        );
      } else if (actionKey === 'morning') {
        setDevices((prev) =>
          prev.map((d) => {
            if (d.id === 'kitchen-light' || d.id === 'kitchen-coffee' || d.id === 'bedroom-light') {
              return { ...d, on: true, watts: d.ratedWatts };
            }
            if (d.essential) return d;
            return { ...d, on: false, watts: 0 };
          })
        );
        await runScene('morning');
        setToastMessage(
          lang === 'uz' ? '«Ertalab» rejimi faollashtirildi' : 'Утренний режим активирован'
        );
      } else {
        await runScene(actionKey);
      }
      setTimeout(() => setToastMessage(null), 3000);
    } catch (err: any) {
      console.error('Quick action failed:', err);
    }
  };

  const navItems = [
    { label: lang === 'uz' ? 'Uy' : 'Дом', icon: Home },
    { label: lang === 'uz' ? 'Energiya' : 'Энергия', icon: Zap },
    { label: lang === 'uz' ? 'Stsenariy' : 'Сценарии', icon: Sparkles },
    { label: lang === 'uz' ? 'Jadvallar' : 'Таймеры', icon: Clock },
  ];

  return (
    <div className="min-h-screen text-white flex flex-col font-sans selection:bg-[#0A84FF]">
      {/* Top Header */}
      <Header
        totalWatts={totalWatts}
        maxWatts={7000}
        isConnected={isConnected}
        alert={alert}
        lang={lang}
        onLanguageChange={setLang}
        onOpenSimulator={() => setIsSimulatorOpen(true)}
        onOpen3DView={() => setIs3DOpen(true)}
      />

      {/* Floating Action Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 control-tile bg-[#0A84FF] text-white px-4 py-2 rounded-full shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-2 duration-200">
          <CheckCircle2 className="w-4 h-4 text-white" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 max-w-md w-full mx-auto px-3.5 pt-4 pb-28">
        {loading && devices.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-white/50 gap-3">
            <div className="w-9 h-9 border-2 border-[#0A84FF] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs font-medium">
              {lang === 'uz' ? 'SmartHome tizimi yuklanmoqda...' : 'Загрузка системы SmartHome...'}
            </p>
          </div>
        ) : (
          <>
            {tab === 0 && (
              <HomeScreen
                rooms={rooms}
                devices={devices}
                totalWatts={totalWatts}
                maxWatts={7000}
                alert={alert}
                onDismissAlert={() => setAlert(null)}
                onTogglePower={handleTogglePower}
                onRunQuickAction={handleRunQuickAction}
                onOpen3DView={() => setIs3DOpen(true)}
                lang={lang}
              />
            )}
            {tab === 1 && <EnergyScreen lang={lang} />}
            {tab === 2 && <ScenesScreen lang={lang} />}
            {tab === 3 && <SchedulesScreen devices={devices} lang={lang} />}
          </>
        )}
      </main>

      {/* Floating Apple Glass Bottom Navigation Dock */}
      <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-sm control-center-panel rounded-full px-3 py-1.5 shadow-2xl flex items-center justify-between">
        {/* Tab 0: Home */}
        <button
          onClick={() => setTab(0)}
          className={`flex flex-col items-center py-1 px-3 rounded-full transition cursor-pointer ${
            tab === 0 ? 'text-[#0A84FF] font-semibold' : 'text-white/50 hover:text-white'
          }`}
        >
          <Home className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">{navItems[0].label}</span>
        </button>

        {/* Tab 1: Energy */}
        <button
          onClick={() => setTab(1)}
          className={`flex flex-col items-center py-1 px-3 rounded-full transition cursor-pointer ${
            tab === 1 ? 'text-[#0A84FF] font-semibold' : 'text-white/50 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">{navItems[1].label}</span>
        </button>

        {/* Center Mic Action Button */}
        <button
          onClick={() => setIsVoiceOpen(true)}
          title={lang === 'uz' ? 'Ovozli yordamchi' : 'Голосовой помощник'}
          className="w-11 h-11 rounded-full bg-[#0A84FF] hover:bg-[#0A84FF]/90 active:scale-95 text-white shadow-lg shadow-blue-500/30 flex items-center justify-center transition cursor-pointer flex-shrink-0"
        >
          <Mic className="w-5 h-5" />
        </button>

        {/* Tab 2: Scenes */}
        <button
          onClick={() => setTab(2)}
          className={`flex flex-col items-center py-1 px-3 rounded-full transition cursor-pointer ${
            tab === 2 ? 'text-[#0A84FF] font-semibold' : 'text-white/50 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">{navItems[2].label}</span>
        </button>

        {/* Tab 3: Schedules */}
        <button
          onClick={() => setTab(3)}
          className={`flex flex-col items-center py-1 px-3 rounded-full transition cursor-pointer ${
            tab === 3 ? 'text-[#0A84FF] font-semibold' : 'text-white/50 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span className="text-[10px] tracking-tight mt-0.5">{navItems[3].label}</span>
        </button>
      </div>

      {/* Voice Assistant Modal */}
      <VoiceModal
        isOpen={isVoiceOpen}
        onClose={() => setIsVoiceOpen(false)}
        lang={lang}
        onLanguageChange={setLang}
        onActionSuccess={loadInitialData}
      />

      {/* Simulator / Safety Test Modal */}
      <SimulatorModal
        isOpen={isSimulatorOpen}
        onClose={() => setIsSimulatorOpen(false)}
        devices={devices}
        totalWatts={totalWatts}
        maxWatts={7000}
        lang={lang}
      />

      {/* 3D Smart Home Three.js Digital Twin Modal */}
      <SmartHome3DModal
        isOpen={is3DOpen}
        onClose={() => setIs3DOpen(false)}
        devices={devices}
        totalWatts={totalWatts}
        lang={lang}
        onTogglePower={handleTogglePower}
        onRunQuickAction={handleRunQuickAction}
      />
    </div>
  );
}
export default App;
