import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL || '';

interface AnalyticsData {
  totalProperties: number;
  totalTenants: number;
  occupancyRate: number;
  rentCollectedThisMonth: number;
  overdueRentCount: number;
  pendingMaintenanceCount: number;
  expectedRent?: number;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const headers = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/analytics/overview`, { headers });
        if (res.ok) setData(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  // Time-based greeting
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  const d = data || { totalProperties: 0, totalTenants: 0, occupancyRate: 0, rentCollectedThisMonth: 0, overdueRentCount: 0, pendingMaintenanceCount: 0, expectedRent: 0 };

  // Role-based quick actions
  const LANDLORD_ACTIONS = [
    { label: '+ Property', icon: '🏠', path: '/properties', color: 'bg-blue-500' },
    { label: 'Invite Tenant', icon: '👤', path: '/properties', color: 'bg-green-500' },
    { label: 'Challenges', icon: '🔧', path: '/challenges', color: 'bg-orange-500' },
    { label: 'Payments', icon: '💰', path: '/payments', color: 'bg-purple-500' },
  ];

  const TENANT_ACTIONS = [
    { label: 'My Place', icon: '🏠', path: '/my-place', color: 'bg-blue-500' },
    { label: 'Report Issue', icon: '🔧', path: '/report-challenge', color: 'bg-orange-500' },
    { label: 'My Challenges', icon: '📋', path: '/challenges', color: 'bg-yellow-500' },
    { label: 'Know Rights', icon: '⚖️', path: '/policies', color: 'bg-green-500' },
  ];

  const TECH_ACTIONS = [
    { label: 'My Jobs', icon: '🔧', path: '/tech-dashboard', color: 'bg-orange-500' },
    { label: 'Schedule', icon: '📅', path: '/tech-dashboard', color: 'bg-blue-500' },
  ];

  const actions = user.role === 'LANDLORD' ? LANDLORD_ACTIONS
    : user.role === 'TENANT' ? TENANT_ACTIONS
    : TECH_ACTIONS;

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-5">
        <p className="text-orange-100 text-sm">{greeting},</p>
        <h1 className="text-xl font-bold">{user.name || 'User'}</h1>
        <p className="text-orange-200 text-xs mt-1">{user.role} {d.totalProperties > 0 ? `· ${d.totalProperties} ${d.totalProperties === 1 ? 'property' : 'properties'}` : ''}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Metric Cards — 2x2 Grid */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-xl p-3 shadow-sm border">
            <p className="text-xs text-gray-500">Properties</p>
            <p className="text-2xl font-bold text-gray-900">{d.totalProperties}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border">
            <p className="text-xs text-gray-500">Tenants</p>
            <p className="text-2xl font-bold text-gray-900">{d.totalTenants}</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border">
            <p className="text-xs text-gray-500">Occupancy</p>
            <p className="text-2xl font-bold text-gray-900">{d.occupancyRate}%</p>
          </div>
          <div className="bg-white rounded-xl p-3 shadow-sm border">
            <p className="text-xs text-gray-500">Expected Rent</p>
            <p className="text-xl font-bold text-gray-900">GHS {(d.expectedRent || 0).toLocaleString()}</p>
          </div>
        </div>

        {/* Rent Summary */}
        <div className="bg-white rounded-xl p-3 shadow-sm border flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500">Collected This Month</p>
            <p className="text-lg font-bold text-green-600">GHS {d.rentCollectedThisMonth.toFixed(0)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">Outstanding</p>
            <p className="text-lg font-bold text-red-500">GHS {((d.expectedRent || 0) - d.rentCollectedThisMonth).toLocaleString()}</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">QUICK ACTIONS</h2>
          <div className="grid grid-cols-2 gap-2">
            {actions.map(a => (
              <button key={a.label} onClick={() => navigate(a.path)}
                className={`${a.color} text-white rounded-xl p-3 flex items-center gap-2 text-sm font-medium shadow-sm`}>
                <span className="text-lg">{a.icon}</span>
                <span>{a.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Alerts */}
        {(d.overdueRentCount > 0 || d.pendingMaintenanceCount > 0) && (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-gray-500">ALERTS</h2>
            {d.overdueRentCount > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-center gap-2">
                <span className="text-red-500 font-bold">!</span>
                <p className="text-sm text-red-800">{d.overdueRentCount} overdue rent payment{d.overdueRentCount > 1 ? 's' : ''}</p>
              </div>
            )}
            {d.pendingMaintenanceCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-center gap-2">
                <span className="text-yellow-600 font-bold">!</span>
                <p className="text-sm text-yellow-800">{d.pendingMaintenanceCount} pending maintenance challenge{d.pendingMaintenanceCount > 1 ? 's' : ''}</p>
              </div>
            )}
          </div>
        )}

        {/* Collapsible Analytics */}
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <button onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className="w-full p-4 flex justify-between items-center text-left">
            <h2 className="font-semibold text-gray-800">Analytics</h2>
            <span className="text-gray-400 text-sm">{analyticsOpen ? '▲' : '▼'}</span>
          </button>
          {analyticsOpen && (
            <div className="px-4 pb-4 space-y-3 border-t">
              <div className="flex justify-between py-2">
                <span className="text-sm text-gray-600">Overdue Rents</span>
                <span className="font-semibold text-sm">{d.overdueRentCount}</span>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span className="text-sm text-gray-600">Pending Maintenance</span>
                <span className="font-semibold text-sm">{d.pendingMaintenanceCount}</span>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span className="text-sm text-gray-600">Occupancy Rate</span>
                <div className="flex items-center gap-2">
                  <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-green-500 rounded-full" style={{ width: `${d.occupancyRate}%` }} />
                  </div>
                  <span className="font-semibold text-sm">{d.occupancyRate}%</span>
                </div>
              </div>
              <div className="flex justify-between py-2 border-t">
                <span className="text-sm text-gray-600">Rent Collected</span>
                <span className="font-semibold text-sm">GHS {d.rentCollectedThisMonth.toFixed(2)}</span>
              </div>
            </div>
          )}
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
