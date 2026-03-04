import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL;

interface Policy {
  topic: string;
  title: string;
  summary: string;
  key_points: string[];
}

export default function PoliciesPage() {
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/policies`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (res.ok) {
          const data = await res.json();
          setPolicies(data.policies || data);
        }
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const ICONS: Record<string, string> = {
    rent_control: '💰', eviction_rules: '🚪', security_deposit: '🔒',
    tenant_rights: '⚖️', landlord_obligations: '🏠', dispute_resolution: '🤝',
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">Ghana Housing Policies</h1>
        <p className="text-gray-300 text-sm">Know your rights and obligations</p>
      </div>

      <div className="p-4 space-y-3">
        {policies.length === 0 && <p className="text-center text-gray-500 py-8">No policies loaded</p>}
        {policies.map(p => (
          <div key={p.topic} className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <button onClick={() => setExpanded(expanded === p.topic ? null : p.topic)}
              className="w-full p-4 flex items-center gap-3 text-left">
              <span className="text-2xl">{ICONS[p.topic] || '📋'}</span>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{p.title}</p>
                <p className="text-xs text-gray-500 line-clamp-1">{p.summary}</p>
              </div>
              <span className="text-gray-400">{expanded === p.topic ? '▲' : '▼'}</span>
            </button>
            {expanded === p.topic && (
              <div className="border-t px-4 pb-4">
                <p className="text-sm text-gray-700 mt-3 mb-3">{p.summary}</p>
                <h4 className="text-xs font-semibold text-gray-500 mb-2">KEY POINTS</h4>
                <ul className="space-y-1.5">
                  {p.key_points.map((point, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700">
                      <span className="text-green-500 flex-shrink-0">•</span>
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      <BottomNav />
    </div>
  );
}
