import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProjects().then(data => {
      setProjects(data);
      setLoading(false);
    }).catch(err => {
      console.warn("Using mock data", err);
      setProjects([{
        project_id: 'MPL-2026-00452', name: 'Rural Road Construction', district: 'Dehradun', 
        category: 'Infrastructure', status: 'Delayed', risk_level: 'CRITICAL', risk_score: 89,
        sanctioned_amount: 1850000, actual_expenditure: 2520000
      }]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">All Projects</h1>
          <p className="text-slate-500 mt-1">Complete repository of MPLADS projects</p>
        </div>
      </div>
      
      <div className="glass-panel p-4 flex gap-4">
        <div className="relative max-w-md w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input type="text" placeholder="Search projects..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm" />
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
              {projects.map(p => (
                <tr key={p.project_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4">
                    <p className="font-semibold">{p.project_id}</p>
                    <p className="text-slate-500 text-xs">{p.name}</p>
                  </td>
                  <td className="px-6 py-4">{p.district}</td>
                  <td className="px-6 py-4">{p.category}</td>
                  <td className="px-6 py-4"><span className={`status-badge ${p.status === 'Delayed' ? 'status-delayed' : 'status-progress'}`}>{p.status}</span></td>
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
