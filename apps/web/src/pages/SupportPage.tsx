import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const WA_LINK = 'https://wa.me/qr/YSFI7MRN66IOO1';

export default function SupportPage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-gray-800 text-white p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-white">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-bold">Help & Support</h1>
          <p className="text-gray-300 text-sm">We're here to help</p>
        </div>
      </div>
      <div className="p-4 space-y-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-semibold mb-3">Contact Support</h3>
          <a href={WA_LINK} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-3 bg-green-500 text-white p-3 rounded-lg font-medium mb-3">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.594-.82-6.342-2.192l-.442-.361-3.25 1.089 1.089-3.25-.361-.442A9.935 9.935 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/>
            </svg>
            <span>Chat on WhatsApp</span>
          </a>
          <div className="text-sm text-gray-700">
            <p>{'\ud83d\udce7'} support@redwavestech.com</p>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-semibold mb-2">FAQs</h3>
          <div className="space-y-3 text-sm">
            <div>
              <p className="font-medium text-gray-900">How do I add a tenant?</p>
              <p className="text-gray-600">Go to Properties, tap QR Invite on your property, and share the code with your tenant.</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">How do I report a maintenance issue?</p>
              <p className="text-gray-600">Tap "Report Issue" from Home quick actions to describe the problem.</p>
            </div>
            <div>
              <p className="font-medium text-gray-900">What are Ghana Housing Policies?</p>
              <p className="text-gray-600">Check "Ghana Housing Policies" in the More menu for your legal rights under the Rent Act 1963.</p>
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
