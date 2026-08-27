import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { Search, Clock, Activity } from 'lucide-react';

export default function DelayedProjects({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    api.getProjects().then(data => {
      let filteredData = data.filter(p => (p.status || '').toLowerCase().includes('delay'));
      if (user) {
        if (user.role === 'mp') filteredData = filteredData.filter(p => p.constituency === 'Example Constituency');
        if (user.role === 'district') filteredData = filteredData.filter(p => p.district === 'Dehradun');
        if (user.role === 'state') filteredData = filteredData.filter(p => p.state === 'Uttarakhand');
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

  const formatCurrency = (val) => `₹${(val / 100000).toFixed(1)} Lakh`;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <Clock className="text-amber-500" size={28} />
            <h1 className="text-2xl font-bold text-slate-800">Delayed Projects</h1>
          </div>
          <p className="text-slate-500 mt-1">Projects running significantly behind their scheduled timeline</p>
        </div>
      </div>
      
      <div className="glass-panel p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search delayed projects by ID or name..." 
            className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="glass-panel overflow-hidden">
        {loading ? <div className="p-8 text-center">Loading...</div> : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">ID / Name</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Expected Completion</th>
                <th className="px-6 py-4">Physical Progress</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {projects.filter(p => {
                const searchMatch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.project_id || '').toLowerCase().includes(searchTerm.toLowerCase());
                return searchMatch;
              }).map(p => (
                <tr key={p.project_id} className="hover:bg-amber-50/50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{p.project_id}</p>
                    <p className="text-slate-500 text-xs">{p.name}</p>
                  </td>
                  <td className="px-6 py-4">{p.district}</td>
                  <td className="px-6 py-4 font-bold text-red-600">
                    {new Date(p.expected_completion).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="w-24 bg-slate-200 rounded-full h-2 mt-1">
                      <div className="bg-amber-500 h-2 rounded-full" style={{ width: `${p.physical_progress || 0}%` }}></div>
                    </div>
                    <span className="text-xs font-semibold text-amber-600">{p.physical_progress || 0}%</span>
                  </td>
                  <td className="px-6 py-4">
                    <Link to={`/projects/${p.project_id}`} className="text-accent font-medium hover:underline flex items-center gap-1">
                      <Activity size={16} /> Review
                    </Link>
                  </td>
                </tr>
              ))}
              
              {projects.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                    No delayed projects found in your jurisdiction.
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
