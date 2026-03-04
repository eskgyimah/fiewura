import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

interface Job {
  id: string;
  status: string;
  description: string;
  property: string;
  tenant: { name: string; phone: string };
  proposedSchedule: string | null;
  confirmedSchedule: string | null;
  costEstimate: number | null;
  actualCost: number | null;
  payoutStatus: string;
}

export default function TechDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();

    // Socket for real-time updates
    const socket = io(import.meta.env.VITE_API_URL, {
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });
    socket.on('assignment-updated', (updatedJob: Job) => {
      setJobs(prev =>
        prev.map(j => j.id === updatedJob.id ? updatedJob : j)
      );
    });

    return () => {
      socket.off('assignment-updated');
      socket.disconnect();
    };
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/vendor/jobs`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      } else {
        console.error('Failed to fetch jobs');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (assignmentId: string, status: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/${assignmentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ status })
      });
      if (response.ok) {
        const updated = await response.json();
        setJobs(prev =>
          prev.map(a => a.id === assignmentId ? updated : a)
        );
      }
    } catch (error) {
      console.error('Failed to update status:', error);
    }
  };

  const updateCosts = async (assignmentId: string, estimatedCost: number | null, actualCost: number | null) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/${assignmentId}/update-costs`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ estimatedCost, actualCost })
      });
      if (response.ok) {
        console.log('Costs updated');
      }
    } catch (error) {
      console.error('Failed to update costs:', error);
    }
  };

  const uploadPhotos = async (assignmentId: string, type: string, urls: string[]) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/${assignmentId}/upload-photos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: JSON.stringify({ type, urls })
      });
      if (response.ok) {
        console.log('Photos uploaded');
      }
    } catch (error) {
      console.error('Failed to upload photos:', error);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Tech Team Dashboard</h1>

      <div className="space-y-4">
        {jobs.map(job => (
          <div key={job.id} className="bg-white p-4 rounded-lg shadow-md">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-lg font-semibold">{job.property}</h3>
              <div className="flex space-x-2">
                <span className={`px-2 py-1 rounded text-sm ${
                  job.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                  job.status === 'IN_PROGRESS' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {job.status}
                </span>
                <span className={`px-2 py-1 rounded text-sm ${
                  job.payoutStatus === 'PAID' ? 'bg-green-100 text-green-800' :
                  job.payoutStatus === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  Payout: {job.payoutStatus}
                </span>
              </div>
            </div>
            <p className="text-gray-600 mb-2">{job.description}</p>
            <p className="text-sm text-gray-500">Tenant: {job.tenant.name} ({job.tenant.phone})</p>
            {job.confirmedSchedule && (
              <p className="text-sm text-gray-500">Scheduled: {new Date(job.confirmedSchedule).toLocaleString()}</p>
            )}
            {job.costEstimate && (
              <p className="text-sm text-gray-500">Estimated Cost: GHS {job.costEstimate}</p>
            )}
            {job.actualCost && (
              <p className="text-sm text-gray-500">Actual Cost: GHS {job.actualCost}</p>
            )}

            <div className="mt-4 space-y-2">
              <div className="flex space-x-2">
                {job.status === 'ASSIGNED' && (
                  <button
                    onClick={() => updateStatus(job.id, 'PENDING')}
                    className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                  >
                    Accept
                  </button>
                )}
                {job.status === 'PENDING' && (
                  <button
                    onClick={() => updateStatus(job.id, 'SCHEDULED')}
                    className="px-3 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600"
                  >
                    Schedule
                  </button>
                )}
                {job.status === 'SCHEDULED' && (
                  <button
                    onClick={() => updateStatus(job.id, 'COMPLETED')}
                    className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                  >
                    Complete
                  </button>
                )}
              </div>
              {job.status === 'SCHEDULED' && (
                <div className="flex space-x-2">
                  <input
                    type="number"
                    placeholder="Estimated Cost"
                    onChange={(e) => updateCosts(job.id, parseFloat(e.target.value), null)}
                    className="px-2 py-1 border rounded"
                  />
                  <input
                    type="number"
                    placeholder="Actual Cost"
                    onChange={(e) => updateCosts(job.id, null, parseFloat(e.target.value))}
                    className="px-2 py-1 border rounded"
                  />
                  <button
                    onClick={() => uploadPhotos(job.id, 'receipt', ['placeholder-url'])}
                    className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
                  >
                    Upload Receipt
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}