import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link, useLocation } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function ProjectsList({ user }) {
  const location = useLocation();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  // Sync filters from URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has('risk')) setRiskFilter(params.get('risk').toUpperCase());
    if (params.has('status')) setStatusFilter(params.get('status'));
  }, [location.search]);

  useEffect(() => {
    let fetchPromise;
    if (user && user.role === 'state') {
      fetchPromise = api.getStateProjects(user.state);
    } else {
      fetchPromise = api.getProjects();
    }

    fetchPromise.then(data => {
      // For state role, data is already filtered by backend
      let filteredData = data;
      if (user && user.role !== 'state') {
        if (user.role === 'mp') filteredData = data.filter(p => p.constituency === 'Example Constituency');
        if (user.role === 'district') filteredData = data; 
      }
      setProjects(filteredData);
      setLoading(false);
    }).catch(err => {
      console.warn("Using mock data", err);
      const mockProjects = [
        { project_id: 'MPL-2026-00452', name: 'Rural Road Construction', district: 'Dehradun', state: 'Uttarakhand', constituency: 'Example Constituency', category: 'Infrastructure', status: 'Delayed', risk_level: 'CRITICAL', risk_score: 89, sanctioned_amount: 1850000, actual_expenditure: 2520000 },
        { project_id: 'MPL-2026-00891', name: 'Community Hall', district: 'Dehradun', state: 'Uttarakhand', constituency: 'Example Constituency', category: 'Public Facility', status: 'In Progress', risk_level: 'MEDIUM', risk_score: 45, sanctioned_amount: 500000, actual_expenditure: 200000 },
        { project_id: 'MPL-2026-00912', name: 'Water Supply Project', district: 'Haridwar', state: 'Uttarakhand', constituency: 'Haridwar Rural', category: 'Water', status: 'Delayed', risk_level: 'HIGH', risk_score: 72, sanctioned_amount: 1200000, actual_expenditure: 800000 },
        { project_id: 'MPL-2026-01004', name: 'Primary School Renovation', district: 'Pune', state: 'Maharashtra', constituency: 'Pune City', category: 'Education', status: 'Completed', risk_level: 'LOW', risk_score: 12, sanctioned_amount: 800000, actual_expenditure: 800000 },
      ];
      
      let filteredMock = mockProjects;
      if (user) {
        if (user.role === 'mp') filteredMock = mockProjects.filter(p => p.constituency === 'Example Constituency');
        if (user.role === 'district') filteredMock = mockProjects; // Show all for demo
        if (user.role === 'state') filteredMock = mockProjects.filter(p => p.state === user.state);
      }
      
      setProjects(filteredMock);
      setLoading(false);
    });
  }, [user]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">All Projects</h1>
          <p className="text-slate-500 mt-1">Complete repository of MPLADS projects</p>
        </div>
      </div>
      
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search by ID or name..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex flex-wrap gap-4">
          <select 
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">All Statuses</option>
            {[...new Set(projects.map(p => p.status).filter(Boolean))].map(status => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          <select 
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
          >
            <option value="">All Districts</option>
            {[...new Set(projects.map(p => p.district).filter(Boolean))].map(district => (
              <option key={district} value={district}>{district}</option>
            ))}
          </select>

          <select 
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="">All Risks</option>
            <option value="CRITICAL">Critical</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {(searchTerm || statusFilter || districtFilter || riskFilter) && (
            <button 
              onClick={() => {
                setSearchTerm('');
                setStatusFilter('');
                setDistrictFilter('');
                setRiskFilter('');
              }}
              className="px-4 py-2 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors whitespace-nowrap"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">ID / Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Risk</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.filter(p => {
                const searchMatch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.project_id || '').toLowerCase().includes(searchTerm.toLowerCase());
                const statusMatch = statusFilter ? p.status === statusFilter : true;
                const districtMatch = districtFilter ? p.district === districtFilter : true;
                const riskMatch = riskFilter ? (p.risk_level || 'LOW') === riskFilter : true;
                return searchMatch && statusMatch && districtMatch && riskMatch;
              }).map(p => (
                <tr key={p.project_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{p.project_id}</p>
                    <p className="text-slate-500 text-xs">{p.name}</p>
                  </td>
                  <td className="px-6 py-4">{p.district}</td>
                  <td className="px-6 py-4">{p.category}</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge ${(() => {
                      const s = (p.status || '').toLowerCase();
                      if (s.includes('completed')) return 'status-completed';
                      if (s.includes('delay') || s.includes('overrun') || s.includes('risk') || s.includes('mismatch')) return 'status-delayed';
                      if (s.includes('pending') || s.includes('verification')) return 'status-pending';
                      return 'status-progress';
                    })()}`}>
                      {p.status || 'Unknown'}
                    </span>
                  </td>
                  <td className="px-6 py-4"><span className={`status-badge risk-${(p.risk_level || 'low').toLowerCase()}`}>{p.risk_level || 'LOW'}</span></td>
                  <td className="px-6 py-4"><Link to={`/projects/${p.project_id}`} className="text-accent font-medium">View</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
