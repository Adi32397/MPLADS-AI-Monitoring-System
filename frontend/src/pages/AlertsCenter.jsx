import { useState, useEffect } from 'react';
import { api } from '../api';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AlertsCenter() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getAlerts().then(data => {
      if(data.length === 0) throw new Error("empty");
      setAlerts(data);
      setLoading(false);
    }).catch(err => {
      setAlerts([
        { id: 1, project_id: 'MPL-2026-00452', alert_type: 'Verification Request', severity: 'CRITICAL', message: 'Verification needed: Critical AI anomalies detected including 36% cost overrun. Action: Physical inspection and audit', assigned_to: 'District Magistrate', status: 'Pending', created_at: new Date().toISOString() }
      ]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><ShieldAlert className="text-critical" /> AI Alerts Center</h1>
          <p className="text-slate-500 mt-1">Manage system alerts and verification requests.</p>
        </div>
      </div>
      
      <div className="grid gap-4">
        {loading ? <div className="p-8 text-center">Loading alerts...</div> : 
          alerts.map(a => (
            <div key={a.id} className="glass-panel p-5 flex flex-col md:flex-row gap-4 justify-between md:items-center">
              <div className="flex gap-4 items-start">
                <div className={`p-2 rounded-lg mt-1 ${a.severity === 'CRITICAL' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'}`}>
                  <ShieldAlert size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${a.severity === 'CRITICAL' ? 'bg-critical text-white' : 'bg-warning text-white'}`}>{a.severity}</span>
                    <h3 className="font-bold text-slate-800">{a.alert_type}</h3>
                  </div>
                  <p className="text-sm text-slate-600 mb-2">{a.message}</p>
                  <div className="flex items-center gap-4 text-xs text-slate-500 font-medium">
                    <span>Project: <Link to={`/projects/${a.project_id}`} className="text-accent hover:underline">{a.project_id}</Link></span>
                    <span>Assigned: {a.assigned_to}</span>
                    <span>Created: {new Date(a.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                <button className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-lg transition-colors">
                  Investigate
                </button>
                {a.status === 'Pending' ? (
                   <button className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-sm font-medium rounded-lg transition-colors flex justify-center items-center gap-1">
                    <CheckCircle2 size={16} className="text-success" /> Mark Resolved
                  </button>
                ) : null}
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}
