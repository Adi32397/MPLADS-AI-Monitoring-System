import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import AIAnomalyDetection from './pages/AIAnomalyDetection';
import ProjectDetails from './pages/ProjectDetails';
import ProjectsList from './pages/ProjectsList';
import DuplicateDetection from './pages/DuplicateDetection';
import AlertsCenter from './pages/AlertsCenter';

function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
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
      <Routes>
        <Route path="/login" element={!user ? <Login onLogin={handleLogin} /> : <Navigate to="/" />} />
        
        {/* Protected Routes */}
        <Route path="/" element={user ? <Layout user={user} onLogout={handleLogout} /> : <Navigate to="/login" />}>
          <Route index element={<Dashboard user={user} />} />
          <Route path="anomalies" element={<AIAnomalyDetection />} />
          <Route path="projects" element={<ProjectsList />} />
          <Route path="projects/:id" element={<ProjectDetails user={user} />} />
          <Route path="duplicates" element={<DuplicateDetection />} />
          <Route path="alerts" element={<AlertsCenter />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
