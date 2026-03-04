import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

export default function MoreMenu() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    navigate('/');
  };

  const ITEMS: { label: string; path: string; icon: string; roles?: string[] }[] = [
    { label: 'Meter Readings', path: '/meter-readings', icon: '📊' },
    { label: 'Subscription', path: '/subscription', icon: '💎', roles: ['LANDLORD'] },
    { label: 'Payment History', path: '/payments', icon: '💰' },
    { label: 'Ghana Housing Policies', path: '/policies', icon: '📜' },
    { label: 'Help & Support', path: '/support', icon: '🛟' },
    { label: 'About Fie Wura', path: '/about', icon: 'ℹ️' },
  ];

  const filtered = ITEMS.filter(i => !i.roles || i.roles.includes(user.role));

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gray-800 text-white p-4">
        <h1 className="text-xl font-bold">More</h1>
        <p className="text-gray-300 text-sm">{user.name} &middot; {user.role}</p>
      </div>

      <div className="p-4 space-y-2">
        {/* Profile card */}
        <div className="bg-white rounded-lg shadow-sm border p-4 flex items-center gap-4 mb-4">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center text-xl font-bold text-gray-500">
            {(user.name || 'U')[0]}
          </div>
          <div>
            <p className="font-semibold">{user.name}</p>
            <p className="text-sm text-gray-500">{user.email}</p>
            <p className="text-xs text-gray-400">{user.role}</p>
          </div>
        </div>

        {/* Menu items */}
        {filtered.map(item => (
          <button key={item.path} onClick={() => navigate(item.path)}
            className="w-full bg-white rounded-lg shadow-sm border p-4 flex items-center gap-3 text-left">
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium text-gray-800">{item.label}</span>
          </button>
        ))}

        {/* Logout */}
        <button onClick={handleLogout}
          className="w-full mt-6 bg-red-50 text-red-600 rounded-lg border border-red-200 p-4 font-medium">
          Log Out
        </button>
      </div>
      <BottomNav />
    </div>
  );
}
