export type Language = 'uz' | 'ru';

export interface Room {
  id: string;
  name: {
    uz: string;
    ru: string;
  };
}

export interface Device {
  id: string;
  room: string;
  kind: 'light' | 'tv' | 'iron' | 'coffee' | 'fridge' | string;
  name: {
    uz: string;
    ru: string;
  };
  ratedWatts: number;
  priority: number;
  essential?: boolean;
  night?: boolean;
  on: boolean;
  watts: number;
  online: boolean;
  pendingPower?: boolean | null;
  ts?: number;
}

export interface HomeSnapshot {
  rooms: Room[];
  devices: Device[];
  totalWatts: number;
}

export interface SafetyAlert {
  message: string;
  level: 'warning' | 'critical' | string;
  deviceId?: string;
  ts?: number;
}

export interface EnergyPeriod {
  kwh: number;
  cost: number;
  perDevice: Record<string, number>;
}

export interface EnergyReport {
  day: EnergyPeriod;
  week: EnergyPeriod;
  month: EnergyPeriod;
  tariff: number;
  tips: string[];
}

export interface Scene {
  id: string;
  name: {
    uz: string;
    ru: string;
  };
}

export interface Schedule {
  id: string;
  time: string; // HH:MM
  action?: 'on' | 'off';
  deviceIds?: string[];
  scene?: string;
  days?: number[] | null;
  lastRun?: string | null;
}

export interface VoiceResponse {
  reply: string;
  lang: Language;
  intent: string;
  room?: string;
  device?: string;
}
