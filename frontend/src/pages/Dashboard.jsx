import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MPDashboard from './MPDashboard';
import DistrictDashboard from './DistrictDashboard';
import StateDashboard from './StateDashboard';
import MinistryDashboard from './MinistryDashboard';

export default function Dashboard({ user }) {
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate('/login');
    }
  }, [user, navigate]);

  if (!user) return null;

  switch (user.role) {
    case 'mp':
      return <MPDashboard user={user} />;
    case 'district':
      return <DistrictDashboard user={user} />;
    case 'state':
      return <StateDashboard user={user} />;
    case 'ministry':
      return <MinistryDashboard user={user} />;
    default:
      return <div className="p-8 text-red-500">Error: Unknown Role</div>;
  }
}
