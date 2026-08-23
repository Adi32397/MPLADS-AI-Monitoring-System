import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, Filter, Search, ChevronRight } from 'lucide-react';

export default function AIAnomalyDetection() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // For demo, if backend fails, provide deterministic mock data
    api.getHighRiskProjects().then(data => {
      setProjects(data);
      setLoading(false);
    }).catch(err => {
      console.warn("Using mock high-risk data", err);
      setProjects([
        {
          project_id: 'MPL-2026-00452',
          name: 'Rural Road Construction',
          district: 'Dehradun',
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
          category: 'Health',
          sanctioned_amount: 3500000,
          actual_expenditure: 4200000,
          physical_progress: 40,
          financial_progress: 90,
          risk_score: 75,
          risk_level: 'HIGH',
          status: 'Delayed'
        }
      ]);
      setLoading(false);
    });
  }, []);

  const formatCurrency = (val) => `₹${(val / 100000).toFixed(1)} Lakh`;

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
            <input type="text" placeholder="Search project ID or name..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm focus:ring-accent focus:border-accent" />
          </div>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
            <option>All Risk Levels</option>
            <option>Critical</option>
            <option>High</option>
          </select>
          <select className="border border-slate-300 rounded-lg px-3 py-2 text-sm text-slate-700 bg-white">
            <option>All Districts</option>
            <option>Dehradun</option>
            <option>Haridwar</option>
          </select>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200">
          <Filter size={16} /> More Filters
        </button>
      </div>

      {/* Projects Table */}
      <div className="glass-panel overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-500">Running AI models on project data...</div>
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
                {projects.map((p) => (
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
