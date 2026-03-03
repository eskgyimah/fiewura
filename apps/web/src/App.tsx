import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import Dashboard from './pages/Dashboard';
import TechDashboard from './pages/TechDashboard';
import PaymentSuccess from './pages/PaymentSuccess';
import CommunityPage from './pages/CommunityPage';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tech-dashboard" element={<TechDashboard />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/community/:propertyId" element={<CommunityPage />} />
      </Routes>
    </Router>
  );
}