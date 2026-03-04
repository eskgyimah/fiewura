import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const TIERS = [
  { tier: 'FREE', price: 0, label: 'Free', features: ['Up to 3 properties', 'Basic maintenance tracking', 'Community board'] },
  { tier: 'BASIC', price: 50, label: 'Basic', features: ['Up to 10 properties', 'Meter tracking', 'Tenancy agreements', 'SMS notifications', 'QR tenant onboarding'] },
  { tier: 'PREMIUM', price: 120, label: 'Premium', features: ['Unlimited properties', 'All Basic features', 'Payment processing', 'Vendor management', 'Analytics dashboard', 'Priority support'] },
];

const PAYMENT_METHODS = [
  { id: 'momo', label: 'MTN MoMo', icon: '\ud83d\udcf1', color: 'bg-yellow-500', account: '+233 24 178 2407' },
  { id: 'telecel', label: 'Telecel Cash', icon: '\ud83d\udcf2', color: 'bg-red-500', account: '+233 20 858 9819' },
  { id: 'bank', label: 'Bank Transfer', icon: '\ud83c\udfe6', color: 'bg-blue-500', account: 'Zenith Bank — 6011427588' },
];

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const [currentTier] = useState('FREE');
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [autoRenew, setAutoRenew] = useState(true);
  const [paymentSent, setPaymentSent] = useState(false);

  const handlePay = () => {
    if (!phoneNumber.trim() || !selectedMethod) return;
    setPaymentSent(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-purple-600 text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Subscription</h1>
          <p className="text-purple-100 text-sm">Current: {currentTier} — ACTIVE</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Payment confirmation */}
        {paymentSent && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <p className="text-3xl mb-2">{'\u2705'}</p>
            <p className="font-semibold text-green-800">Payment Request Sent!</p>
            <p className="text-sm text-green-700 mt-1">
              Check your {selectedMethod === 'momo' ? 'MTN MoMo' : 'Telecel Cash'} for the prompt.
              Approve to complete your {selectedTier} subscription.
            </p>
            <p className="text-xs text-green-600 mt-2">Auto-renewal: {autoRenew ? 'ON' : 'OFF'}</p>
            <button onClick={() => { setPaymentSent(false); setSelectedTier(null); setSelectedMethod(null); setPhoneNumber(''); }}
              className="mt-3 text-sm text-green-700 underline">Done</button>
          </div>
        )}

        {/* Tier cards */}
        {!paymentSent && TIERS.map(t => {
          const isCurrent = currentTier === t.tier;
          const isSelected = selectedTier === t.tier;
          return (
            <div key={t.tier} className={`bg-white rounded-lg shadow-sm border-2 p-4 ${isCurrent ? 'border-purple-500' : isSelected ? 'border-purple-300' : 'border-gray-200'}`}>
              <div className="flex justify-between items-center mb-3">
                <div>
                  <h3 className="font-bold text-lg">{t.label}</h3>
                  <p className="text-sm text-gray-500">{t.price === 0 ? 'Free' : `GHS ${t.price}/month`}</p>
                </div>
                {isCurrent && <span className="bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-xs font-medium">Current</span>}
              </div>
              <ul className="space-y-1.5 mb-4">
                {t.features.map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <span className="text-green-500">{'\u2713'}</span>{f}
                  </li>
                ))}
              </ul>

              {!isCurrent && t.price > 0 && (
                <button onClick={() => setSelectedTier(isSelected ? null : t.tier)}
                  className="w-full bg-purple-500 text-white py-2.5 rounded-lg font-medium text-sm">
                  {isSelected ? 'Cancel' : 'Upgrade'}
                </button>
              )}

              {/* Payment method selector */}
              {isSelected && !paymentSent && (
                <div className="mt-4 space-y-3 border-t pt-4">
                  <p className="text-sm font-semibold text-gray-700">Choose payment method:</p>
                  <div className="grid grid-cols-3 gap-2">
                    {PAYMENT_METHODS.map(m => (
                      <button key={m.id} onClick={() => setSelectedMethod(m.id)}
                        className={`p-3 rounded-lg border-2 text-center ${selectedMethod === m.id ? 'border-purple-500 bg-purple-50' : 'border-gray-200'}`}>
                        <span className="text-xl block">{m.icon}</span>
                        <span className="text-xs">{m.label}</span>
                      </button>
                    ))}
                  </div>

                  {selectedMethod && (
                    <div className="space-y-3">
                      {selectedMethod === 'bank' ? (
                        <div className="bg-blue-50 p-3 rounded-lg text-sm">
                          <p className="font-medium">Zenith Bank</p>
                          <p className="font-mono text-lg">6011427588</p>
                          <p className="text-xs text-gray-500">Redwaves Tech</p>
                          <p className="text-xs text-gray-400 mt-1">Send proof of payment to support</p>
                        </div>
                      ) : (
                        <>
                          <input type="tel" placeholder="Enter your mobile number" value={phoneNumber}
                            onChange={e => setPhoneNumber(e.target.value)}
                            className="w-full p-2.5 border rounded-lg text-sm" />
                          <div className="flex items-center justify-between bg-gray-50 p-3 rounded-lg">
                            <span className="text-sm text-gray-700">Auto-renewal</span>
                            <button onClick={() => setAutoRenew(!autoRenew)}
                              className={`w-12 h-6 rounded-full relative transition-colors ${autoRenew ? 'bg-purple-500' : 'bg-gray-300'}`}>
                              <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${autoRenew ? 'translate-x-6' : 'translate-x-0.5'}`} />
                            </button>
                          </div>
                          <button onClick={handlePay} disabled={!phoneNumber.trim()}
                            className="w-full bg-green-500 text-white py-3 rounded-lg font-medium disabled:bg-gray-300">
                            Pay GHS {t.price} via {selectedMethod === 'momo' ? 'MoMo' : 'Telecel'}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <BottomNav />
    </div>
  );
}
