import React, { useEffect, useState } from 'react';
import { LogOut, Moon, Sparkles, CheckCircle2, Play, RefreshCw, Coffee, PowerOff } from 'lucide-react';
import { Scene, Language } from '../types';
import { fetchScenes, runScene } from '../services/api';

interface ScenesScreenProps {
  lang: Language;
}

export const ScenesScreen: React.FC<ScenesScreenProps> = ({ lang }) => {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadScenes = async () => {
    try {
      setLoading(true);
      const data = await fetchScenes();
      setScenes(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadScenes();
  }, []);

  const handleRun = async (scene: Scene) => {
    try {
      setRunningId(scene.id);
      await runScene(scene.id);
      const sceneTitle = scene.name[lang] || scene.name.uz;
      setFeedback(
        lang === 'uz' ? `«${sceneTitle}» bajarildi!` : `Сценарий «${sceneTitle}» выполнен!`
      );
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || 'Error running scene');
    } finally {
      setRunningId(null);
    }
  };

  const getSceneBadge = (id: string) => {
    if (id === 'all_off') {
      return { icon: PowerOff, bg: 'bg-[#FF453A]', color: 'text-white' };
    }
    if (id === 'evening') {
      return { icon: Sparkles, bg: 'bg-[#FF9F0A]', color: 'text-white' };
    }
    if (id === 'morning') {
      return { icon: Coffee, bg: 'bg-[#30D158]', color: 'text-white' };
    }
    if (id === 'leave_home') {
      return { icon: LogOut, bg: 'bg-[#FF375F]', color: 'text-white' };
    }
    if (id === 'good_night') {
      return { icon: Moon, bg: 'bg-[#5E5CE6]', color: 'text-white' };
    }
    return { icon: Sparkles, bg: 'bg-[#0A84FF]', color: 'text-white' };
  };

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto">
      {/* Title */}
      <div className="px-1">
        <h2 className="text-xl font-bold text-white tracking-tight">
          {lang === 'uz' ? 'Stsenariylar' : 'Сценарии'}
        </h2>
        <p className="text-[11px] text-white/50">
          {lang === 'uz'
            ? 'Bir tegish orqali butun uy muhitini boshqaring'
            : 'Автоматизация дома в одно касание'}
        </p>
      </div>

      {/* Toast Feedback */}
      {feedback && (
        <div className="control-tile rounded-2xl p-3 flex items-center gap-2.5 text-xs text-white bg-[#30D158]/20 border-[#30D158]/40 shadow-xl animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-[#30D158] flex-shrink-0" />
          <span>{feedback}</span>
        </div>
      )}

      {/* Scenes List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <RefreshCw className="w-6 h-6 animate-spin text-[#0A84FF]" />
        </div>
      ) : (
        <div className="control-center-panel rounded-3xl p-3.5 space-y-2.5">
          {scenes.map((scene) => {
            const isExecuting = runningId === scene.id;
            const badge = getSceneBadge(scene.id);
            const Icon = badge.icon;

            return (
              <div
                key={scene.id}
                className="control-tile rounded-2xl p-3.5 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-full ${badge.bg} flex items-center justify-center flex-shrink-0 shadow-md`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-xs font-semibold text-white truncate">
                      {scene.name[lang] || scene.name.uz}
                    </h3>
                    <p className="text-[11px] text-white/50 truncate mt-0.5">
                      {scene.id === 'all_off'
                        ? (lang === 'uz' ? 'Faqat muzlatkich qoladi' : 'Кроме холодильника')
                        : scene.id === 'evening'
                        ? (lang === 'uz' ? 'Mehmonxona & TV yoniq' : 'Гостиная и ТВ')
                        : scene.id === 'morning'
                        ? (lang === 'uz' ? 'Kofevarka va chiroq' : 'Кофеварка и свет')
                        : scene.id === 'leave_home'
                        ? (lang === 'uz' ? "Barcha ortiqchasi o'chadi" : 'Отключает лишнее')
                        : (lang === 'uz' ? 'Tungi chiroq yoniq' : 'Ночник в спальне')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleRun(scene)}
                  disabled={isExecuting}
                  className="px-3 py-1.5 bg-[#0A84FF] hover:bg-[#0A84FF]/80 disabled:opacity-50 text-white rounded-full font-semibold text-xs flex items-center gap-1.5 cursor-pointer shadow-md transition"
                >
                  {isExecuting ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <Play className="w-3 h-3 fill-current" />
                  )}
                  <span>{lang === 'uz' ? 'Bajarish' : 'Пуск'}</span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
