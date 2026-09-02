import { useState, useEffect } from 'react';
import { api } from '../api';
import { Link, useLocation } from 'react-router-dom';
import { Search, Trash2 } from 'lucide-react';
import { DISTRICT_COORDINATES } from '../utils/districtCoordinates';
import { useFinancialYear, getProjectFinancialYear } from '../context/FinancialYearContext';

export default function ProjectsList({ user }) {
  const location = useLocation();
  const { financialYear, registerProjectYears } = useFinancialYear();
  
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [districtFilter, setDistrictFilter] = useState('');
  const [riskFilter, setRiskFilter] = useState('');
  const [selectedProjects, setSelectedProjects] = useState([]);

  const filteredProjects = projects.filter(p => {
    const searchMatch = (p.name || '').toLowerCase().includes(searchTerm.toLowerCase()) || (p.project_id || '').toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatch = statusFilter ? (p.status || '').toLowerCase() === statusFilter.toLowerCase() : true;
    const districtMatch = districtFilter ? (p.district || '').toLowerCase() === districtFilter.toLowerCase() : true;
    const riskMatch = riskFilter ? (p.risk_level || 'LOW') === riskFilter : true;
    const fyMatch = financialYear && financialYear !== 'All Financial Years'
      ? getProjectFinancialYear(p.start_date || p.Start_Date) === financialYear
      : true;
    return searchMatch && statusMatch && districtMatch && riskMatch && fyMatch;
  });

  const handleDelete = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await api.deleteProject(projectId);
        setProjects(projects.filter(p => p.project_id !== projectId));
        setSelectedProjects(selectedProjects.filter(id => id !== projectId));
      } catch (error) {
        console.error('Failed to delete project', error);
        alert('Failed to delete project. Please try again.');
      }
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.length === 0) return;
    if (window.confirm(`Are you sure you want to delete ${selectedProjects.length} projects?`)) {
      try {
        await api.bulkDeleteProjects(selectedProjects);
        setProjects(projects.filter(p => !selectedProjects.includes(p.project_id)));
        setSelectedProjects([]);
      } catch (error) {
        console.error('Failed to delete projects', error);
        alert('Failed to delete projects. Please try again.');
      }
    }
  };

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
      if (registerProjectYears) registerProjectYears(data);
      setProjects(data);
      setLoading(false);
    }).catch(err => {
      console.warn("Using mock data", err);
      const mockProjects = [
        { project_id: 'MPL-2026-00452', name: 'Rural Road Construction', district: 'Dehradun', state: 'Uttarakhand', constituency: 'Example Constituency', category: 'Infrastructure', status: 'Delayed', risk_level: 'CRITICAL', risk_score: 89, sanctioned_amount: 1850000, actual_expenditure: 2520000 },
        { project_id: 'MPL-2026-00891', name: 'Community Hall', district: 'Dehradun', state: 'Uttarakhand', constituency: 'Example Constituency', category: 'Public Facility', status: 'In Progress', risk_level: 'MEDIUM', risk_score: 45, sanctioned_amount: 500000, actual_expenditure: 200000 },
        { project_id: 'MPL-2026-00912', name: 'Water Supply Project', district: 'Haridwar', state: 'Uttarakhand', constituency: 'Haridwar Rural', category: 'Water', status: 'Delayed', risk_level: 'HIGH', risk_score: 72, sanctioned_amount: 1200000, actual_expenditure: 800000 },
        { project_id: 'MPL-2026-01004', name: 'Primary School Renovation', district: 'Pune', state: 'Maharashtra', constituency: 'Pune City', category: 'Education', status: 'Completed', risk_level: 'LOW', risk_score: 12, sanctioned_amount: 800000, actual_expenditure: 800000 },
      ];
      
      setProjects(mockProjects);
      setLoading(false);
    });
  }, [user]);

  const allDistricts = [...new Set([
    ...projects.map(p => p.district),
    ...Object.keys(DISTRICT_COORDINATES)
  ])].filter(Boolean).sort();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">All Projects</h1>
            <span className="bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              FY {financialYear}
            </span>
          </div>
          <p className="text-slate-500 mt-1">Complete repository of MPLADS projects • Showing {filteredProjects.length} projects</p>
        </div>
        {selectedProjects.length > 0 && (
          <button 
            onClick={handleBulkDelete}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium rounded-lg shadow flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} /> Delete {selectedProjects.length} Selected
          </button>
        )}
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
            {allDistricts.map(district => (
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
                <th className="px-6 py-4 w-12 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                    checked={filteredProjects.length > 0 && selectedProjects.length === filteredProjects.length}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedProjects(filteredProjects.map(p => p.project_id));
                      } else {
                        setSelectedProjects([]);
                      }
                    }}
                  />
                </th>
                <th className="px-6 py-4">ID / Name</th>
                <th className="px-6 py-4">Financial Year</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Risk</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProjects.map(p => (
                <tr key={p.project_id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
                      checked={selectedProjects.includes(p.project_id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedProjects([...selectedProjects, p.project_id]);
                        } else {
                          setSelectedProjects(selectedProjects.filter(id => id !== p.project_id));
                        }
                      }}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold">{p.project_id}</p>
                    <p className="text-slate-500 text-xs">{p.name}</p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      {getProjectFinancialYear(p.start_date || p.Start_Date) || '2025-2026'}
                    </span>
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
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Link to={`/projects/${p.project_id}`} className="text-accent font-medium hover:underline">View</Link>
                      <button 
                        onClick={() => handleDelete(p.project_id)}
                        className="text-red-500 hover:text-red-700 transition-colors"
                        title="Delete Project"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
