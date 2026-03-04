import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL;

interface Meter { id: string; type: string; meterId: string; readings: Reading[] }
interface Reading { id: string; value: number; recordedAt: string; photoUrl?: string }

export default function MeterReadings() {
  const [meters, setMeters] = useState<Meter[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMeter, setSelectedMeter] = useState<string | null>(null);
  const [newValue, setNewValue] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const fetchMeters = async () => {
    try {
      // Get tenant's property first, then meters
      const propRes = await fetch(`${API}/properties`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
      if (propRes.ok) {
        const props = await propRes.json();
        if (props.length > 0) {
          const meterRes = await fetch(`${API}/meters/property/${props[0].id}`, { headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` } });
          if (meterRes.ok) setMeters(await meterRes.json());
        }
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchMeters(); }, []);

  const submitReading = async (meterId: string) => {
    if (!newValue) return;
    setSubmitting(true);
    try {
      const res = await fetch(`${API}/meters/${meterId}/reading`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ value: parseFloat(newValue) }),
      });
      if (res.ok) { setNewValue(''); fetchMeters(); }
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const ICONS: Record<string, string> = { WATER: '💧', ELECTRICITY: '⚡', GAS: '🔥' };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-4">
        <h1 className="text-xl font-bold">Meter Readings</h1>
        <p className="text-blue-100 text-sm">Track your utility usage</p>
      </div>

      <div className="p-4 space-y-4">
        {meters.length === 0 && <p className="text-center text-gray-500 py-8">No meters registered for your property</p>}
        {meters.map(m => (
          <div key={m.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <button onClick={() => setSelectedMeter(selectedMeter === m.id ? null : m.id)}
              className="w-full p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{ICONS[m.type] || '📊'}</span>
                <div className="text-left">
                  <p className="font-medium">{m.type}</p>
                  <p className="text-xs text-gray-500">ID: {m.meterId}</p>
                </div>
              </div>
              <div className="text-right">
                {m.readings?.[0] && <p className="font-bold text-lg">{m.readings[0].value}</p>}
                <p className="text-xs text-gray-400">{m.readings?.[0] ? new Date(m.readings[0].recordedAt).toLocaleDateString() : 'No readings'}</p>
              </div>
            </button>

            {selectedMeter === m.id && (
              <div className="border-t p-4">
                {user.role === 'TENANT' && (
                  <div className="flex gap-2 mb-4">
                    <input type="number" value={newValue} onChange={e => setNewValue(e.target.value)}
                      placeholder="Enter reading" className="flex-1 p-2 border rounded text-sm" />
                    <button onClick={() => submitReading(m.id)} disabled={submitting}
                      className="bg-blue-500 text-white px-4 py-2 rounded text-sm font-medium disabled:bg-gray-300">
                      {submitting ? '...' : 'Submit'}
                    </button>
                  </div>
                )}
                <h4 className="text-xs font-semibold text-gray-600 mb-2">History</h4>
                {(m.readings || []).slice(0, 10).map(r => (
                  <div key={r.id} className="flex justify-between py-1 border-b border-gray-50 text-sm">
                    <span className="text-gray-600">{new Date(r.recordedAt).toLocaleDateString()}</span>
                    <span className="font-medium">{r.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
