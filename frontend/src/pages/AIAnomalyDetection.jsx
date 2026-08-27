import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, Filter, Search, ChevronRight } from 'lucide-react';

export default function AIAnomalyDetection({ user }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState('All Risk Levels');
  const [districtFilter, setDistrictFilter] = useState('All Districts');
  const [stateFilter, setStateFilter] = useState('All States');

  useEffect(() => {
    // For demo, if backend fails, provide deterministic mock data
    api.getHighRiskProjects().then(data => {
      let filteredData = data;
      if (user) {
        if (user.role === 'mp') filteredData = data.filter(p => p.constituency === 'Example Constituency');
        if (user.role === 'district') filteredData = data; // Show all for demo so CSV upload is visible
        if (user.role === 'state') filteredData = data.filter(p => p.state === 'Uttarakhand');
      }
      setProjects(filteredData);
      setLoading(false);
    }).catch(err => {
      console.warn("Using mock high-risk data", err);
      const mockProjects = [
        {
          project_id: 'MPL-2026-00452',
          name: 'Rural Road Construction',
          district: 'Dehradun',
          state: 'Uttarakhand',
          constituency: 'Example Constituency',
          category: 'Infrastructure',
          sanctioned_amount: 1850000,
          actual_expenditure: 2520000,
          physical_progress: 61,
          financial_progress: 82,
          risk_score: 89,
          risk_level: 'CRITICAL',
          status: 'Delayed'
        },
        {
          project_id: 'MPL-2026-1015',
          name: 'Health Project 15',
          district: 'Haridwar',
          state: 'Uttarakhand',
          constituency: 'Haridwar Rural',
          category: 'Health',
          sanctioned_amount: 3500000,
          actual_expenditure: 4200000,
          physical_progress: 40,
          financial_progress: 90,
          risk_score: 75,
          risk_level: 'HIGH',
          status: 'Delayed'
        },
        {
          project_id: 'MPL-2026-0891',
          name: 'Community Hall',
          district: 'Dehradun',
          state: 'Uttarakhand',
          constituency: 'Example Constituency',
          category: 'Public Facility',
          sanctioned_amount: 500000,
          actual_expenditure: 200000,
          physical_progress: 20,
          financial_progress: 80,
          risk_score: 80,
          risk_level: 'HIGH',
          status: 'In Progress'
        }
      ];

      let filteredMock = mockProjects;
      if (user) {
        if (user.role === 'mp') filteredMock = mockProjects.filter(p => p.constituency === 'Example Constituency');
        if (user.role === 'district') filteredMock = mockProjects; // Show all for demo
        if (user.role === 'state') filteredMock = mockProjects.filter(p => p.state === 'Uttarakhand');
      }
      
      setProjects(filteredMock);
      setLoading(false);
    });
  }, [user]);

  const formatCurrency = (val) => `₹${(val / 100000).toFixed(1)} Lakh`;

  // Dynamic filter options based on actual data
  const uniqueDistricts = [...new Set(projects.map(p => p.district))].filter(Boolean);
  const uniqueStates = [...new Set(projects.map(p => p.state))].filter(Boolean);
  const uniqueRiskLevels = [...new Set(projects.map(p => p.risk_level))].filter(Boolean);

  // Apply Filters
  const filteredProjects = projects.filter(p => {
    const matchesSearch = 
      (p.name && p.name.toLowerCase().includes(searchTerm.toLowerCase())) || 
      (p.project_id && p.project_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRisk = riskFilter === 'All Risk Levels' || p.risk_level === riskFilter;
    const matchesDistrict = districtFilter === 'All Districts' || p.district === districtFilter;
    const matchesState = stateFilter === 'All States' || p.state === stateFilter;
    
    return matchesSearch && matchesRisk && matchesDistrict && matchesState;
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <AlertTriangle className="text-critical" /> AI Anomaly Detection
          </h1>
          <p className="text-slate-500 mt-1">Identify unusual financial and project execution patterns using machine learning.</p>
        </div>
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-4 flex-1">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Search project ID or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-accent focus:border-accent outline-none" 
            />
          </div>
          <select 
            value={riskFilter}
            onChange={(e) => setRiskFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none cursor-pointer"
          >
            <option>All Risk Levels</option>
            {uniqueRiskLevels.map(risk => (
              <option key={risk} value={risk}>{risk}</option>
            ))}
          </select>
          <select 
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none cursor-pointer"
          >
            <option>All States</option>
            {uniqueStates.map(st => (
              <option key={st} value={st}>{st}</option>
            ))}
          </select>
          <select 
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white outline-none cursor-pointer"
          >
            <option>All Districts</option>
            {uniqueDistricts.map(dist => (
              <option key={dist} value={dist}>{dist}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => {
            setSearchTerm('');
            setRiskFilter('All Risk Levels');
            setDistrictFilter('All Districts');
            setStateFilter('All States');
          }}
          className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors"
        >
          <Filter size={16} /> Reset Filters
        </button>
      </div>

      {/* Projects Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Running AI models on project data...</div>
        ) : filteredProjects.length === 0 ? (
          <div className="p-12 text-center">
            <Search size={48} className="mx-auto text-slate-300 mb-4" />
            <p className="text-slate-500 font-medium text-lg">No anomalies found</p>
            <p className="text-slate-400 text-sm mt-1">Try adjusting your filters or search term.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-6 py-4">Project</th>
                  <th className="px-6 py-4">District</th>
                  <th className="px-6 py-4">Finances</th>
                  <th className="px-6 py-4">Progress (Phys/Fin)</th>
                  <th className="px-6 py-4 text-center">AI Risk Score</th>
                  <th className="px-6 py-4">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => (
                  <tr key={p.project_id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-slate-800">{p.project_id}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{p.name}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{p.district}</td>
                    <td className="px-6 py-4">
                      <div className="text-xs">
                        <p><span className="text-slate-500">Sanc:</span> {formatCurrency(p.sanctioned_amount)}</p>
                        <p className={p.actual_expenditure > p.sanctioned_amount ? 'text-red-600 font-medium' : 'text-slate-700'}>
                          <span className="text-slate-500">Exp:</span> {formatCurrency(p.actual_expenditure)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="w-8 text-right font-medium">{p.physical_progress}%</span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className="bg-blue-500 h-full" style={{ width: `${p.physical_progress}%` }}></div>
                        </div>
                        <span className="mx-1 text-slate-300">/</span>
                        <span className="w-8 font-medium text-amber-600">{p.financial_progress}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col items-center">
                        <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full font-bold text-sm ${p.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700 border-2 border-red-200' : 'bg-orange-100 text-orange-700 border-2 border-orange-200'}`}>
                          {p.risk_score}
                        </span>
                        <span className={`text-[10px] font-bold mt-1 uppercase tracking-wider ${p.risk_level === 'CRITICAL' ? 'text-red-600' : 'text-orange-600'}`}>
                          {p.risk_level}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Link to={`/projects/${p.project_id}`} className="inline-flex items-center gap-1 text-accent hover:text-accent-light font-medium text-sm transition-colors">
                        Investigate <ChevronRight size={16} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
