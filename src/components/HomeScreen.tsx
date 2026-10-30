import React from 'react';
import { Lightbulb, ShieldCheck, Moon, Sun, Leaf, PartyPopper, Plus, ChevronDown, MoreVertical, Refrigerator, Thermometer, Plug, Tv, Coffee, Zap, Power, Box, AlertTriangle, X } from 'lucide-react';
import { Device, Room, SafetyAlert, Language } from '../types';

interface HomeScreenProps {
  rooms: Room[]; devices: Device[]; totalWatts: number; maxWatts?: number; alert: SafetyAlert | null;
  onDismissAlert: () => void; onTogglePower: (id: string, nextState: boolean) => void;
  onRunQuickAction: (actionKey: string) => void; onOpen3DView: () => void; onOpenDevice: (device: Device) => void; lang: Language;
}

const LampArt = () => <svg viewBox="0 0 180 145" className="device-art" aria-hidden="true"><defs><linearGradient id="lampBody" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#45484d"/><stop offset=".55" stopColor="#17191d"/><stop offset="1" stopColor="#050607"/></linearGradient><linearGradient id="lampGlow" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fff9e9"/><stop offset="1" stopColor="#ff9e4d"/></linearGradient></defs><ellipse cx="99" cy="121" rx="63" ry="10" fill="#000" opacity=".35"/><g transform="translate(16 8) rotate(-28 82 62)"><path d="M45 14 Q82 -4 119 14 L111 75 Q82 91 53 75Z" fill="url(#lampBody)"/><ellipse cx="82" cy="75" rx="29" ry="11" fill="#282b2e"/><ellipse cx="82" cy="77" rx="23" ry="7.5" fill="url(#lampGlow)"/><path d="M45 16 Q82 -2 119 16" fill="none" stroke="#666a70" strokeWidth="1.5" opacity=".6"/></g></svg>;
const iconFor = (kind: string) => kind === 'light' ? Lightbulb : kind === 'fridge' ? Refrigerator : kind === 'iron' ? Zap : kind === 'coffee' ? Coffee : kind === 'tv' ? Tv : Plug;
const assetFor = (kind: string) => {
  if (kind === 'light') return '/assets/devices/adjustable_spotlight.png';
  if (kind === 'tv') return '/assets/devices/ceiling_panel.png';
  if (kind === 'iron' || kind === 'coffee') return '/assets/devices/smart_plug.png';
  if (kind === 'fridge') return '/assets/devices/smart_thermostat.png';
  return '/assets/devices/touch_control_panel.png';
};

