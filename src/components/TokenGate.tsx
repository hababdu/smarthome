import React, { useEffect, useState } from 'react';
import { clearToken, getToken, setToken } from '../services/api';

type Status = 'checking' | 'locked' | 'open';

async function isValid(token: string): Promise<'ok' | 'denied' | 'error'> {
  try {
    const res = await fetch('/api/home', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) return 'ok';
    if (res.status === 401 || res.status === 403) return 'denied';
    return 'error';
  } catch {
    return 'error';
  }
}

/** Token saytning kodiga yozilmaydi: foydalanuvchi uni bir marta kiritadi va faqat shu brauzerda saqlanadi. */
export const TokenGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<Status>(getToken() ? 'checking' : 'locked');
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const t = getToken();
    if (!t) return;
    isValid(t).then((r) => {
      if (r === 'denied') { clearToken(); setStatus('locked'); }
      else setStatus('open'); // server uxlayotgan bo'lsa ham ilova o'zi qayta urinadi
    });
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const t = value.trim();
    if (!t) return;
    setBusy(true);
    setError('');
    const r = await isValid(t);
    setBusy(false);
    if (r === 'ok') { setToken(t); setStatus('open'); }
    else if (r === 'denied') setError('Token noto‘g‘ri.');
    else setError('Serverga ulanib bo‘lmadi. Server uyg‘onayotgan bo‘lishi mumkin, 1 daqiqadan keyin qayta urining.');
  }

  if (status === 'open') return <>{children}</>;

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 16, background: '#0b0f17', color: '#e5e7eb', fontFamily: 'system-ui, sans-serif' }}>
      {status === 'checking' ? (
        <p>Tekshirilmoqda…</p>
      ) : (
        <form onSubmit={submit} style={{ width: '100%', maxWidth: 380, display: 'grid', gap: 12 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>SmartHome</h1>
          <p style={{ margin: 0, color: '#9ca3af', fontSize: 14 }}>Kirish uchun API tokenni kiriting. U faqat shu brauzerda saqlanadi.</p>
          <input
            type="password"
            autoComplete="current-password"
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="API token"
            style={{ padding: '12px 14px', borderRadius: 12, border: '1px solid #374151', background: '#111827', color: 'inherit', fontSize: 16 }}
          />
          {error && <p role="alert" style={{ margin: 0, color: '#f87171', fontSize: 14 }}>{error}</p>}
          <button
            type="submit"
            disabled={busy || !value.trim()}
            style={{ padding: '12px 14px', borderRadius: 12, border: 0, background: '#6366f1', color: '#fff', fontSize: 16, fontWeight: 600, opacity: busy || !value.trim() ? 0.6 : 1 }}
          >
            {busy ? 'Tekshirilmoqda…' : 'Kirish'}
          </button>
        </form>
      )}
    </div>
  );
};
