import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

export default function PaymentHistory() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-green-600 text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Payment History</h1>
          <p className="text-green-100 text-sm">Your rent and subscription payments</p>
        </div>
      </div>
      <div className="p-4">
        <div className="text-center py-16">
          <p className="text-4xl mb-4">{'\ud83d\udcb0'}</p>
          <p className="text-gray-600 font-medium">No payments yet</p>
          <p className="text-gray-400 text-sm mt-2">Your payment history will appear here</p>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
