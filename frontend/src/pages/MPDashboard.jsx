import { useState, useEffect, useRef } from 'react';
import { api } from '../api';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell 
} from 'recharts';
import { FileText, CheckCircle2, Clock, AlertTriangle, Plus, ShieldCheck, MapPin, X, Database, UploadCloud, Play, CheckCircle } from 'lucide-react';
import { useFinancialYear } from '../context/FinancialYearContext';

const COLORS = {
  COMPLETED: '#10b981',
  IN_PROGRESS: '#3b82f6',
  DELAYED: '#f59e0b',
  UNDER_REVIEW: '#6366f1'
};

export default function MPDashboard({ user }) {
  const { financialYear, filterProjectsByFY, registerProjectYears } = useFinancialYear();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [highRiskProjects, setHighRiskProjects] = useState([]);

  const [showProposeModal, setShowProposeModal] = useState(false);
  const [formData, setFormData] = useState({ project_name: '', sector: 'Roads', location: '', sanctioned_amount: '', expected_completion_date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkState, setBulkState] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  const fetchStats = () => {
    setLoading(true);
    api.getProjects().then(data => {
      if (registerProjectYears) registerProjectYears(data);
      const myProjects = filterProjectsByFY(data, financialYear);
      
      let completed = 0;
      let in_progress = 0;
      let delayed = 0;
      let under_review = 0;
      let allocated = 0;
      let expenditure = 0;
      let high_risk = 0;
      
      myProjects.forEach(p => {
        if (p.status === 'Completed') completed++;
        else if (p.status === 'In Progress') in_progress++;
        else if (p.status === 'Delayed') delayed++;
        else under_review++;
        
        allocated += Number(p.sanctioned_amount || 0);
        expenditure += Number(p.actual_expenditure || 0);
        
        if (p.risk_level === 'HIGH' || p.risk_level === 'CRITICAL') {
          high_risk++;
        }
      });
      
      const utilization = allocated > 0 ? Number(((expenditure / allocated) * 100).toFixed(1)) : 0;
      const remaining = Math.max(0, allocated - expenditure);
      
      setStats({
        total_projects: myProjects.length,
        completed,
        in_progress,
        delayed,
        under_review,
        utilization,
        allocated,
        expenditure,
        remaining,
        high_risk
      });
      setLoading(false);
    }).catch(err => {
      console.warn("Backend not available, using mock stats", err);
      setLoading(false);
    });

    api.getHighRiskProjects().then(data => {
      const myHighRisk = filterProjectsByFY(data, financialYear);
      setHighRiskProjects(myHighRisk.slice(0, 3));
    }).catch(() => {
      setHighRiskProjects([]);
    });
  };

  useEffect(() => {
    fetchStats();
  }, [financialYear]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const startBulkImport = () => {
    if (!selectedFile) return;
    
    setBulkState('processing');
    setProgress(0);
    setLogs(['INITIALIZING ETL PIPELINE...', 'READING LOCAL FILE...', 'AUTH: SUCCESS']);
    
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const lines = text.split('\n').map(line => line.trim()).filter(line => line);
      if (lines.length <= 1) {
        setLogs(prev => [...prev, 'ERROR: FILE IS EMPTY OR HAS NO DATA ROWS']);
        setBulkState('done');
        return;
      }
      
      const headers = lines[0].split(',').map(h => h.trim());
      const projectsToImport = [];
      
      for (let i = 1; i < lines.length; i++) {
        const lineStr = lines[i].trim();
        if (!lineStr) continue;
        const values = lineStr.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        projectsToImport.push(row);
      }
      
      let currentProgress = 0;
      const interval = setInterval(() => {
        currentProgress += Math.floor(Math.random() * 8) + 2;
        if (currentProgress >= 90) currentProgress = 90; 
        setProgress(currentProgress);
        const randomAnomalies = Math.random() > 0.8 ? ' [WARN: ANOMALY DETECTED IN BATCH]' : '';
        setLogs(prev => [...prev, `[${currentProgress}%] PARSING BATCH_ID_${Math.floor(Math.random()*90000)+10000}... OK${randomAnomalies}`]);
      }, 400);

      try {
        await fetch('http://localhost:5000/api/projects/bulk', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(projectsToImport)
        });
        
        clearInterval(interval);
        setProgress(100);
        setBulkState('done');
        setLogs(prev => [...prev, `[100%] BULK INSERT COMPLETE.`, `${projectsToImport.length} RECORDS WRITTEN TO SECURE LEDGER.`, 'AI RISK ENGINE: RECALCULATING...']);
        
        fetchStats();
      } catch (err) {
        clearInterval(interval);
        setBulkState('done');
        setLogs(prev => [...prev, 'ERROR UPLOADING DATA: ' + err.message]);
      }
    };
    reader.readAsText(selectedFile);
  };

  const statusData = [
    { name: 'Completed', value: stats?.completed || 0, color: COLORS.COMPLETED },
    { name: 'In Progress', value: stats?.in_progress || 0, color: COLORS.IN_PROGRESS },
    { name: 'Delayed', value: stats?.delayed || 0, color: COLORS.DELAYED },
    { name: 'Under Review', value: stats?.under_review || 0, color: COLORS.UNDER_REVIEW },
  ];

  const formatCurrency = (val) => `₹${(val / 10000000).toFixed(1)} Cr`;

  if (loading || !stats) return <div className="p-8">Loading dashboard intelligence...</div>;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">MPLADS Constituency Dashboard</h1>
          <p className="text-slate-500">Monitor development works and fund utilization in your constituency</p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
            <MapPin size={14} className="text-primary" />
            Constituency: Example Constituency | State: Uttarakhand
          </div>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 font-mono text-xs tracking-wider rounded border border-cyan-500/30 transition-all shadow-[0_0_10px_rgba(0,212,255,0.1)]"
          >
            <Database size={16} />
            BULK IMPORT (CSV/API)
          </button>
          <button 
            onClick={() => setShowProposeModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-light text-white font-medium rounded shadow-lg shadow-primary/20 transition-colors"
          >
            <Plus size={16} />
            Propose New Project
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="glass-panel p-5 border-l-4 border-accent">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">My Projects</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total_projects}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><FileText className="text-accent" size={20} /></div>
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-success">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Completed</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.completed}</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="text-success" size={20} /></div>
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-warning">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Delayed</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.delayed}</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg"><Clock className="text-warning" size={20} /></div>
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-success bg-green-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 text-green-700">Utilization</p>
              <p className="text-2xl font-bold text-success mt-1">{stats.utilization}%</p>
            </div>
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle2 className="text-success" size={20} /></div>
          </div>
        </div>
        
        <div className="glass-panel p-5 border-l-4 border-critical bg-red-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 text-red-700">High-Risk Projects</p>
              <p className="text-2xl font-bold text-critical mt-1">{stats.high_risk}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="text-critical" size={20} /></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Constituency Project Status */}
        <div className="glass-panel p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Constituency Project Status</h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Fund Utilization & High Risk */}
        <div className="space-y-6">
          <div className="glass-panel p-5">
            <h3 className="text-base font-semibold text-slate-800 mb-4">Fund Utilization</h3>
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Allocated</span>
                <span className="font-bold text-slate-800">{formatCurrency(stats.allocated)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Expenditure</span>
                <span className="font-bold text-slate-800">{formatCurrency(stats.expenditure)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Remaining</span>
                <span className="font-bold text-slate-800">{formatCurrency(stats.remaining)}</span>
              </div>
              <div className="pt-2">
                <div className="flex justify-between text-xs font-medium mb-1">
                  <span className="text-slate-600">Utilization Rate</span>
                  <span className="text-success">{stats.utilization}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="bg-success h-2 rounded-full" style={{ width: `${stats.utilization}%` }}></div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-panel p-5 border border-red-100 bg-red-50/10">
            <h3 className="text-base font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <AlertTriangle size={18} className="text-critical" />
              Projects Requiring Attention
            </h3>
            <div className="space-y-3">
              {highRiskProjects.length > 0 ? highRiskProjects.map((p, i) => (
                <div key={i} className="flex justify-between items-center p-3 bg-white rounded-lg border border-slate-100 shadow-sm">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{p.name}</p>
                    <p className="text-xs text-slate-500 flex gap-3 mt-1">
                      <span className="text-critical">Risk Score: {p.risk_score}</span>
                      <span className="text-warning">Status: {p.status}</span>
                    </p>
                  </div>
                  <Link to={`/projects/${p.project_id || '1'}`} className="text-xs font-medium text-primary hover:text-primary-light px-3 py-1.5 bg-blue-50 rounded-md transition-colors">
                    View Project
                  </Link>
                </div>
              )) : (
                <div className="p-3 text-sm text-slate-500">No high risk projects detected.</div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {showProposeModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-200">
            <div className="flex justify-between items-center p-5 border-b border-slate-100 bg-slate-50">
              <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <FileText className="text-primary" size={20} />
                Propose New Project
              </h2>
              <button onClick={() => setShowProposeModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsSubmitting(true);
              try {
                await fetch('http://localhost:5000/api/projects', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(formData)
                });
                fetchStats();
                setTimeout(() => {
                  setIsSubmitting(false);
                  setShowProposeModal(false);
                  setFormData({ project_name: '', sector: 'Roads', location: '', sanctioned_amount: '', expected_completion_date: '' });
                }, 500);
              } catch (err) {
                console.error(err);
                setIsSubmitting(false);
              }
            }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Project Title</label>
                <input required type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="e.g. Construction of Primary School" value={formData.project_name} onChange={e => setFormData({...formData, project_name: e.target.value})} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sector</label>
                  <select className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={formData.sector} onChange={e => setFormData({...formData, sector: e.target.value})}>
                    <option>Roads</option>
                    <option>Education</option>
                    <option>Water Supply</option>
                    <option>Healthcare</option>
                    <option>Sanitation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">District / Location</label>
                  <input required type="text" className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="e.g. Dehradun" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Sanctioned Amount (₹)</label>
                  <input required type="number" min="0" className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" placeholder="5000000" value={formData.sanctioned_amount} onChange={e => setFormData({...formData, sanctioned_amount: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Expected Completion</label>
                  <input required type="date" className="w-full border border-slate-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all" value={formData.expected_completion_date} onChange={e => setFormData({...formData, expected_completion_date: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <button type="button" onClick={() => setShowProposeModal(false)} className="px-5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="px-5 py-2 bg-primary hover:bg-primary-light text-white rounded-lg font-medium shadow-md shadow-primary/20 transition-all flex items-center gap-2">
                  {isSubmitting ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span> : 'Submit Proposal'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Cyber Bulk Import Simulation Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#020b14] rounded border border-cyan-500/30 shadow-[0_0_50px_rgba(0,212,255,0.15)] w-full max-w-2xl overflow-hidden font-mono text-cyan-400">
            
            <div className="flex justify-between items-center p-4 border-b border-cyan-500/20 bg-cyan-900/10">
              <h2 className="text-sm font-bold tracking-[0.2em] flex items-center gap-3">
                <Database size={18} />
                SECURE DATA INGESTION PROTOCOL
              </h2>
              <button onClick={() => {setShowBulkModal(false); setBulkState('idle'); setLogs([]);}} className="text-cyan-500/50 hover:text-cyan-400 transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6">
              {bulkState === 'idle' && (
                <div className="text-center py-10 space-y-6">
                  <UploadCloud size={64} className="mx-auto text-cyan-500/50" />
                  <div>
                    <p className="text-sm tracking-widest text-cyan-200">UPLOAD LEGACY DATASET (CSV) OR TRIGGER API SYNC</p>
                    <p className="text-xs text-cyan-500/60 mt-2">Maximum batch size: 50,000 records</p>
                  </div>
                  <div className="flex justify-center mt-4 mb-8">
                    <label className="flex items-center gap-2 cursor-pointer bg-[#020b14] border border-cyan-500/30 px-6 py-3 hover:bg-cyan-900/20 transition-all rounded">
                      <FileText size={18} className="text-cyan-400" />
                      <span className="text-cyan-200 tracking-wider text-xs font-bold uppercase">
                        {selectedFile ? selectedFile.name : 'SELECT .CSV OR .XLSX FILE'}
                      </span>
                      <input 
                        type="file" 
                        accept=".csv, .xlsx" 
                        className="hidden" 
                        onChange={(e) => setSelectedFile(e.target.files[0])}
                      />
                    </label>
                  </div>
                  <button 
                    onClick={startBulkImport}
                    disabled={!selectedFile}
                    className={`flex items-center gap-2 px-8 py-3 rounded tracking-[0.2em] text-sm transition-all mx-auto uppercase ${
                      selectedFile 
                        ? 'bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-500/50 shadow-[0_0_15px_rgba(0,212,255,0.2)] cursor-pointer' 
                        : 'bg-slate-900 text-slate-500 border border-slate-700 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Play size={16} /> Execute ETL Pipeline
                  </button>
                </div>
              )}

              {(bulkState === 'processing' || bulkState === 'done') && (
                <div className="space-y-6">
                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs tracking-widest mb-2 text-cyan-300">
                      <span>SYNC PROGRESS</span>
                      <span>{progress}%</span>
                    </div>
                    <div className="w-full bg-slate-800 rounded-full h-2 border border-cyan-500/20 overflow-hidden">
                      <div className="bg-cyan-500 h-full transition-all duration-300 ease-out relative" style={{ width: `${progress}%` }}>
                        <div className="absolute top-0 right-0 bottom-0 w-20 bg-gradient-to-r from-transparent to-white/50 animate-pulse"></div>
                      </div>
                    </div>
                  </div>

                  {/* Terminal Log Output */}
                  <div className="bg-black/50 border border-cyan-900 rounded p-4 h-64 overflow-y-auto text-[10px] leading-loose">
                    {logs.map((log, i) => (
                      <div key={i} className={`font-mono ${log.includes('WARN') ? 'text-amber-400' : (log.includes('COMPLETE') ? 'text-green-400' : 'text-cyan-500/80')}`}>
                        <span className="text-cyan-700 mr-2">[{new Date().toISOString().split('T')[1].split('.')[0]}]</span> 
                        {log}
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>

                  {bulkState === 'done' && (
                    <div className="flex justify-center pt-4">
                      <button 
                        onClick={() => {setShowBulkModal(false); setBulkState('idle'); setLogs([]);}}
                        className="flex items-center gap-2 px-6 py-2 bg-green-900/30 text-green-400 border border-green-500/50 rounded tracking-widest text-xs hover:bg-green-900/50 transition-colors uppercase"
                      >
                        <CheckCircle size={16} /> CLOSE INGESTION TERMINAL
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
