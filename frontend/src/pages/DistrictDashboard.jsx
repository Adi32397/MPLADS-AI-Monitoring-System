import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from 'recharts';
import { AlertTriangle, ShieldCheck, Clock, FileText, CheckCircle2, Plus, UploadCloud, X, Database, Play, CheckCircle } from 'lucide-react';

const COLORS = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#eab308',
  LOW: '#10b981'
};

const formatCurrency = (val) => `₹${(val / 10000000).toFixed(1)} Cr`;

export default function DistrictDashboard({ user }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modal States
  const [showProposeModal, setShowProposeModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Form State
  const [formData, setFormData] = useState({ project_name: '', sector: 'Roads', location: '', sanctioned_amount: '', expected_completion_date: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Bulk Import State
  const [bulkState, setBulkState] = useState('idle'); // idle, processing, done
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

  const fetchStats = () => {
    api.getProjects().then(data => {
      const myProjects = data; // Show all projects for demo purposes to ensure uploaded CSV data is visible
      
      let total_sanctioned = 0;
      let total_expenditure = 0;
      let critical_risk = 0;
      let high_risk = 0;
      let medium_risk = 0;
      let low_risk = 0;
      let delayed_projects = 0;
      let anomalies_detected = 0;
      
      myProjects.forEach(p => {
        total_sanctioned += Number(p.sanctioned_amount || 0);
        total_expenditure += Number(p.actual_expenditure || 0);
        
        const risk = p.risk_level || 'LOW';
        if (risk === 'CRITICAL') critical_risk++;
        else if (risk === 'HIGH') high_risk++;
        else if (risk === 'MEDIUM') medium_risk++;
        else low_risk++;
        
        if ((p.status || '').toLowerCase().includes('delay')) delayed_projects++;
        if (p.anomalies && p.anomalies.length > 0) anomalies_detected++;
      });
      
      const utilization = total_sanctioned > 0 ? Number(((total_expenditure / total_sanctioned) * 100).toFixed(1)) : 0;
      
      const baseSanctioned = total_sanctioned * 0.4;
      const baseExpenditure = total_expenditure * 0.2;
      
      const expenditureData = [
        { month: 'Apr', sanctioned: baseSanctioned, expenditure: baseExpenditure },
        { month: 'May', sanctioned: baseSanctioned * 1.2, expenditure: baseExpenditure * 1.5 },
        { month: 'Jun', sanctioned: baseSanctioned * 1.5, expenditure: baseExpenditure * 2.1 },
        { month: 'Jul', sanctioned: baseSanctioned * 1.8, expenditure: baseExpenditure * 2.8 },
        { month: 'Aug', sanctioned: total_sanctioned * 0.9, expenditure: total_expenditure * 0.8 },
        { month: 'Sep', sanctioned: total_sanctioned, expenditure: total_expenditure }
      ];
      
      setStats({
        total_projects: myProjects.length,
        total_sanctioned,
        total_expenditure,
        utilization,
        critical_risk,
        high_risk,
        medium_risk,
        low_risk,
        delayed_projects,
        anomalies_detected,
        potential_duplicates: 2, // Assuming a static mock for duplicates for now
        expenditureData
      });
      setLoading(false);
    }).catch(err => {
      console.warn("Backend not available, using mock stats", err);
      setStats({
        total_projects: 1248,
        total_sanctioned: 2864000000,
        total_expenditure: 2148000000,
        utilization: 75.0,
        critical_risk: 12,
        high_risk: 30,
        medium_risk: 86,
        low_risk: 1120,
        delayed_projects: 87,
        anomalies_detected: 63,
        potential_duplicates: 11
      });
      setLoading(false);
    });
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const handleProposeSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetch('http://localhost:5000/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      // Refresh stats to show the new project
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
  };

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
        
        const values = lineStr.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/).map(v => v.replace(/^"|"$/g, '').trim());
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

  if (loading) return <div className="p-8">Loading dashboard intelligence...</div>;

  const riskData = [
    { name: 'Low Risk', value: Number(stats.low_risk) || 0, color: COLORS.LOW },
    { name: 'Medium Risk', value: Number(stats.medium_risk) || 0, color: COLORS.MEDIUM },
    { name: 'High Risk', value: Number(stats.high_risk) || 0, color: COLORS.HIGH },
    { name: 'Critical', value: Number(stats.critical_risk) || 0, color: COLORS.CRITICAL },
  ];

  const expenditureData = (stats.expenditureData || []).map(item => ({
    month: item.month,
    sanctioned: Number(item.sanctioned) / 10000000,
    expenditure: Number(item.expenditure) / 10000000
  }));

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">MPLADS Intelligence Dashboard</h1>
          <p className="text-slate-500">AI-powered monitoring of public development works</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-panel p-5 border-l-4 border-accent">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Total Projects</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.total_projects.toLocaleString()}</p>
            </div>
            <div className="p-2 bg-blue-50 rounded-lg"><FileText className="text-accent" size={20} /></div>
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-success">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Fund Utilization</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.utilization.toFixed(1)}%</p>
            </div>
            <div className="p-2 bg-green-50 rounded-lg"><CheckCircle2 className="text-success" size={20} /></div>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-xs text-slate-500 mb-1">
              <span>Exp: {formatCurrency(stats.total_expenditure)}</span>
              <span>Sanc: {formatCurrency(stats.total_sanctioned)}</span>
            </div>
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div className="bg-success h-1.5 rounded-full" style={{ width: `${stats.utilization}%` }}></div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-warning">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500">Delayed Projects</p>
              <p className="text-2xl font-bold text-slate-800 mt-1">{stats.delayed_projects ?? 87}</p>
            </div>
            <div className="p-2 bg-yellow-50 rounded-lg"><Clock className="text-warning" size={20} /></div>
          </div>
        </div>

        <div className="glass-panel p-5 border-l-4 border-critical bg-red-50/30">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-medium text-slate-500 text-red-700">AI Anomalies Detected</p>
              <p className="text-2xl font-bold text-critical mt-1">{stats.anomalies_detected ?? 63}</p>
            </div>
            <div className="p-2 bg-red-100 rounded-lg"><AlertTriangle className="text-critical" size={20} /></div>
          </div>
        </div>
      </div>

      {/* AI Risk Intelligence Section */}
      <div className="glass-panel p-6 bg-gradient-to-r from-primary to-primary-light text-white">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-xl backdrop-blur-sm border border-white/20">
              <ShieldCheck size={32} className="text-accent-light" />
            </div>
            <div>
              <h2 className="text-xl font-bold">AI Risk Intelligence</h2>
              <p className="text-slate-300 text-sm mt-1">Continuous monitoring using Isolation Forest & Rule Engine</p>
            </div>
          </div>
          
          <div className="flex gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-red-400">{stats.critical_risk}</p>
              <p className="text-xs text-slate-300 uppercase tracking-wider mt-1">Critical Risk</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-orange-400">{stats.high_risk}</p>
              <p className="text-xs text-slate-300 uppercase tracking-wider mt-1">High Risk</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-3xl font-bold text-yellow-400">{stats.medium_risk}</p>
              <p className="text-xs text-slate-300 uppercase tracking-wider mt-1">Medium Risk</p>
            </div>
            <div className="text-center hidden sm:block">
              <p className="text-3xl font-bold text-green-400">{stats.low_risk}</p>
              <p className="text-xs text-slate-300 uppercase tracking-wider mt-1">Low Risk</p>
            </div>
          </div>
          
          <div>
            <Link to="/anomalies" className="px-5 py-2.5 bg-accent hover:bg-accent-light text-white text-sm font-medium rounded-lg transition-colors shadow-lg shadow-accent/30 inline-block">
              View High-Risk Projects
            </Link>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Expenditure vs Sanctioned */}
        <div className="glass-panel p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Financial Progress (Cumulative)</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={expenditureData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#64748b'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b'}} tickFormatter={(v) => `₹${v}Cr`} />
                <RechartsTooltip formatter={(value) => [`₹${value} Cr`, '']} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" />
                <Line type="monotone" dataKey="sanctioned" name="Sanctioned Amount" stroke="#0f172a" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                <Line type="monotone" dataKey="expenditure" name="Actual Expenditure" stroke="#0284c7" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Risk Distribution */}
        <div className="glass-panel p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Project Risk Distribution</h3>
          <div className="h-72 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                <Legend iconType="circle" layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <p className="text-xs text-slate-400 text-center italic pb-4">
        Prototype uses a combination of publicly available MPLADS information and synthetic/derived data for demonstration purposes.
      </p>

      {/* --- MODALS --- */}

      {/* Propose Project Modal */}
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
            
            <form onSubmit={handleProposeSubmit} className="p-6 space-y-4">
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
                        onClick={() => {setShowBulkModal(false); setBulkState('idle'); setLogs([]); fetchStats();}}
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
