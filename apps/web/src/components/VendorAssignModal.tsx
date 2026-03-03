import { useState, useEffect } from 'react';

interface Vendor {
  id: string;
  name: string;
  phone: string;
  specialties: string[];
  rating: number;
  notes?: string;
}

interface VendorAssignModalProps {
  maintenanceId: string;
  isOpen: boolean;
  onClose: () => void;
  onAssign: (assignment: any) => void;
}

export default function VendorAssignModal({ maintenanceId, isOpen, onClose, onAssign }: VendorAssignModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [selectedVendor, setSelectedVendor] = useState<string>('');
  const [proposedSchedule, setProposedSchedule] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [costEstimate, setCostEstimate] = useState<string>('');
  const [suggestedVendors, setSuggestedVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
    }
  }, [isOpen]);

  const fetchVendors = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/vendors`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setVendors(data);
        // Suggest based on... for now all
        setSuggestedVendors(data.slice(0, 3)); // top 3
      }
    } catch (error) {
      console.error('Failed to fetch vendors:', error);
    }
  };

  const handleAssign = async () => {
    if (!selectedVendor) return;

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/maintenance/${maintenanceId}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          vendorId: selectedVendor,
          proposedSchedule: proposedSchedule || null,
          notes,
          costEstimate: costEstimate ? parseFloat(costEstimate) : null
        })
      });

      if (response.ok) {
        const assignment = await response.json();
        onAssign(assignment);
        onClose();
      } else {
        console.error('Failed to assign vendor');
      }
    } catch (error) {
      console.error('Error assigning vendor:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">Assign Vendor</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Select Vendor</label>
          <select
            value={selectedVendor}
            onChange={(e) => setSelectedVendor(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="">Choose a vendor...</option>
            {vendors.map(vendor => (
              <option key={vendor.id} value={vendor.id}>
                {vendor.name} - {vendor.specialties.join(', ')} (Rating: {vendor.rating})
              </option>
            ))}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Proposed Schedule</label>
          <input
            type="datetime-local"
            value={proposedSchedule}
            onChange={(e) => setProposedSchedule(e.target.value)}
            className="w-full p-2 border rounded"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Cost Estimate (GHS)</label>
          <input
            type="number"
            value={costEstimate}
            onChange={(e) => setCostEstimate(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="Optional"
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full p-2 border rounded"
            rows={3}
          />
        </div>

        <div className="flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
          >
            Cancel
          </button>
          <button
            onClick={handleAssign}
            disabled={loading || !selectedVendor}
            className="px-4 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 disabled:opacity-50"
          >
            {loading ? 'Assigning...' : 'Assign'}
          </button>
        </div>
      </div>
    </div>
  );
}