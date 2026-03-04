import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BottomNav from '../components/BottomNav';

const API = import.meta.env.VITE_API_URL;
const CATEGORIES = ['PLUMBING', 'ELECTRICAL', 'STRUCTURAL', 'CLEANING', 'OTHER'];

export default function ReportChallenge() {
  const navigate = useNavigate();
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('OTHER');
  const [photos, setPhotos] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) { setError('Please describe the issue'); return; }
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API}/challenges`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('accessToken')}` },
        body: JSON.stringify({ description, category }),
      });
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/dashboard'), 2000);
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to submit');
      }
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  if (success) return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-6xl mb-4">&#10003;</div>
        <h2 className="text-xl font-bold text-green-800">Challenge Reported!</h2>
        <p className="text-green-600 mt-2">Your landlord has been notified.</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="bg-orange-600 text-white p-4">
        <h1 className="text-xl font-bold">Report a Challenge</h1>
        <p className="text-orange-100 text-sm">Describe the issue and your landlord will be alerted</p>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {error && <p className="text-red-500 text-sm bg-red-50 p-3 rounded">{error}</p>}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map(c => (
              <button key={c} type="button" onClick={() => setCategory(c)}
                className={`p-3 rounded-lg text-sm font-medium border-2 transition-colors ${category === c ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-600'}`}>
                {c === 'PLUMBING' ? '🔧 Plumbing' : c === 'ELECTRICAL' ? '⚡ Electrical' : c === 'STRUCTURAL' ? '🏗 Structural' : c === 'CLEANING' ? '🧹 Cleaning' : '📋 Other'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            className="w-full p-3 border rounded-lg h-32 focus:ring-2 focus:ring-orange-500 focus:outline-none" required />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Photos (optional)</label>
          <input type="file" accept="image/*" multiple onChange={e => setPhotos(Array.from(e.target.files || []))}
            className="w-full p-2 border rounded-lg text-sm" />
          {photos.length > 0 && <p className="text-xs text-gray-500 mt-1">{photos.length} photo(s) selected</p>}
        </div>

        <button type="submit" disabled={loading}
          className="w-full bg-orange-500 text-white p-4 rounded-lg font-bold text-lg hover:bg-orange-600 disabled:bg-gray-300 transition-colors">
          {loading ? 'Submitting...' : 'Submit Challenge'}
        </button>
      </form>
      <BottomNav />
    </div>
  );
}
