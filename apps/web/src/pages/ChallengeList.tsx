import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL;

interface Challenge {
  id: string;
  description: string;
  category: string;
  status: string;
  tenantVerified: boolean;
  createdAt: string;
  property: { address: string };
  responses: { type: string; message: string; createdAt: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-yellow-100 text-yellow-800',
  IN_PROGRESS: 'bg-blue-100 text-blue-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function ChallengeList() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const endpoint = user.role === 'LANDLORD' ? '/challenges' : '/challenges/my';
        const res = await fetch(`${API}${endpoint}`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (res.ok) setChallenges(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    fetchChallenges();
  }, []);

  const handleVerify = async (id: string, verified: boolean) => {
    try {
      const res = await fetch(`${API}/challenges/${id}/verify`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ verified }),
      });
      if (res.ok) {
        setChallenges(prev => prev.map(c => c.id === id ? { ...c, tenantVerified: verified, status: verified ? 'COMPLETED' : 'PENDING' } : c));
      }
    } catch (e) { console.error(e); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-orange-600 text-white p-4">
        <h1 className="text-xl font-bold">Maintenance Challenges</h1>
        <p className="text-orange-100 text-sm">{challenges.length} total</p>
      </div>

      <div className="p-4 space-y-3">
        {challenges.length === 0 && <p className="text-center text-gray-500 py-8">No challenges yet</p>}
        {challenges.map(c => (
          <div key={c.id} className="bg-white rounded-lg shadow-sm border p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[c.status] || 'bg-gray-100'}`}>{c.status}</span>
                  <span className="text-xs text-gray-500">{c.category}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{c.description}</p>
                <p className="text-xs text-gray-500 mt-1">{c.property?.address} &middot; {new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedId(selectedId === c.id ? null : c.id)} className="text-orange-500 text-sm">
                {selectedId === c.id ? 'Hide' : 'Details'}
              </button>
            </div>

            {selectedId === c.id && (
              <div className="mt-3 pt-3 border-t">
                <h4 className="text-xs font-semibold text-gray-600 mb-2">Timeline</h4>
                {(c.responses || []).map((r, i) => (
                  <div key={i} className="flex gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-orange-400 mt-1.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-medium">{r.type.replace(/_/g, ' ')}</p>
                      {r.message && <p className="text-xs text-gray-500">{r.message}</p>}
                      <p className="text-xs text-gray-400">{new Date(r.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                ))}
                {c.status === 'COMPLETED' && !c.tenantVerified && user.role === 'TENANT' && (
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleVerify(c.id, true)} className="flex-1 bg-green-500 text-white py-2 rounded text-sm font-medium">Fixed</button>
                    <button onClick={() => handleVerify(c.id, false)} className="flex-1 bg-red-500 text-white py-2 rounded text-sm font-medium">Not Fixed</button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
