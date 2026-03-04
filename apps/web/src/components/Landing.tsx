import { useState } from 'react';

function RegisterForm() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    phone: '',
    role: 'TENANT'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));
        alert('Registration successful! Please log in.');
        // Switch to login form
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Registration failed');
      }
    } catch (err) {
      console.error('Register error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm sm:max-w-md mx-auto">
      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <input
        type="text"
        name="name"
        placeholder="Full Name"
        value={formData.name}
        onChange={handleChange}
        className="w-full p-3 mb-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        required
        disabled={loading}
      />
      <input
        type="email"
        name="email"
        placeholder="Email"
        value={formData.email}
        onChange={handleChange}
        className="w-full p-3 mb-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        required
        disabled={loading}
      />
      <input
        type="tel"
        name="phone"
        placeholder="Phone Number"
        value={formData.phone}
        onChange={handleChange}
        className="w-full p-3 mb-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        disabled={loading}
      />
      <select
        name="role"
        value={formData.role}
        onChange={handleChange}
        className="w-full p-3 mb-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        disabled={loading}
      >
        <option value="TENANT">Tenant</option>
        <option value="LANDLORD">Landlord</option>
        <option value="TECH_TEAM">Tech Team</option>
      </select>
      <input
        type="password"
        name="password"
        placeholder="Password"
        value={formData.password}
        onChange={handleChange}
        className="w-full p-3 mb-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        required
        disabled={loading}
      />
      <button type="submit" className="w-full bg-orange-500 text-white p-3 rounded-lg hover:bg-orange-600 transition-colors text-base font-medium" disabled={loading}>
        {loading ? 'Registering...' : 'Register'}
      </button>
    </form>
  );
}

function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('user', JSON.stringify(data.user));

        // Redirect based on role
        if (data.user.role === 'LANDLORD') {
          window.location.href = '/dashboard';
        } else if (data.user.role === 'TECH_TEAM') {
          window.location.href = '/tech-dashboard';
        } else {
          window.location.href = '/dashboard'; // Default
        }
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Login failed');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow-md w-full max-w-sm sm:max-w-md mx-auto">
      {error && <p className="text-red-500 mb-4 text-sm">{error}</p>}
      <input
        type="email"
        placeholder="Email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="w-full p-3 mb-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        required
        disabled={loading}
      />
      <input
        type="password"
        placeholder="Password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="w-full p-3 mb-4 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-orange-500"
        required
        disabled={loading}
      />
      <button type="submit" className="w-full bg-orange-500 text-white p-3 rounded-lg hover:bg-orange-600 transition-colors text-base font-medium" disabled={loading}>
        {loading ? 'Logging in...' : 'Login'}
      </button>
    </form>
  );
}

export default function Landing() {
  const [isLogin, setIsLogin] = useState(true);

  return (
    <div className="min-h-screen bg-orange-50 flex items-center justify-center px-4 py-8">
      <div className="text-center w-full max-w-md">

        <h1 className="text-3xl sm:text-4xl font-bold text-orange-800 mb-4">Fie Wura</h1>
        <p className="text-base sm:text-lg text-gray-700 mb-6 sm:mb-8">Property Management for Ghanaian Landlords</p>
        <div className="mb-6 flex justify-center space-x-2">
          <button
            onClick={() => setIsLogin(true)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${isLogin ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`px-6 py-2 rounded-lg font-medium transition-colors ${!isLogin ? 'bg-orange-500 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
          >
            Register
          </button>
        </div>
        {isLogin ? <LoginForm /> : <RegisterForm />}
      </div>
    </div>
  );
}