import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL;

interface PropertyInfo {
  id: string;
  address: string;
  city: string;
  rentAmount: number;
  description?: string;
  landlord: { name: string; phone?: string };
  meters: { id: string; type: string; meterId: string }[];
}

interface LeaseInfo {
  id: string;
  startDate: string;
  endDate: string;
  rentAmount: number;
  status: string;
  agreement?: { id: string; status: string };
}

export default function MyPlace() {
  const navigate = useNavigate();
  const [property, setProperty] = useState<PropertyInfo | null>(null);
  const [lease, setLease] = useState<LeaseInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const headers = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/properties`, { headers });
        if (res.ok) {
          const props = await res.json();
          if (props.length > 0) {
            setProperty(props[0]);
            if (props[0].lease) setLease(props[0].lease);
          }
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!property) return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-teal-600 text-white p-4">
        <h1 className="text-xl font-bold">My Place</h1>
      </div>
      <div className="p-4 text-center py-16">
        <p className="text-4xl mb-4">🏠</p>
        <p className="text-gray-600 font-medium">No property assigned yet</p>
        <p className="text-gray-400 text-sm mt-2">Ask your landlord for a QR code to join</p>
      </div>
      <BottomNav />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-teal-600 text-white p-4">
        <h1 className="text-xl font-bold">My Place</h1>
        <p className="text-teal-100 text-sm">{property.address}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Property Info */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-semibold text-gray-900 mb-3">Property Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Address</span><span>{property.address}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">City</span><span>{property.city}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Rent</span><span className="font-bold">GHS {property.rentAmount}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Landlord</span><span>{property.landlord?.name}</span></div>
            {property.landlord?.phone && <div className="flex justify-between"><span className="text-gray-500">Contact</span><span>{property.landlord.phone}</span></div>}
          </div>
        </div>

        {/* Lease Info */}
        {lease && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Lease</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${lease.status === 'ACTIVE' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{lease.status}</span>
              </div>
              <div className="flex justify-between"><span className="text-gray-500">Period</span><span>{new Date(lease.startDate).toLocaleDateString()} - {new Date(lease.endDate).toLocaleDateString()}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Monthly Rent</span><span className="font-bold">GHS {lease.rentAmount}</span></div>
            </div>
            {lease.agreement && (
              <button onClick={() => navigate(`/agreement/${lease.agreement!.id}`)}
                className="mt-3 w-full text-center text-teal-600 text-sm font-medium py-2 border border-teal-200 rounded-lg">
                View Agreement ({lease.agreement.status})
              </button>
            )}
          </div>
        )}

        {/* Meters */}
        {property.meters && property.meters.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold text-gray-900 mb-3">Meters</h3>
            <div className="space-y-2">
              {property.meters.map(m => (
                <button key={m.id} onClick={() => navigate('/meter-readings')}
                  className="w-full flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm">{m.type === 'WATER' ? '💧' : m.type === 'ELECTRICITY' ? '⚡' : '🔥'} {m.type} — {m.meterId}</span>
                  <span className="text-gray-400 text-xs">→</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => navigate('/report-challenge')}
            className="bg-orange-500 text-white p-4 rounded-lg font-medium text-sm">
            Report Issue
          </button>
          <button onClick={() => navigate('/challenges')}
            className="bg-blue-500 text-white p-4 rounded-lg font-medium text-sm">
            My Challenges
          </button>
          <button onClick={() => navigate('/meter-readings')}
            className="bg-teal-500 text-white p-4 rounded-lg font-medium text-sm">
            Meter Readings
          </button>
          <button onClick={() => navigate('/policies')}
            className="bg-gray-600 text-white p-4 rounded-lg font-medium text-sm">
            Know Your Rights
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
