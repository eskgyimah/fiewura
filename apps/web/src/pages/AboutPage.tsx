import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

export default function AboutPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-orange-500 text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold">About Fie Wura</h1>
      </div>
      <div className="p-4 space-y-4">
        <div className="text-center py-6">
          <h2 className="text-3xl font-bold text-orange-700">Fie Wura</h2>
          <p className="text-gray-500 text-sm mt-1">Property Management for Ghana</p>
          <p className="text-gray-400 text-xs mt-1">Version 1.0.0</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <p className="text-sm text-gray-700 leading-relaxed">
            Fie Wura ("House Owner" in Akan) is a property management platform built for Ghanaian landlords, tenants, and maintenance teams. Manage properties, track rent, handle maintenance challenges, and stay informed about your housing rights.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4 text-center">
          <p className="text-sm text-gray-700 font-medium">Built by Redwaves Tech</p>
          <p className="text-sm text-gray-500 mt-1">support@redwavestech.com</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
