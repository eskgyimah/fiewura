import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Landing from './components/Landing';
import Dashboard from './pages/Dashboard';
import TechDashboard from './pages/TechDashboard';
import TechJobDetail from './pages/TechJobDetail';
import PaymentSuccess from './pages/PaymentSuccess';
import CommunityPage from './pages/CommunityPage';
import MyPlace from './pages/MyPlace';
import PropertiesPage from './pages/PropertiesPage';
import ReportChallenge from './pages/ReportChallenge';
import ChallengeList from './pages/ChallengeList';
import MeterReadings from './pages/MeterReadings';
import MoreMenu from './pages/MoreMenu';
import PoliciesPage from './pages/PoliciesPage';
import SubscriptionPage from './pages/SubscriptionPage';
import AgreementView from './pages/AgreementView';
import SupportPage from './pages/SupportPage';
import AboutPage from './pages/AboutPage';
import PaymentHistory from './pages/PaymentHistory';

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/tech-dashboard" element={<TechDashboard />} />
        <Route path="/tech-job/:id" element={<TechJobDetail />} />
        <Route path="/payment/success" element={<PaymentSuccess />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/community/:propertyId" element={<CommunityPage />} />
        <Route path="/my-place" element={<MyPlace />} />
        <Route path="/properties" element={<PropertiesPage />} />
        <Route path="/report-challenge" element={<ReportChallenge />} />
        <Route path="/challenges" element={<ChallengeList />} />
        <Route path="/meter-readings" element={<MeterReadings />} />
        <Route path="/more" element={<MoreMenu />} />
        <Route path="/policies" element={<PoliciesPage />} />
        <Route path="/subscription" element={<SubscriptionPage />} />
        <Route path="/agreement/:id" element={<AgreementView />} />
        <Route path="/support" element={<SupportPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/payments" element={<PaymentHistory />} />
      </Routes>
    </Router>
  );
}
