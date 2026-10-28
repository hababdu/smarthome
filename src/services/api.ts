import { HomeSnapshot, EnergyReport, Scene, Schedule, VoiceResponse } from '../types';

const API_TOKEN = import.meta.env.VITE_API_TOKEN || '';

if (!API_TOKEN) console.warn('VITE_API_TOKEN sozlanmagan. API so‘rovlari autentifikatsiyadan o‘tmaydi.');

const headers = {
  'Content-Type': 'application/json',
  Authorization: `Bearer ${API_TOKEN}`,
};

export async function fetchHome(): Promise<HomeSnapshot> {
  const res = await fetch('/api/home', { headers });
  if (!res.ok) throw new Error(`Failed to load home snapshot: ${res.statusText}`);
  return res.json();
}

export async function setDevicePower(id: string, on: boolean): Promise<void> {
  const res = await fetch(`/api/devices/${id}/power`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ on }),
  });
  if (!res.ok) throw new Error(`Failed to set power for ${id}`);
}

export async function fetchEnergy(lang: 'uz' | 'ru' = 'uz'): Promise<EnergyReport> {
  const res = await fetch(`/api/energy?lang=${lang}`, { headers });
  if (!res.ok) throw new Error('Failed to load energy data');
  return res.json();
}

export async function fetchScenes(): Promise<Scene[]> {
  const res = await fetch('/api/scenes', { headers });
  if (!res.ok) throw new Error('Failed to load scenes');
  return res.json();
}

export async function runScene(id: string): Promise<void> {
  const res = await fetch(`/api/scenes/${id}/run`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error(`Failed to run scene ${id}`);
}

export async function fetchSchedules(): Promise<Schedule[]> {
  const res = await fetch('/api/schedules', { headers });
  if (!res.ok) throw new Error('Failed to load schedules');
  return res.json();
}

export async function createSchedule(schedule: Partial<Schedule>): Promise<Schedule> {
  const res = await fetch('/api/schedules', {
    method: 'POST',
    headers,
    body: JSON.stringify(schedule),
  });
  if (!res.ok) throw new Error('Failed to create schedule');
  return res.json();
}

export async function deleteSchedule(id: string): Promise<void> {
  const res = await fetch(`/api/schedules/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error(`Failed to delete schedule ${id}`);
}

export async function sendVoiceCommand(text: string): Promise<VoiceResponse> {
  const res = await fetch('/api/voice', {
    method: 'POST',
    headers,
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error('Failed to send voice command');
  return res.json();
}

export async function injectSpike(id: string, watts: number): Promise<void> {
  const res = await fetch('/api/simulator/spike', {
    method: 'POST',
    headers,
    body: JSON.stringify({ id, watts }),
  });
  if (!res.ok) throw new Error('Failed to inject spike');
}

export async function updateTariff(tariff: number): Promise<void> {
  const res = await fetch('/api/tariff', {
    method: 'POST',
    headers,
    body: JSON.stringify({ tariff }),
  });
  if (!res.ok) throw new Error('Failed to update tariff');
}

export async function transcribeAudio(
  audioBase64: string,
  mimeType: string = 'audio/webm'
): Promise<{ text: string; model: string; ok?: boolean }> {
  const res = await fetch('/api/transcribe', {
    method: 'POST',
    headers,
    body: JSON.stringify({ audioBase64, mimeType }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || 'Audio transkripsiyasida xatolik yuz berdi');
  }
  return res.json();
}

export function createWebSocket(
  onMessage: (data: any) => void,
  onStatusChange?: (connected: boolean) => void
): () => void {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  let ws: WebSocket | null = null;
  let retryTimer: any = null;
  let isClosedExplicitly = false;

  function connect() {
    if (isClosedExplicitly) return;
    if (!API_TOKEN) { onStatusChange?.(false); console.error('VITE_API_TOKEN sozlanmagan'); return; }
    try {
      fetch('/api/ws-ticket', { method: 'POST', headers })
        .then(async (res) => {
          if (!res.ok) throw new Error(`WS ticket olish muvaffaqiyatsiz: ${res.status}`);
          return res.json();
        })
        .then(({ ticket }: { ticket: string }) => {
          if (isClosedExplicitly) return;
          const url = `${protocol}//${window.location.host}/ws?ticket=${encodeURIComponent(ticket)}`;
          ws = new WebSocket(url);
          ws.onopen = () => onStatusChange?.(true);
          ws.onmessage = (event) => {
            try { onMessage(JSON.parse(event.data)); }
            catch (e) { console.error('Failed to parse WS message:', e); }
          };
          ws.onclose = () => {
            onStatusChange?.(false);
            if (!isClosedExplicitly) retryTimer = setTimeout(connect, 3000);
          };
          ws.onerror = (err) => { console.warn('WebSocket error, reconnecting...', err); ws?.close(); };
        })
        .catch((e) => {
          console.warn('WebSocket ticket olishda xato:', e);
          if (!isClosedExplicitly) retryTimer = setTimeout(connect, 5000);
        });
      return;
    } catch (e) {
      console.warn('Failed to connect WebSocket:', e);
      retryTimer = setTimeout(connect, 3000);
    }
  }

  connect();

  return () => {
    isClosedExplicitly = true;
    if (retryTimer) clearTimeout(retryTimer);
    ws?.close();
  };
}
