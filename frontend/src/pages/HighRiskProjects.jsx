import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { Search, AlertTriangle, Activity } from 'lucide-react';

export default function HighRiskProjects({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('');

  useEffect(() => {
    api.getHighRiskProjects().then(data => {
      let filteredData = data;
      if (user) {
        if (user.role === 'mp') filteredData = data.filter(p => p.constituency === 'Example Constituency');
        if (user.role === 'district') filteredData = data.filter(p => p.district === 'Dehradun');
        if (user.role === 'state') filteredData = data.filter(p => p.state === 'Uttarakhand');
      }
      setProjects(filteredData);
      setLoading(false);
    }).catch(err => {
      console.warn("Using mock data", err);
      // fallback
      setProjects([]);
      setLoading(false);
    });
  }, [user]);

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('completed')) return 'status-completed';
    if (s.includes('delay') || s.includes('overrun') || s.includes('risk') || s.includes('mismatch')) return 'status-delayed';
    if (s.includes('pending') || s.includes('verification')) return 'status-pending';
    return 'status-progress';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <AlertTriangle className="text-critical" size={28} />
            <h1 className="text-2xl font-bold text-slate-800">High-Risk Projects</h1>
          </div>
          <p className="text-slate-500 mt-1">Projects flagged by AI requiring immediate attention</p>
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
        
        <div className="flex gap-4">
          <select 
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all bg-white"
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
          >
            <option value="">All Flagged Risks</option>
            <option value="CRITICAL">Critical Priority</option>
            <option value="HIGH">High Priority</option>
          </select>
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">ID / Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Risk Score</th>
                <th className="px-6 py-4">Severity</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.filter(p => {
                const searchMatch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.project_id || '').toLowerCase().includes(searchTerm.toLowerCase());
                const riskMatch = riskFilter ? (p.risk_level || 'HIGH') === riskFilter : true;
                return searchMatch && riskMatch;
              }).map(p => (
                <tr key={p.project_id} className="hover:bg-red-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{p.project_id}</p>
                    <p className="text-slate-500 text-xs">{p.name}</p>
                  </td>
                  <td className="px-6 py-4">{p.district}</td>
                  <td className="px-6 py-4 font-bold text-red-600">{p.total_score || p.risk_score || 85} / 100</td>
                  <td className="px-6 py-4">
                    <span className={`status-badge risk-${(p.risk_level || 'high').toLowerCase()}`}>
                      {p.risk_level || 'HIGH'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/projects/${p.project_id}`} className="text-accent font-medium hover:underline flex items-center gap-1">
                      <Activity size={16} /> Investigate
                    </Link>
                  </td>
                </tr>
              ))}
              
              {projects.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No high-risk projects found in your jurisdiction.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
