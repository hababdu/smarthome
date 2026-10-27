import React, { useEffect, useState } from 'react';
import { Clock, Plus, Trash2, Calendar, Check, AlertCircle, RefreshCw } from 'lucide-react';
import { Schedule, Device, Language } from '../types';
import { fetchSchedules, createSchedule, deleteSchedule } from '../services/api';

interface SchedulesScreenProps {
  devices: Device[];
  lang: Language;
}

export const SchedulesScreen: React.FC<SchedulesScreenProps> = ({ devices, lang }) => {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [time, setTime] = useState('07:00');
  const [action, setAction] = useState<'on' | 'off'>('on');
  const [selectedDevice, setSelectedDevice] = useState<string>(devices[0]?.id || 'kitchen-coffee');

  const loadData = async () => {
    try {
      setLoading(true);
      const data = await fetchSchedules();
      setSchedules(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSchedule({
        time,
        action,
        deviceIds: [selectedDevice],
      });
      setIsAdding(false);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteSchedule(id);
      loadData();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4 pb-28 max-w-md mx-auto">
      {/* Title & Add Button */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {lang === 'uz' ? 'Jadvallar va Taymerlar' : 'Таймеры и расписания'}
          </h2>
          <p className="text-[11px] text-white/50">
            {lang === 'uz' ? 'Avtomatlashtirilgan vazifalar' : 'Автоматические задачи'}
          </p>
        </div>

        <button
          onClick={() => setIsAdding(!isAdding)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A84FF] hover:bg-[#0A84FF]/80 text-white rounded-full text-xs font-semibold cursor-pointer shadow-md transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>{lang === 'uz' ? 'Yangi' : 'Новое'}</span>
        </button>
      </div>

      {/* Add Form Panel */}
      {isAdding && (
        <form
          onSubmit={handleCreate}
          className="control-center-panel rounded-3xl p-4 space-y-3 shadow-xl animate-in fade-in duration-200"
        >
          <h3 className="text-xs font-semibold text-white">
            {lang === 'uz' ? 'Yangi avtomatik jadval' : 'Новое расписание'}
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div>
              <label className="block text-[11px] text-white/60 mb-1">
                {lang === 'uz' ? 'Vaqt' : 'Время'}
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                required
                className="w-full bg-white/[0.1] border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
              />
            </div>

            <div>
              <label className="block text-[11px] text-white/60 mb-1">
                {lang === 'uz' ? 'Amal' : 'Действие'}
              </label>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as 'on' | 'off')}
                className="w-full bg-[#2A2A32] border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
              >
                <option value="on">{lang === 'uz' ? 'Yoqish (ON)' : 'Включить'}</option>
                <option value="off">{lang === 'uz' ? "O'chirish (OFF)" : 'Выключить'}</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-white/60 mb-1">
                {lang === 'uz' ? 'Qurilma' : 'Устройство'}
              </label>
              <select
                value={selectedDevice}
                onChange={(e) => setSelectedDevice(e.target.value)}
                className="w-full bg-[#2A2A32] border border-white/20 rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-[#0A84FF]"
              >
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name[lang] || d.name.uz}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsAdding(false)}
              className="px-3 py-1.5 text-xs text-white/60 hover:text-white"
            >
              {lang === 'uz' ? 'Bekor' : 'Отмена'}
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 bg-[#0A84FF] text-white rounded-full text-xs font-semibold cursor-pointer"
            >
              {lang === 'uz' ? 'Saqlash' : 'Сохранить'}
            </button>
          </div>
        </form>
      )}

      {/* Schedules List */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-white/40">
          <RefreshCw className="w-6 h-6 animate-spin text-[#0A84FF]" />
        </div>
      ) : schedules.length === 0 ? (
        <div className="control-tile rounded-3xl p-6 text-center text-white/50 space-y-2">
          <Clock className="w-8 h-8 mx-auto text-white/30" />
          <p className="text-xs">
            {lang === 'uz' ? 'Hech qanday jadval o\'rnatilmagan' : 'Расписаний пока нет'}
          </p>
        </div>
      ) : (
        <div className="control-center-panel rounded-3xl p-3.5 space-y-2.5">
          {schedules.map((s) => {
            const dev = devices.find((d) => s.deviceIds?.includes(d.id));
            const devName = dev ? dev.name[lang] || dev.name.uz : s.scene || 'Qurilma';
            const actionText =
              s.action === 'on'
                ? lang === 'uz'
                  ? 'yoqiladi'
                  : 'включится'
                : lang === 'uz'
                ? "o'chiriladi"
                : 'выключится';

            return (
              <div
                key={s.id}
                className="control-tile rounded-2xl p-3 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-[#0A84FF]/20 border border-[#0A84FF]/30 flex items-center justify-center text-[#0A84FF] font-mono text-xs font-bold">
                    {s.time}
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <span className="capitalize">{devName}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                        s.action === 'on' ? 'bg-[#30D158]/20 text-[#30D158]' : 'bg-white/10 text-white/60'
                      }`}>
                        {actionText}
                      </span>
                    </div>
                    {s.lastRun && (
                      <span className="text-[10px] text-white/40 mt-0.5 block">
                        {lang === 'uz' ? 'Oxirgi:' : 'Запуск:'} {s.lastRun}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(s.id)}
                  className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-[#FF453A]/20 hover:text-[#FF453A] flex items-center justify-center text-white/40 transition cursor-pointer"
                  title="O'chirish"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
