import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import MPDashboard from './pages/MPDashboard';
import DistrictDashboard from './pages/DistrictDashboard';
import AIAnomalyDetection from './pages/AIAnomalyDetection';
import ProjectDetails from './pages/ProjectDetails';
import ProjectsList from './pages/ProjectsList';
import HighRiskProjects from './pages/HighRiskProjects';
import DelayedProjects from './pages/DelayedProjects';
import FundUtilization from './pages/FundUtilization';
import DuplicateDetection from './pages/DuplicateDetection';
import AlertsCenter from './pages/AlertsCenter';
import VerificationQueue from './pages/VerificationQueue';
import GeographicRisk from './pages/GeographicRisk';
import { FinancialYearProvider } from './context/FinancialYearContext';

const RoleRoute = ({ user, allowedRole, children }) => {
  const [showError, setShowError] = useState(false);
  
  useEffect(() => {
    if (user && user.role !== allowedRole) {
      setShowError(true);
    }
  }, [user, allowedRole]);

  if (!user) return <Navigate to="/login" />;
  
  if (showError) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-900 text-white font-mono">
        <h1 className="text-4xl text-red-500 font-bold mb-4">Access Restricted</h1>
        <p className="mb-8">Redirecting to your authorized dashboard...</p>
        <Navigate to="/" replace />
      </div>
    );
  }

  return children;
};

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    if (!saved) return null;
    try {
      const parsedUser = JSON.parse(saved);
      // Normalize legacy roles
      if (parsedUser.role === 'district_authority') parsedUser.role = 'district';
      if (parsedUser.role === 'state_nodal_authority') parsedUser.role = 'state';
      return parsedUser;
    } catch (e) {
      return null;
    }
  });

  const handleLogin = (userData) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
  };

  return (
    <Router>
      <FinancialYearProvider>
        <Routes>
          <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
          
          {/* Protected Routes */}
          <Route path="/" element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
            <Route index element={
              <Navigate to={`/${user?.role}/dashboard`} replace />
            } />
            
            {/* Role-Specific Dashboards */}
            <Route path="mp/dashboard" element={<RoleRoute user={user} allowedRole="mp"><MPDashboard user={user} /></RoleRoute>} />
            <Route path="district/dashboard" element={<RoleRoute user={user} allowedRole="district"><DistrictDashboard user={user} /></RoleRoute>} />

            {/* Shared Pages */}
            <Route path="anomalies" element={<AIAnomalyDetection user={user} />} />
            <Route path="high-risk" element={<HighRiskProjects user={user} />} />
            <Route path="delayed" element={<DelayedProjects user={user} />} />
            <Route path="utilization" element={<FundUtilization user={user} />} />
            <Route path="projects" element={<ProjectsList user={user} />} />
            <Route path="projects/:id" element={<ProjectDetails user={user} />} />
            <Route path="duplicates" element={<DuplicateDetection user={user} />} />
            <Route path="alerts" element={<AlertsCenter user={user} />} />
            <Route path="verification" element={<VerificationQueue user={user} />} />
            <Route path="geographic" element={<GeographicRisk user={user} />} />
            
            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </FinancialYearProvider>
    </Router>
  );
}

export default App;
