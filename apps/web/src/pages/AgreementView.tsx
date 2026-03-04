import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL;

interface Agreement {
  id: string;
  status: string;
  templateType: string;
  landlordSigned: boolean;
  tenantSigned: boolean;
  landlordSignedAt?: string;
  tenantSignedAt?: string;
  terms?: Record<string, string>;
  lease: {
    startDate: string;
    endDate: string;
    rentAmount: number;
    property: { address: string; city: string };
    tenant: { user: { name: string; email: string } };
  };
}

export default function AgreementView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [agreement, setAgreement] = useState<Agreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [signing, setSigning] = useState(false);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const headers = { Authorization: `Bearer ${localStorage.getItem('accessToken')}` };

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API}/agreements/${id}`, { headers });
        if (res.ok) setAgreement(await res.json());
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleSign = async () => {
    setSigning(true);
    try {
      const res = await fetch(`${API}/agreements/${id}/sign`, { method: 'POST', headers });
      if (res.ok) setAgreement(await res.json());
    } catch (e) { console.error(e); }
    finally { setSigning(false); }
  };

  const downloadPdf = () => {
    window.open(`${API}/agreements/${id}/pdf`, '_blank');
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;
  if (!agreement) return <div className="flex items-center justify-center h-screen">Agreement not found</div>;

  const canSign = (user.role === 'LANDLORD' && !agreement.landlordSigned) ||
                  (user.role === 'TENANT' && !agreement.tenantSigned);

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-indigo-600 text-white p-4">
        <h1 className="text-xl font-bold">Tenancy Agreement</h1>
        <p className="text-indigo-100 text-sm">{agreement.status}</p>
      </div>

      <div className="p-4 space-y-4">
        {/* Parties */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-semibold mb-3">Agreement Details</h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Property</span><span>{agreement.lease.property.address}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Tenant</span><span>{agreement.lease.tenant.user.name}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Period</span>
              <span>{new Date(agreement.lease.startDate).toLocaleDateString()} - {new Date(agreement.lease.endDate).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between"><span className="text-gray-500">Rent</span><span className="font-bold">GHS {agreement.lease.rentAmount}/month</span></div>
          </div>
        </div>

        {/* Terms */}
        {agreement.terms && Object.keys(agreement.terms).length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h3 className="font-semibold mb-3">Terms</h3>
            <div className="space-y-2 text-sm">
              {Object.entries(agreement.terms).map(([key, value]) => (
                <div key={key}>
                  <p className="font-medium text-gray-700">{key.replace(/_/g, ' ')}</p>
                  <p className="text-gray-500">{value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Signatures */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h3 className="font-semibold mb-3">Signatures</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm">Landlord</span>
              {agreement.landlordSigned ? (
                <span className="text-green-600 text-sm font-medium">Signed {agreement.landlordSignedAt ? new Date(agreement.landlordSignedAt).toLocaleDateString() : ''}</span>
              ) : (
                <span className="text-gray-400 text-sm">Pending</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm">Tenant</span>
              {agreement.tenantSigned ? (
                <span className="text-green-600 text-sm font-medium">Signed {agreement.tenantSignedAt ? new Date(agreement.tenantSignedAt).toLocaleDateString() : ''}</span>
              ) : (
                <span className="text-gray-400 text-sm">Pending</span>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-2">
          {canSign && (
            <button onClick={handleSign} disabled={signing}
              className="w-full bg-indigo-500 text-white p-4 rounded-lg font-bold disabled:bg-gray-300">
              {signing ? 'Signing...' : 'Sign Agreement'}
            </button>
          )}
          <button onClick={downloadPdf}
            className="w-full border border-indigo-200 text-indigo-600 p-3 rounded-lg font-medium text-sm">
            Download PDF
          </button>
          <button onClick={() => navigate(-1)}
            className="w-full text-gray-500 p-3 text-sm">
            Back
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
