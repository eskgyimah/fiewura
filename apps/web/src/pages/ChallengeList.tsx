import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const SAMPLE_CHALLENGES: Challenge[] = [
  {
    id: 'sample-1', description: 'Kitchen sink is leaking and causing water damage to the cabinet below',
    category: 'PLUMBING', status: 'PENDING', tenantVerified: false,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    property: { address: 'GA-123-4567, East Legon' },
    responses: [{ type: 'WORK_STARTED', message: 'Challenge created: Kitchen sink leaking', createdAt: new Date(Date.now() - 2 * 86400000).toISOString() }],
  },
  {
    id: 'sample-2', description: 'Power outlet in bedroom not working — sparks when plugging in',
    category: 'ELECTRICAL', status: 'IN_PROGRESS', tenantVerified: false,
    createdAt: new Date(Date.now() - 5 * 86400000).toISOString(),
    property: { address: 'AK-456-7890, Kumasi Ahodwo' },
    responses: [
      { type: 'WORK_STARTED', message: 'Challenge created: Power outlet sparking', createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
      { type: 'WORK_STARTED', message: 'Assigned to vendor: Kofi Electricals', createdAt: new Date(Date.now() - 4 * 86400000).toISOString() },
      { type: 'APPOINTMENT_PROPOSED', message: 'Appointment proposed for inspection', createdAt: new Date(Date.now() - 3 * 86400000).toISOString() },
    ],
  },
  {
    id: 'sample-3', description: 'Ceiling fan in living room making loud grinding noise',
    category: 'APPLIANCE', status: 'COMPLETED', tenantVerified: true,
    createdAt: new Date(Date.now() - 10 * 86400000).toISOString(),
    property: { address: 'GT-789-0123, Tema Community 25' },
    responses: [
      { type: 'WORK_STARTED', message: 'Challenge created: Ceiling fan grinding', createdAt: new Date(Date.now() - 10 * 86400000).toISOString() },
      { type: 'WORK_STARTED', message: 'Assigned to vendor: Fix-It Ghana', createdAt: new Date(Date.now() - 9 * 86400000).toISOString() },
      { type: 'WORK_COMPLETED', message: 'Fan motor replaced, tested OK', createdAt: new Date(Date.now() - 7 * 86400000).toISOString() },
      { type: 'TENANT_CONFIRMED_FIXED', message: 'Issue confirmed fixed', createdAt: new Date(Date.now() - 6 * 86400000).toISOString() },
    ],
  },
];

export default function ChallengeList() {
  const navigate = useNavigate();
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
        if (res.ok) {
          const data = await res.json();
          setChallenges(data.length > 0 ? data : SAMPLE_CHALLENGES);
        } else {
          setChallenges(SAMPLE_CHALLENGES);
        }
      } catch (e) {
        console.error(e);
        setChallenges(SAMPLE_CHALLENGES);
      }
      finally { setLoading(false); }
    };
    fetchChallenges();
  }, []);

  const handleVerify = async (id: string, verified: boolean) => {
    if (id.startsWith('sample-')) return;
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
      <div className="bg-orange-600 text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Maintenance Challenges</h1>
          <p className="text-orange-100 text-sm">{challenges.length} total</p>
        </div>
      </div>

      <div className="p-4 space-y-3">
        {challenges.length === 0 && <p className="text-center text-gray-500 py-8">No challenges yet</p>}
        {challenges[0]?.id.startsWith('sample-') && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700 mb-2">
            Showing sample challenges for demo. Real challenges will appear here when tenants report issues.
          </div>
        )}
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
                {c.status === 'COMPLETED' && !c.tenantVerified && user.role === 'TENANT' && !c.id.startsWith('sample-') && (
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
