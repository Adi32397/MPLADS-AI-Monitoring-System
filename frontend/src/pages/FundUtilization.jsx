import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, Filter, AlertCircle, ChevronDown, ChevronRight, Activity, ShieldAlert, CheckCircle2, Zap } from 'lucide-react';
import { useFinancialYear } from '../context/FinancialYearContext';

const formatCurrency = (val) => `₹${(val / 100000).toFixed(1)} Lakh`;
const formatCrore = (val) => `₹${(val / 10000000).toFixed(2)} Cr`;

export default function FundUtilization({ user }) {
  const { financialYear, filterProjectsByFY } = useFinancialYear();
  const [loading, setLoading] = useState(true);
  
  // State for Filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState(user?.role === 'state' ? user.state : 'All States');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');

  // State for Data
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [expandedAlert, setExpandedAlert] = useState(null);

  // Load Initial Filter Options
  useEffect(() => {
    api.getFinancialProjects('', '').then(data => {
      const uniqueStates = [...new Set(data.map(p => p.State))].filter(Boolean).sort();
      const uniqueDistricts = [...new Set(data.map(p => p.District))].filter(Boolean).sort();
      setStates(uniqueStates);
      setDistricts(uniqueDistricts);
    }).catch(console.error);
  }, []);

  // Fetch Data Based on Filters
  useEffect(() => {
    setLoading(true);
    const s = selectedState === 'All States' ? '' : selectedState;
    const d = selectedDistrict === 'All Districts' ? '' : selectedDistrict;

    Promise.all([
      api.getFinancialSummary(s, d),
      api.getFinancialAnalytics(s, d),
      api.getFinancialAlerts(s, d),
      api.getFinancialProjects(s, d)
    ]).then(([summaryData, analyticsData, alertsData, projectsData]) => {
      setSummary(summaryData);
      setAnalytics(analyticsData);
      setAlerts(alertsData);
      setProjects(projectsData);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [selectedState, selectedDistrict]);

  if (loading || !summary) {
    return <div className="p-8 text-center text-slate-500">Loading Financial Intelligence Data...</div>;
  }

  // Filter projects by FY
  const displayProjects = filterProjectsByFY(projects, financialYear);
  const totalSanctioned = displayProjects.reduce((acc, p) => acc + Number(p.Sanctioned_Amount || 0), 0);
  const totalExp = displayProjects.reduce((acc, p) => acc + Number(p.Actual_Expenditure || 0), 0);
  const util = totalSanctioned > 0 ? Number(((totalExp / totalSanctioned) * 100).toFixed(1)) : 0;
  const anomaliesCount = displayProjects.filter(p => p.Status === 'Cost Overrun' || p.Status === 'Payment-Progress Mismatch' || p.Status === 'High Risk').length;

  // Pre-process Progress Gap data for Chart
  const progressGapData = displayProjects.slice(0, 15).map(p => ({
    name: p.Project_ID,
    financial: p.Financial_Progress,
    physical: p.Physical_Progress,
    gap: p.Financial_Progress - p.Physical_Progress
  })).sort((a, b) => b.gap - a.gap);

  return (
    <div className="space-y-8 pb-12">
      {/* HEADER & FILTERS */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-800">Financial Monitoring</h1>
            <span className="bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              FY {financialYear}
            </span>
          </div>
          <p className="text-slate-500 mt-1">AI-powered detection of anomalies, fraud, and inefficiencies in MPLAD Scheme implementation.</p>
        </div>
        <div className="flex gap-4 items-center bg-white border border-slate-200 p-2 rounded-lg shadow-sm">
          <Filter size={18} className="text-slate-400 ml-2" />
          <select 
            value={selectedState} 
            onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict('All Districts'); }}
            disabled={user?.role === 'state'}
            className="border-none bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer disabled:opacity-70"
          >
            {user?.role === 'state' ? (
              <option value={user.state}>{user.state}</option>
            ) : (
              <>
                <option>All States</option>
                {states.map(s => <option key={s} value={s}>{s}</option>)}
              </>
            )}
          </select>
          <div className="w-px h-6 bg-slate-200"></div>
          <select 
            value={selectedDistrict} 
            onChange={(e) => setSelectedDistrict(e.target.value)}
            className="border-none bg-transparent text-sm font-medium text-slate-700 outline-none cursor-pointer pr-4"
          >
            <option>All Districts</option>
            {districts.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      {/* KPI SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 border-l-4 border-l-blue-500">
          <p className="text-slate-500 text-sm font-medium">Total Sanctioned</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCrore(totalSanctioned)}</h3>
          <p className="text-xs text-slate-400 mt-2">{displayProjects.length} Projects Selected</p>
        </div>
        <div className="glass-panel p-5 border-l-4 border-l-orange-500">
          <p className="text-slate-500 text-sm font-medium">Actual Expenditure</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{formatCrore(totalExp)}</h3>
          <p className="text-xs text-slate-400 mt-2">Total funds released to date</p>
        </div>
        <div className="glass-panel p-5 border-l-4 border-l-emerald-500 relative overflow-hidden">
          <p className="text-slate-500 text-sm font-medium">Utilization Rate</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{util}%</h3>
          <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full ${util > 100 ? 'bg-red-500' : 'bg-emerald-500'}`} style={{width: `${Math.min(util, 100)}%`}}></div>
          </div>
          {util > 100 && (
            <AlertTriangle className="absolute top-4 right-4 text-red-500 opacity-20" size={40} />
          )}
        </div>
        <div className="glass-panel p-5 border-l-4 border-l-red-500 bg-red-50/30">
          <p className="text-red-600 text-sm font-medium flex items-center gap-2"><AlertCircle size={14}/> Financial Anomalies</p>
          <h3 className="text-2xl font-bold text-slate-800 mt-1">{anomaliesCount}</h3>
          <p className="text-xs text-red-400 mt-2">Projects requiring urgent verification</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CHART: Sanctioned vs Expenditure */}
        <div className="glass-panel p-5 lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Sanctioned vs Actual Expenditure (By Sector)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.category_performance} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(v) => `₹${(v/10000000).toFixed(0)}Cr`} />
                <RechartsTooltip formatter={(value) => [formatCrore(value), '']} cursor={{fill: '#f8fafc'}} />
                <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
                <Bar dataKey="sanctioned" name="Sanctioned Amount" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenditure" name="Actual Expenditure" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CHART: Risk Distribution */}
        <div className="glass-panel p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Financial Risk Distribution</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={analytics.risk_distribution} cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={2} dataKey="value">
                  {analytics.risk_distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" layout="vertical" verticalAlign="bottom" align="center" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* CHART: Financial vs Physical Progress */}
      <div className="glass-panel p-5">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h3 className="text-base font-semibold text-slate-800">Financial vs Physical Progress Mismatch</h3>
            <p className="text-sm text-slate-500">Flags projects where expenditure outpaces actual physical completion.</p>
          </div>
          <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1">
            <AlertTriangle size={12}/> High Risk Indicator
          </span>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={progressGapData} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
              <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(v) => `${v}%`} />
              <RechartsTooltip cursor={{fill: '#f8fafc'}} />
              <Legend iconType="circle" wrapperStyle={{paddingTop: '20px'}} />
              <Bar dataKey="financial" name="Financial Progress (%)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="physical" name="Physical Progress (%)" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* TABLE: Top Financial Risk Projects (AI ALERTS) */}
      <div className="glass-panel overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-white">
          <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2">
            <ShieldAlert className="text-red-500" /> AI Financial Alerts & Top Risk Projects
          </h3>
          <p className="text-sm text-slate-500 mt-1">The AI engine has analyzed {summary.total_projects} projects and flagged the following for immediate verification.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-5 py-4">Project Details</th>
                <th className="px-5 py-4">Sanctioned</th>
                <th className="px-5 py-4">Expenditure</th>
                <th className="px-5 py-4">Progress (Fin/Phy)</th>
                <th className="px-5 py-4">Risk Level</th>
                <th className="px-5 py-4 text-center">AI Insights</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-5 py-8 text-center text-slate-500">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                    No financial anomalies detected in this region.
                  </td>
                </tr>
              ) : (
                alerts.map((p, i) => (
                  <React.Fragment key={p.Project_ID}>
                    <tr className={`hover:bg-slate-50 transition-colors ${expandedAlert === p.Project_ID ? 'bg-slate-50' : ''}`}>
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-800">{p.Project_ID}</p>
                        <p className="text-slate-500 text-xs w-48 truncate" title={p.Project_Name}>{p.Project_Name}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">{formatCurrency(p.Sanctioned_Amount)}</td>
                      <td className="px-5 py-4 font-medium text-slate-800">
                        {formatCurrency(p.Actual_Expenditure)}
                        {p.Actual_Expenditure > p.Sanctioned_Amount && (
                          <span className="ml-2 inline-flex text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">OVERRUN</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-semibold ${p.Financial_Progress > p.Physical_Progress + 20 ? 'text-red-600' : 'text-slate-700'}`}>{p.Financial_Progress}%</span>
                          <span className="text-slate-300">/</span>
                          <span className="text-slate-500">{p.Physical_Progress}%</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${
                            p.risk.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                            p.risk.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {p.risk.risk_level}
                          </span>
                          <span className="text-xs font-medium text-slate-400">Score: {p.risk.score}/100</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <button 
                          onClick={() => setExpandedAlert(expandedAlert === p.Project_ID ? null : p.Project_ID)}
                          className="p-1.5 hover:bg-slate-200 rounded-full transition-colors text-slate-500 inline-flex items-center justify-center"
                        >
                          {expandedAlert === p.Project_ID ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                      </td>
                    </tr>
                    {expandedAlert === p.Project_ID && (
                      <tr className="bg-slate-50/50">
                        <td colSpan="6" className="px-0 py-0 border-b border-slate-200">
                          <div className="px-8 py-5 border-l-2 border-l-red-500 ml-4 my-2 rounded-r-lg bg-white shadow-sm border border-slate-100">
                            <h4 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                              <Zap size={16} className="text-accent" /> Why AI Flagged This Project
                            </h4>
                            <div className="space-y-2 mb-4">
                              {p.risk.reasons.map((reason, idx) => (
                                <p key={idx} className="text-sm text-slate-700">{reason}</p>
                              ))}
                            </div>
                            <div className="bg-red-50 p-3 rounded text-sm text-red-800 border border-red-100">
                              <strong>AI Assessment:</strong> {p.risk.assessment}
                            </div>
                            <div className="mt-3 text-xs font-medium text-slate-500 uppercase tracking-wide">
                              Recommended Action: District-level verification and physical inspection recommended before further financial action.
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