export const HomeScreen: React.FC<HomeScreenProps> = ({ rooms, devices, totalWatts, maxWatts = 7000, alert, onDismissAlert, onTogglePower, onRunQuickAction, onOpen3DView, onOpenDevice, lang }) => {
  const tr = (uz: string, ru: string) => lang === 'uz' ? uz : ru;
  const lights = devices.filter(d => d.kind === 'light');
  const activeLights = lights.filter(d => d.on).length;
  const featured = devices.filter((device, index, all) => all.findIndex((item) => item.kind === device.kind) === index).slice(0, 4);
  const quickActions = [
    { id: 'good_night', label: tr('Xayrli tun', 'Спокойной ночи'), icon: Moon, color: '#a9a1ff' },
    { id: 'leave_home', label: tr('Uydan tashqarida', 'Нет дома'), icon: ShieldCheck, color: '#9ca3af' },
    { id: 'all_off', label: tr('Tejamkorlik', 'Экономия'), icon: Leaf, color: '#69d99c' },
    { id: 'evening', label: tr('Bayram', 'Вечеринка'), icon: PartyPopper, color: '#ff9867' },
  ];
  return <div className="premium-home space-y-5 pb-28">
    {alert && <div className={`control-tile rounded-2xl p-3 flex items-center gap-3 ${alert.level === 'critical' ? 'border-red-500/50' : 'border-orange-400/50'}`}><AlertTriangle className="text-orange-400"/><p className="flex-1 text-sm">{alert.message}</p><button onClick={onDismissAlert} aria-label="Close"><X size={16}/></button></div>}
    <section className="home-greeting flex items-center justify-between gap-3">
      <div><p className="text-xs app-muted">{tr('Xayrli tong,', 'Доброе утро,')}</p><h1 className="text-xl font-semibold tracking-tight">Michael</h1><button className="mt-2 inline-flex items-center gap-1 text-sm font-medium" onClick={onOpen3DView}>{tr('Mening uyim', 'Мой дом')} <ChevronDown size={14}/></button></div>
      <div className="profile-avatar" aria-label="Profile">M</div>
    </section>
    <section className="category-strip grid grid-cols-4 gap-2">
      {[{label:tr('Barchasi','Все'),icon:Box,active:true},{label:tr('Chiroqlar','Свет'),icon:Lightbulb},{label:tr('Xavfsizlik','Безопасность'),icon:ShieldCheck},{label:tr('Iqlim','Климат'),icon:Moon}].map((item,i)=><button key={item.label} className={`category-chip ${item.active?'active':''}`} onClick={()=>i===0 ? undefined : i===1 ? lights[0] && onOpenDevice(lights[0]) : i===2 ? onRunQuickAction('leave_home') : (devices.find((device) => device.kind !== 'light') && onOpenDevice(devices.find((device) => device.kind !== 'light')!))}><item.icon size={17}/><span>{item.label}</span></button>)}
    </section>
    <section>
      <div className="section-heading"><h2>{tr('Sevimli qurilmalar','Избранные устройства')}</h2><button onClick={onOpen3DView} aria-label="More"><MoreVertical size={17}/></button></div>
      <div className="favorite-grid">
        {featured.map((device,index)=>{const Icon=iconFor(device.kind); return <article key={device.id} className={`favorite-device ${index===0?'lamp-card':''}`}>
          <button className="device-card-open" onClick={()=>onOpenDevice(device)} aria-label={`${device.name[lang]||device.name.uz} sozlamalari`}>
            <div className="favorite-card-top"><div><h3>{device.name[lang]||device.name.uz}</h3><p>{rooms.find(r=>r.id===device.room)?.name[lang]||rooms.find(r=>r.id===device.room)?.name.uz||tr('Uy','Дом')}</p></div><MoreVertical size={14}/></div>
            <div className="device-image-stage"><img className="device-product-image" src={assetFor(device.kind)} alt={device.name[lang]||device.name.uz} loading="lazy"/><span className="device-image-glow"/></div>
          </button>
          <div className="favorite-card-bottom"><span className={device.on?'device-on-label':''}>{!device.online?tr('Oflayn','Не в сети'):device.pendingPower?tr('Tasdiq kutilmoqda','Ожидание'):device.on?`${Math.round(device.watts)} W`:tr("O‘chiq",'Выключено')}</span><button disabled={!device.online||!!device.pendingPower||!!device.essential} onClick={()=>onTogglePower(device.id,!device.on)} className={`mini-switch ${device.on?'on':''}`} aria-label={device.on?'O‘chirish':'Yoqish'}><span/></button></div>
        </article>})}
      </div>
    </section>
    <section>
      <div className="section-heading"><h2>{tr('Tezkor amallar','Быстрые действия')}</h2><span className="app-muted text-xs">{tr('Bir tegishda','В одно касание')}</span></div>
      <div className="quick-actions-grid">{quickActions.map(a=><button key={a.id} className="quick-action" onClick={()=>onRunQuickAction(a.id)}><span style={{color:a.color}}><a.icon size={19}/></span><span>{a.label}</span></button>)}</div>
    </section>
    <section className="power-summary control-tile rounded-2xl p-4">
      <div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold">{tr('Energiya sarfi','Потребление энергии')}</p><p className="app-muted text-xs mt-1">{tr('Joriy quvvat','Текущая мощность')}</p></div><div className="power-value">{(totalWatts/1000).toFixed(2)} <small>kW</small></div></div>
      <div className="power-track mt-4"><span style={{width:`${Math.max(2,Math.min(100,totalWatts/maxWatts*100))}%`}}/></div><div className="flex justify-between mt-2 app-muted text-xs"><span>{tr('Yuklama','Нагрузка')} {Math.round(totalWatts/maxWatts*100)}%</span><span>{maxWatts/1000} kW</span></div>
    </section>
    <section><div className="section-heading"><h2>{tr('Xonalar','Комнаты')}</h2><span className="app-muted text-xs">{devices.filter(d=>d.on).length}/{devices.length} {tr('faol','активно')}</span></div>
      <div className="room-list">{rooms.map(room=>{const list=devices.filter(d=>d.room===room.id);return <div className="room-row" key={room.id}><div className="room-symbol"><Box size={19}/></div><div className="flex-1 min-w-0"><h3>{room.name[lang]||room.name.uz}</h3><p>{list.length} {tr('qurilma','устройства')} · {list.filter(d=>d.on).length} {tr('faol','активно')}</p></div><span className="app-muted">›</span></div>})}</div>
    </section>
  </div>;
};
