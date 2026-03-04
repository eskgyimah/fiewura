import { useEffect, useState } from 'react';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL;

interface Sub { id: string; tier: string; status: string; startDate: string; renewalDate?: string }

const TIERS = [
  { tier: 'FREE', price: 0, label: 'Free', features: ['Up to 3 properties', 'Basic maintenance tracking', 'Community board'] },
  { tier: 'BASIC', price: 50, label: 'Basic', features: ['Up to 10 properties', 'Meter tracking', 'Tenancy agreements', 'SMS notifications', 'QR tenant onboarding'] },
  { tier: 'PREMIUM', price: 120, label: 'Premium', features: ['Unlimited properties', 'All Basic features', 'Payment processing', 'Vendor management', 'Analytics dashboard', 'Priority support'] },
];

export default function SubscriptionPage() {
  const [current, setCurrent] = useState<Sub | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/subscriptions/current`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        });
        if (res.ok) setCurrent(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleUpgrade = async (tier: string) => {
    setUpgrading(true);
    try {
      const res = await fetch(`${API}/subscriptions/upgrade`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ tier }),
      });
      if (res.ok) {
        const data = await res.json();
        setCurrent(data);
      }
    } catch (e) { console.error(e); }
    finally { setUpgrading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-purple-600 text-white p-4">
        <h1 className="text-xl font-bold">Subscription</h1>
        <p className="text-purple-100 text-sm">
          Current: {current?.tier || 'FREE'} — {current?.status || 'ACTIVE'}
        </p>
      </div>

      <div className="p-4 space-y-4">
        {TIERS.map(t => {
          const isCurrent = (current?.tier || 'FREE') === t.tier;
          return (
            <div key={t.tier} className={`bg-white rounded-lg shadow-sm border-2 p-4 ${isCurrent ? 'border-purple-500' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-bold text-lg">{t.label}</h3>
                  <p className="text-sm text-gray-500">
                    {t.price === 0 ? 'Free' : `GHS ${t.price}/month`}
                  </p>
                </div>
                {isCurrent && <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">Current</span>}
              </div>
              <ul className="space-y-1.5 mb-4">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">✓</span>{f}
                  </li>
                ))}
              </ul>
              {!isCurrent && (
                <button onClick={() => handleUpgrade(t.tier)} disabled={upgrading}
                  className="w-full bg-purple-500 text-white py-2.5 rounded-lg font-medium text-sm disabled:bg-gray-300">
                  {upgrading ? 'Processing...' : t.price === 0 ? 'Downgrade' : 'Upgrade'}
                </button>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
