import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell
} from 'recharts';
import { Map, AlertTriangle, ShieldAlert, BarChart3, TrendingUp, AlertOctagon, Copy, Database, UploadCloud, Play, CheckCircle, FileText, X } from 'lucide-react';

const COLORS = {
  LOW: '#10b981',
  MEDIUM: '#eab308',
  HIGH: '#f59e0b',
  CRITICAL: '#ef4444'
};

export default function StateDashboard({ user }) {
  const [stats] = useState({
    total_projects: 1248,
    sanctioned: 2864000000,
    expenditure: 2148000000,
    utilization: 75.0,
    high_risk: 42,
    delayed: 87,
    anomalies: 63,
    duplicates: 11
  });

  // Bulk Import State
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkState, setBulkState] = useState('idle');
  const [selectedFile, setSelectedFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);
  const logEndRef = useRef(null);

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
      } catch (err) {
        clearInterval(interval);
        setBulkState('done');
        setLogs(prev => [...prev, 'ERROR UPLOADING DATA: ' + err.message]);
      }
    };
    reader.readAsText(selectedFile);
  };

  const districts = [
    { name: 'Dehradun', projects: 154, utilization: 80.7, risk: 'HIGH', delay: 14, anomaly: 5 },
    { name: 'Haridwar', projects: 132, utilization: 76.2, risk: 'MEDIUM', delay: 8, anomaly: 2 },
    { name: 'Nainital', projects: 128, utilization: 82.1, risk: 'LOW', delay: 4, anomaly: 1 },
    { name: 'Almora', projects: 115, utilization: 69.4, risk: 'HIGH', delay: 18, anomaly: 7 },
    { name: 'Pauri Garhwal', projects: 140, utilization: 73.1, risk: 'MEDIUM', delay: 11, anomaly: 3 },
  ];

  const formatCurrency = (val) => `₹${(val / 10000000).toFixed(1)} Cr`;

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">State MPLADS Intelligence Dashboard</h1>
          <p className="text-slate-500">State-level monitoring and risk analysis</p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600 border border-slate-200">
            <Map size={14} className="text-primary" />
            State: Uttarakhand
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
          <button className="flex items-center gap-2 px-4 py-2 bg-critical hover:bg-red-600 text-white font-medium rounded shadow-lg shadow-critical/20 transition-colors">
            <AlertOctagon size={16} />
            Escalate Issue
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        {[
          { label: 'Total Projects', value: stats.total_projects, icon: BarChart3, color: 'text-primary', bg: 'bg-blue-50' },
          { label: 'Sanctioned', value: formatCurrency(stats.sanctioned), icon: TrendingUp, color: 'text-slate-700', bg: 'bg-slate-100' },
          { label: 'Expenditure', value: formatCurrency(stats.expenditure), icon: TrendingUp, color: 'text-slate-700', bg: 'bg-slate-100' },
          { label: 'Utilization', value: `${stats.utilization}%`, icon: TrendingUp, color: 'text-success', bg: 'bg-green-50' },
          { label: 'High-Risk', value: stats.high_risk, icon: AlertTriangle, color: 'text-warning', bg: 'bg-yellow-50' },
          { label: 'Delayed', value: stats.delayed, icon: AlertTriangle, color: 'text-warning', bg: 'bg-yellow-50' },
          { label: 'Anomalies', value: stats.anomalies, icon: ShieldAlert, color: 'text-critical', bg: 'bg-red-50' },
          { label: 'Duplicates', value: stats.duplicates, icon: Copy, color: 'text-purple-600', bg: 'bg-purple-50' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
            <div className={`p-1.5 w-fit rounded-lg ${kpi.bg}`}>
              <kpi.icon size={16} className={kpi.color} />
            </div>
            <div className="mt-3">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{kpi.label}</p>
              <p className={`text-lg font-bold mt-0.5 ${kpi.color === 'text-slate-700' ? 'text-slate-800' : kpi.color}`}>{kpi.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* District Risk Ranking */}
        <div className="lg:col-span-2 glass-panel overflow-hidden">
          <div className="p-5 border-b border-slate-100">
            <h3 className="text-base font-semibold text-slate-800">District Risk Ranking</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">District</th>
                  <th className="px-5 py-3">Projects</th>
                  <th className="px-5 py-3">Utilization</th>
                  <th className="px-5 py-3">Risk Level</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {districts.map((d, i) => (
                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-4 font-medium text-slate-800">{d.name}</td>
                    <td className="px-5 py-4 text-slate-600">{d.projects}</td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-slate-700">{d.utilization}%</span>
                        <div className="w-16 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                          <div className={`h-full ${d.utilization < 75 ? 'bg-warning' : 'bg-success'}`} style={{width: `${d.utilization}%`}}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider ${
                        d.risk === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        d.risk === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                        d.risk === 'MEDIUM' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {d.risk}
                      </span>
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button className="text-primary hover:text-primary-light font-medium text-xs">Analyze</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* State Geographic Risk */}
        <div className="glass-panel p-5 flex flex-col">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Risk Distribution</h3>
          <div className="flex-1 min-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={districts.map(d => ({ name: d.name, value: d.anomaly + d.delay }))} layout="vertical" margin={{top: 0, right: 0, left: 10, bottom: 0}}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} width={80} />
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="value" name="Risk Issues (Delays + Anomalies)" radius={[0, 4, 4, 0]}>
                  {districts.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.value > 15 ? COLORS.CRITICAL : entry.value > 10 ? COLORS.HIGH : COLORS.MEDIUM} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
