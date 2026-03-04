import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL;

interface Property {
  id: string;
  address: string;
  city: string;
  rentAmount: number;
  description?: string;
  images: string[];
  qrToken?: string;
  tenants: { id: string; user: { name: string; email: string } }[];
  meters: { id: string; type: string; meterId: string }[];
}

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ address: '', city: 'Accra', rentAmount: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [qrProp, setQrProp] = useState<string | null>(null);
  const [qrToken, setQrToken] = useState('');
  const headers = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  const fetchProperties = async () => {
    try {
      const res = await fetch(`${API}/properties`, { headers });
      if (res.ok) setProperties(await res.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProperties(); }, []);

  const addProperty = async () => {
    if (!form.address || !form.rentAmount) return;
    setSaving(true);
    try {
      let lat: number | undefined, lng: number | undefined;
      if (navigator.geolocation) {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        ).catch(() => null);
        if (pos) { lat = pos.coords.latitude; lng = pos.coords.longitude; }
      }
      const res = await fetch(`${API}/properties`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, rentAmount: parseFloat(form.rentAmount), latitude: lat, longitude: lng }),
      });
      if (res.ok) { setShowAdd(false); setForm({ address: '', city: 'Accra', rentAmount: '', description: '' }); fetchProperties(); }
    } catch (e) { console.error(e); }
    finally { setSaving(false); }
  };

  const generateQr = async (propertyId: string) => {
    try {
      const res = await fetch(`${API}/qr/properties/${propertyId}/generate-qr`, {
        method: 'POST', headers,
      });
      if (res.ok) {
        const data = await res.json();
        setQrToken(data.token);
        setQrProp(propertyId);
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-blue-600 text-white p-4 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">Properties</h1>
          <p className="text-blue-100 text-sm">{properties.length} total</p>
        </div>
        <button onClick={() => setShowAdd(!showAdd)}
          className="bg-white text-blue-600 px-3 py-1.5 rounded-lg text-sm font-medium">
          {showAdd ? 'Cancel' : '+ Add'}
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Add Property Form */}
        {showAdd && (
          <div className="bg-white rounded-lg shadow-sm border p-4 space-y-3">
            <input type="text" placeholder="Address" value={form.address}
              onChange={e => setForm({ ...form, address: e.target.value })}
              className="w-full p-2.5 border rounded-lg text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <input type="text" placeholder="City" value={form.city}
                onChange={e => setForm({ ...form, city: e.target.value })}
                className="p-2.5 border rounded-lg text-sm" />
              <input type="number" placeholder="Rent (GHS)" value={form.rentAmount}
                onChange={e => setForm({ ...form, rentAmount: e.target.value })}
                className="p-2.5 border rounded-lg text-sm" />
            </div>
            <textarea placeholder="Description (optional)" value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              className="w-full p-2.5 border rounded-lg text-sm h-20" />
            <p className="text-xs text-gray-400">GPS location will be captured automatically</p>
            <button onClick={addProperty} disabled={saving}
              className="w-full bg-blue-500 text-white p-3 rounded-lg font-medium disabled:bg-gray-300">
              {saving ? 'Saving...' : 'Save Property'}
            </button>
          </div>
        )}

        {/* Property List */}
        {properties.length === 0 && !showAdd && (
          <p className="text-center text-gray-500 py-8">No properties yet. Add your first property!</p>
        )}
        {properties.map(p => (
          <div key={p.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{p.address}</h3>
                  <p className="text-sm text-gray-500">{p.city}</p>
                </div>
                <span className="text-lg font-bold text-blue-600">GHS {p.rentAmount}</span>
              </div>
              {p.description && <p className="text-sm text-gray-600 mt-2">{p.description}</p>}

              {/* Tenants */}
              <div className="mt-3">
                <p className="text-xs font-semibold text-gray-500 mb-1">Tenants ({p.tenants?.length || 0})</p>
                {(p.tenants || []).map(t => (
                  <p key={t.id} className="text-sm text-gray-700">{t.user.name} — {t.user.email}</p>
                ))}
              </div>

              {/* Meters */}
              {p.meters && p.meters.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs font-semibold text-gray-500 mb-1">Meters</p>
                  <div className="flex gap-2">
                    {p.meters.map(m => (
                      <span key={m.id} className="text-xs bg-gray-100 px-2 py-1 rounded">
                        {m.type === 'WATER' ? '💧' : m.type === 'ELECTRICITY' ? '⚡' : '🔥'} {m.meterId}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 mt-3">
                <button onClick={() => generateQr(p.id)}
                  className="flex-1 text-center border border-blue-200 text-blue-600 py-2 rounded-lg text-sm font-medium">
                  QR Invite
                </button>
              </div>

              {/* QR Token display */}
              {qrProp === p.id && qrToken && (
                <div className="mt-3 p-3 bg-blue-50 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">Share this code with tenant</p>
                  <p className="font-mono text-sm break-all bg-white p-2 rounded border">{qrToken}</p>
                  <p className="text-xs text-gray-400 mt-1">Valid for 24 hours</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
