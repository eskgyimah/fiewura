import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';

interface Assignment {
  id: string;
  proposedSchedule: string | null;
  confirmedSchedule: string | null;
  counterProposal: string | null;
  status: string;
  notes: string | null;
  costEstimate: number | null;
  estimatedCost: number | null;
  actualCost: number | null;
  beforePhotos: string[];
  afterPhotos: string[];
  receiptPhoto: string | null;
  maintenanceRequest: {
    description: string;
    category: string;
    property: { address: string };
    tenant: { name: string };
  };
}

export default function TechJobDetail() {
  const { id } = useParams<{ id: string }>();
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);
  const [estimatedCost, setEstimatedCost] = useState('');
  const [actualCost, setActualCost] = useState('');
  const [photos, setPhotos] = useState<FileList | null>(null);

  useEffect(() => {
    fetchAssignment();
  }, [id]);

  const fetchAssignment = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setAssignment(data);
        setEstimatedCost(data.estimatedCost?.toString() || '');
        setActualCost(data.actualCost?.toString() || '');
      }
    } catch (error) {
      console.error('Failed to fetch assignment:', error);
    } finally {
      setLoading(false);
    }
  };

  const respondToSchedule = async (action: 'accept' | 'reject', counter?: string) => {
    try {
      const body: any = { action };
      if (counter) body.counterProposal = counter;

      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/${id}/respond-schedule`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        const updated = await response.json();
        setAssignment(updated);
      }
    } catch (error) {
      console.error('Failed to respond:', error);
    }
  };

  const updateCosts = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/${id}/update-costs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({
          estimatedCost: parseFloat(estimatedCost),
          actualCost: parseFloat(actualCost)
        })
      });

      if (response.ok) {
        const updated = await response.json();
        setAssignment(updated);
      }
    } catch (error) {
      console.error('Failed to update costs:', error);
    }
  };

  const uploadPhotos = async (type: 'before' | 'after' | 'receipt') => {
    if (!photos) return;

    // Simulate upload, in real use Multer or Cloudinary
    const urls = Array.from(photos).map(file => URL.createObjectURL(file));

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/${id}/upload-photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ type, urls })
      });

      if (response.ok) {
        const updated = await response.json();
        setAssignment(updated);
      }
    } catch (error) {
      console.error('Failed to upload:', error);
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!assignment) return <div>Not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Job Detail</h1>

      <div className="bg-white p-6 rounded shadow mb-6">
        <h2 className="text-lg font-semibold">{assignment.maintenanceRequest.property.address}</h2>
        <p>{assignment.maintenanceRequest.description}</p>
        <p>Category: {assignment.maintenanceRequest.category}</p>
        <p>Tenant: {assignment.maintenanceRequest.tenant.name}</p>
        <p>Status: {assignment.status}</p>
        {assignment.proposedSchedule && (
          <p>Proposed: {new Date(assignment.proposedSchedule).toLocaleString()}</p>
        )}
        {assignment.confirmedSchedule && (
          <p>Confirmed: {new Date(assignment.confirmedSchedule).toLocaleString()}</p>
        )}
      </div>

      {/* Schedule Response */}
      {assignment.status === 'ASSIGNED' && (
        <div className="bg-white p-6 rounded shadow mb-6">
          <h3 className="text-lg font-semibold mb-4">Respond to Schedule</h3>
          <div className="flex space-x-4">
            <button
              onClick={() => respondToSchedule('accept')}
              className="bg-green-500 text-white px-4 py-2 rounded"
            >
              Accept
            </button>
            <button
              onClick={() => {
                const counter = prompt('Propose new date (YYYY-MM-DDTHH:MM)');
                if (counter) respondToSchedule('reject', counter);
              }}
              className="bg-red-500 text-white px-4 py-2 rounded"
            >
              Reject & Counter
            </button>
          </div>
        </div>
      )}

      {/* Cost Updates */}
      <div className="bg-white p-6 rounded shadow mb-6">
        <h3 className="text-lg font-semibold mb-4">Costs</h3>
        <div className="grid grid-cols-2 gap-4">
          <input
            type="number"
            placeholder="Estimated Cost"
            value={estimatedCost}
            onChange={(e) => setEstimatedCost(e.target.value)}
            className="border p-2 rounded"
          />
          <input
            type="number"
            placeholder="Actual Cost"
            value={actualCost}
            onChange={(e) => setActualCost(e.target.value)}
            className="border p-2 rounded"
          />
        </div>
        <button onClick={updateCosts} className="mt-4 bg-blue-500 text-white px-4 py-2 rounded">
          Update Costs
        </button>
      </div>

      {/* Photo Uploads */}
      <div className="bg-white p-6 rounded shadow">
        <h3 className="text-lg font-semibold mb-4">Photos</h3>
        <input
          type="file"
          multiple
          onChange={(e) => setPhotos(e.target.files)}
          className="mb-4"
        />
        <div className="flex space-x-4">
          <button onClick={() => uploadPhotos('before')} className="bg-purple-500 text-white px-4 py-2 rounded">
            Upload Before
          </button>
          <button onClick={() => uploadPhotos('after')} className="bg-green-500 text-white px-4 py-2 rounded">
            Upload After
          </button>
          <button onClick={() => uploadPhotos('receipt')} className="bg-orange-500 text-white px-4 py-2 rounded">
            Upload Receipt
          </button>
        </div>

        {/* Display Photos */}
        <div className="mt-4">
          <h4>Before: {assignment.beforePhotos.length} photos</h4>
          <h4>After: {assignment.afterPhotos.length} photos</h4>
          {assignment.receiptPhoto && <h4>Receipt: 1 photo</h4>}
        </div>
      </div>
    </div>
  );
}