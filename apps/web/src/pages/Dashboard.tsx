import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, RadialBarChart, RadialBar, ResponsiveContainer } from 'recharts';

declare global {
  interface Window {
    Paystack: any;
  }
}

interface Assignment {
  id: string;
  status: string;
  actualCost: number | null;
  maintenanceRequest: {
    description: string;
    property: { address: string };
  };
  vendor: { name: string; phone: string };
}

interface Property {
  id: string;
  address: string;
  rentAmount: number;
  tenants: { user: { name: string } }[];
}

interface Tenant {
  id: string;
  user: { name: string; email: string; phone: string };
  lease: { rentAmount: number; status: string };
  property: { address: string };
}

interface NewProperty {
  address: string;
  rentAmount: number;
  description: string;
}

interface PendingPayment {
  id: string;
  amount: number;
  dueDate: string;
  lease: { property: { address: string } };
}

interface AnalyticsData {
  totalProperties: number;
  totalTenants: number;
  occupancyRate: number;
  rentCollectedThisMonth: number;
  overdueRentCount: number;
  pendingMaintenanceCount: number;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const Card = ({ title, value }: { title: string; value: string | number }) => (
  <div className="bg-white p-4 rounded-lg shadow-md">
    <h3 className="text-sm font-medium text-gray-500">{title}</h3>
    <p className="text-2xl font-bold text-gray-900">{value}</p>
  </div>
);

export default function Dashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PendingPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPropertyForm, setShowPropertyForm] = useState(false);
  const [newProperty, setNewProperty] = useState<NewProperty>({ address: '', rentAmount: 0, description: '' });
  const [selectedImages, setSelectedImages] = useState<File[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/analytics/overview`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          },
        });
        if (response.ok) {
          const result = await response.json();
          setData(result);
        } else {
          console.error('Failed to fetch analytics');
        }
      } catch (error) {
        console.error('Error fetching analytics:', error);
      }
    };

    const fetchAssignments = async () => {
      try {
        // Fetch completed assignments for payout (assuming endpoint exists or use existing)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/maintenance/1/assignments`, { // Placeholder, need user properties
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const result = await response.json();
          setAssignments(result.filter((a: Assignment) => a.status === 'COMPLETED'));
        }
      } catch (error) {
        console.error('Error fetching assignments:', error);
      }
    };

    fetchAnalytics();

    const fetchProperties = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/properties`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const result = await response.json();
          setProperties(result);
        }
      } catch (error) {
        console.error('Error fetching properties:', error);
      }
    };

    const fetchTenants = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/tenants`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (response.ok) {
          const result = await response.json();
          setTenants(result);
        }
      } catch (error) {
        console.error('Error fetching tenants:', error);
      }
    };

    fetchProperties();
    fetchTenants();
    fetchAssignments();
    fetchPendingPayments();

    // Socket for real-time updates
    const socket = io(import.meta.env.VITE_API_URL);
    socket.on('analytics-update', (updatedData: AnalyticsData) => {
      setData(updatedData);
    });

    return () => {
      socket.off('analytics-update');
      socket.disconnect();
    };
  }, []);

  if (loading) return <div className="flex justify-center items-center h-screen">Loading...</div>;
  if (!data) return <div className="flex justify-center items-center h-screen">Error loading data</div>;

  // Prepare data for charts
  const pieData = data.topMaintenanceCategories.map((item, index) => ({
    name: item.category,
    value: item.count,
    color: COLORS[index % COLORS.length],
  }));

  const gaugeData = [
    {
      name: 'Occupancy',
      value: data.occupancyRate,
      fill: data.occupancyRate > 80 ? '#00C49F' : data.occupancyRate > 50 ? '#FFBB28' : '#FF8042',
    },
  ];

  const initiatePayout = async (assignmentId: string, amount: number, recipientCode: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/assignments/${assignmentId}/payout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount, recipientType: 'mobile_money', recipientCode }) // Assume MoMo
      });
      if (response.ok) {
        alert('Payout initiated successfully!');
        // Remove from list or update
        setAssignments(prev => prev.filter(a => a.id !== assignmentId));
      } else {
        alert('Failed to initiate payout');
      }
    } catch (error) {
      console.error('Payout error:', error);
      alert('Error initiating payout');
    }
  };

  const createProperty = async () => {
    try {
      const formData = new FormData();
      formData.append('address', newProperty.address);
      formData.append('rentAmount', newProperty.rentAmount.toString());
      formData.append('description', newProperty.description);
      formData.append('city', 'Accra');
      formData.append('country', 'Ghana');

      selectedImages.forEach((image, index) => {
        formData.append('images', image);
      });

      const response = await fetch(`${import.meta.env.VITE_API_URL}/properties`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`
        },
        body: formData
      });
      if (response.ok) {
        alert('Property created successfully!');
        setNewProperty({ address: '', rentAmount: 0, description: '' });
        setSelectedImages([]);
        setShowPropertyForm(false);
        // Refresh properties
        fetchProperties();
      } else {
        alert('Failed to create property');
      }
    } catch (error) {
      console.error('Create property error:', error);
      alert('Error creating property');
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/properties`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
      });
      if (response.ok) {
        const result = await response.json();
        setProperties(result);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    }
  };

  const fetchPendingPayments = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/payments/pending`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      if (response.ok) {
        const result = await response.json();
        setPendingPayments(result);
      }
    } catch (error) {
      console.error('Error fetching pending payments:', error);
    }
  };

  const handlePayment = (payment: PendingPayment) => {
    if (!window.Paystack) {
      alert('Paystack not loaded');
      return;
    }

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const paystack = window.Paystack();
    paystack.newTransaction({
      key: 'pk_test_your-public-key', // Replace with actual public key
      email: user.email || 'user@example.com',
      amount: payment.amount * 100, // Convert to kobo
      currency: 'GHS',
      ref: `rent_${payment.id}_${Date.now()}`,
      onSuccess: async (transaction: any) => {
        // Send to backend to verify and update
        await fetch(`${import.meta.env.VITE_API_URL}/payments/verify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: JSON.stringify({ reference: transaction.reference, paymentId: payment.id })
        });
        alert('Payment successful!');
        fetchPendingPayments(); // Refresh
      },
      onCancel: () => {
        alert('Payment cancelled');
      }
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-6">Analytics Dashboard</h1>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card title="Total Properties" value={data.totalProperties} />
        <Card title="Total Tenants" value={data.totalTenants} />
        <Card title="Occupancy Rate" value={`${data.occupancyRate}%`} />
        <Card title="Rent Collected This Month" value={`GHS ${data.rentCollectedThisMonth.toFixed(2)}`} />
        <Card title="Overdue Rent Count" value={data.overdueRentCount} />
        <Card title="Pending Maintenance Count" value={data.pendingMaintenanceCount} />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Maintenance Categories Pie Chart */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Top Maintenance Categories</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Occupancy Gauge */}
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Occupancy Rate</h2>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="10%" outerRadius="80%" barSize={10} data={gaugeData}>
              <RadialBar
                minAngle={15}
                label={{ position: 'insideStart', fill: '#fff' }}
                background
                clockWise
                dataKey="value"
              />
              <Legend iconSize={10} layout="vertical" verticalAlign="middle" wrapperStyle={{}} />
            </RadialBarChart>
          </ResponsiveContainer>
          <p className="text-center mt-2">{data.occupancyRate}% Occupied</p>
        </div>
      </div>

      {/* Completed Assignments for Payout */}
      {assignments.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Completed Maintenance Jobs - Ready for Payout</h2>
          <div className="space-y-4">
            {assignments.map(assignment => (
              <div key={assignment.id} className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold">{assignment.maintenanceRequest.description}</h3>
                <p className="text-gray-600">{assignment.maintenanceRequest.property.address}</p>
                <p className="text-sm text-gray-500">Vendor: {assignment.vendor.name} ({assignment.vendor.phone})</p>
                {assignment.actualCost && <p className="text-sm text-gray-500">Actual Cost: GHS {assignment.actualCost}</p>}
                <button
                  onClick={() => {
                    const amount = prompt('Enter payout amount (GHS):', assignment.actualCost?.toString() || '');
                    const recipientCode = prompt('Enter vendor MoMo number:');
                    if (amount && recipientCode) {
                      initiatePayout(assignment.id, parseFloat(amount), recipientCode);
                    }
                  }}
                  className="mt-2 px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Initiate Payout
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Properties Section */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">My Properties</h2>
          <button
            onClick={() => setShowPropertyForm(!showPropertyForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            {showPropertyForm ? 'Cancel' : 'Add Property'}
          </button>
        </div>
        {showPropertyForm && (
          <div className="bg-gray-100 p-4 rounded mb-4">
            <input
              type="text"
              placeholder="Address"
              value={newProperty.address}
              onChange={(e) => setNewProperty({ ...newProperty, address: e.target.value })}
              className="w-full p-2 mb-2 border rounded"
            />
            <input
              type="number"
              placeholder="Rent Amount"
              value={newProperty.rentAmount}
              onChange={(e) => setNewProperty({ ...newProperty, rentAmount: parseFloat(e.target.value) })}
              className="w-full p-2 mb-2 border rounded"
            />
            <textarea
              placeholder="Description"
              value={newProperty.description}
              onChange={(e) => setNewProperty({ ...newProperty, description: e.target.value })}
              className="w-full p-2 mb-2 border rounded"
            />
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={(e) => setSelectedImages(Array.from(e.target.files || []))}
              className="w-full p-2 mb-2 border rounded"
            />
            {selectedImages.length > 0 && (
              <p className="text-sm text-gray-600 mb-2">{selectedImages.length} image(s) selected</p>
            )}
            <button
              onClick={createProperty}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
            >
              Create Property
            </button>
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {properties.map(property => (
            <div key={property.id} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">{property.address}</h3>
              <p className="text-gray-600">Rent: GHS {property.rentAmount}</p>
              <p className="text-sm text-gray-500">Tenants: {property.tenants.length}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Tenants Section */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">My Tenants</h2>
        <div className="space-y-4">
          {tenants.map(tenant => (
            <div key={tenant.id} className="bg-white p-4 rounded-lg shadow-md">
              <h3 className="text-lg font-semibold">{tenant.user.name}</h3>
              <p className="text-gray-600">Property: {tenant.property.address}</p>
              <p className="text-sm text-gray-500">Email: {tenant.user.email} | Phone: {tenant.user.phone}</p>
              <p className="text-sm text-gray-500">Rent: GHS {tenant.lease.rentAmount} | Status: {tenant.lease.status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Payments Section */}
      {pendingPayments.length > 0 && (
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Pending Rent Payments</h2>
          <div className="space-y-4">
            {pendingPayments.map(payment => (
              <div key={payment.id} className="bg-white p-4 rounded-lg shadow-md">
                <h3 className="text-lg font-semibold">GHS {payment.amount}</h3>
                <p className="text-gray-600">{payment.lease.property.address}</p>
                <p className="text-sm text-gray-500">Due: {new Date(payment.dueDate).toLocaleDateString()}</p>
                <button
                  onClick={() => handlePayment(payment)}
                  className="mt-2 bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Pay Rent
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}