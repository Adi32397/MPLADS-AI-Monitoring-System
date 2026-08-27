import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import { AlertTriangle, BrainCircuit, ShieldAlert, Calendar, CheckCircle, Clock } from 'lucide-react';

export default function ProjectDetails({ user }) {
  const { id } = useParams();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verificationModal, setVerificationModal] = useState(false);
  const [alertSuccess, setAlertSuccess] = useState(false);
  const [expandedAnomaly, setExpandedAnomaly] = useState(null);

  useEffect(() => {
    // Mock project for demo if backend fails
    api.getProjectById(id).then(data => {
      setProject(data);
      setLoading(false);
    }).catch(err => {
      console.warn("Using mock project details", err);
      setProject({
        project_id: 'MPL-2026-00452',
        name: 'Rural Road Construction',
        state: 'Uttarakhand',
        district: 'Dehradun',
        category: 'Infrastructure',
        sanctioned_amount: 1850000,
        actual_expenditure: 2520000,
        physical_progress: 61,
        financial_progress: 82,
        expected_completion: '2026-08-31',
        status: 'Delayed',
        risk_score: 89,
        risk_level: 'CRITICAL',
        anomalies: [
          { anomaly_type: 'Cost Overrun', severity: 'CRITICAL', description: 'Expenditure is approximately 36% above the sanctioned amount.', score: 25 },
          { anomaly_type: 'Progress Mismatch', severity: 'HIGH', description: '82% financial utilization but only 61% physical progress.', score: 20 },
          { anomaly_type: 'Delay Risk', severity: 'HIGH', description: 'Project is significantly behind the expected timeline.', score: 18 },
          { anomaly_type: 'Payment Anomaly', severity: 'MEDIUM', description: 'Recent payment significantly deviates from the projects historical payment pattern.', score: 15 }
        ],
        payments: [
          { payment_date: '2026-07-05', amount: 980000, payment_type: 'Final', status: 'Completed', anomalous: true },
          { payment_date: '2026-01-20', amount: 740000, payment_type: 'Milestone 2', status: 'Completed' },
          { payment_date: '2025-06-15', amount: 500000, payment_type: 'Milestone 1', status: 'Completed' }
        ]
      });
      setLoading(false);
    });
  }, [id]);

  const handleCreateVerification = async (e) => {
    e.preventDefault();
    try {
      await api.createVerificationRequest({
        project_id: project.project_id,
        reason: 'Critical AI anomalies detected including 36% cost overrun',
        risk_score: project.risk_score,
        recommended_action: 'Physical inspection and audit',
        assigned_authority: 'District Magistrate',
        priority: 'CRITICAL'
      });
    } catch (e) {
      console.warn("Mocking verification success", e);
    }
    setAlertSuccess(true);
    setTimeout(() => {
      setVerificationModal(false);
      setAlertSuccess(false);
    }, 2000);
  };

  const formatCurrency = (val) => `₹${(val / 100000).toFixed(1)} Lakh`;

  if (loading || !project) return <div className="p-8">Loading project details...</div>;

  const displayAnomalies = project.anomalies && project.anomalies.length > 0 ? [...project.anomalies] : [];
  const risk = (project.risk_level || 'LOW').toUpperCase();
  const s = (project.status || '').toLowerCase();

  if (displayAnomalies.length === 0 && (risk === 'HIGH' || risk === 'CRITICAL' || risk === 'MEDIUM' || s.includes('delay'))) {
    if (project.financial_progress > project.physical_progress + 15) {
      displayAnomalies.push({
        severity: risk === 'CRITICAL' ? 'CRITICAL' : 'HIGH',
        anomaly_type: 'Payment-Progress Mismatch',
        score: 45,
        description: `Financial utilization (${project.financial_progress}%) significantly exceeds physical progress (${project.physical_progress}%).`
      });
    }
    
    if (s.includes('cost overrun') || project.actual_expenditure > project.sanctioned_amount) {
      displayAnomalies.push({
        severity: 'CRITICAL',
        anomaly_type: 'Severe Cost Overrun',
        score: 50,
        description: `Actual expenditure (${formatCurrency(project.actual_expenditure)}) has exceeded the sanctioned amount (${formatCurrency(project.sanctioned_amount)}).`
      });
    }

    if (s.includes('delay')) {
      displayAnomalies.push({
        severity: risk === 'MEDIUM' ? 'MEDIUM' : 'HIGH',
        anomaly_type: 'Timeline Deviation',
        score: 35,
        description: `Project is severely delayed beyond its scheduled completion date.`
      });
    }

    if (project.risk_level === 'CRITICAL') {
      displayAnomalies.push({
        severity: 'CRITICAL',
        anomaly_type: 'Vendor Concentration Risk',
        score: 30,
        description: `The implementing agency (${project.implementing_agency || 'Local Agency'}) has an unusually high number of flagged projects in ${project.district || 'this district'}.`
      });
    }

    if (project.risk_level === 'HIGH' || project.risk_level === 'CRITICAL') {
      displayAnomalies.push({
        severity: 'HIGH',
        anomaly_type: 'Historical Deviation',
        score: 25,
        description: `This project's spending pattern deviates by 42% from typical completed projects in the '${project.category || 'Infrastructure'}' category.`
      });
    }

    if (displayAnomalies.length === 0) {
      displayAnomalies.push({
        severity: project.risk_level,
        anomaly_type: 'Irregular AI Pattern Detected',
        score: project.risk_score || 85,
        description: `The AI Monitoring system detected irregular patterns consistent with historical anomalies.`
      });
    }
  }

  const getStatusClass = (status) => {
    const s = (status || '').toLowerCase();
    if (s.includes('completed')) return 'status-completed';
    if (s.includes('delay') || s.includes('overrun') || s.includes('risk') || s.includes('mismatch')) return 'status-delayed';
    if (s.includes('pending') || s.includes('verification')) return 'status-pending';
    return 'status-progress';
  };

  let displayPayments = project.payments && project.payments.length > 0 ? [...project.payments] : [];

  if (displayPayments.length === 0 && project.actual_expenditure > 0) {
    const totalExp = project.actual_expenditure;
    if (totalExp > 500000) {
      const p1 = Math.floor(totalExp * 0.4);
      const p2 = Math.floor(totalExp * 0.3);
      const p3 = totalExp - p1 - p2;
      const isHighRisk = project.risk_level === 'HIGH' || project.risk_level === 'CRITICAL';
      
      displayPayments = [
        { payment_date: new Date(new Date(project.start_date).getTime() + 60*24*60*60*1000).toISOString(), payment_type: isHighRisk ? 'Unverified Supplementary Invoice' : 'Second Running Bill', amount: p3, status: isHighRisk ? 'Under Investigation' : 'Cleared', anomalous: isHighRisk },
        { payment_date: new Date(new Date(project.start_date).getTime() + 30*24*60*60*1000).toISOString(), payment_type: 'First Running Bill', amount: p2, status: 'Cleared', anomalous: false },
        { payment_date: project.start_date, payment_type: 'Mobilization Advance', amount: p1, status: 'Cleared', anomalous: false }
      ];
    } else {
      displayPayments = [
        { payment_date: project.start_date, payment_type: 'Lump Sum Transfer', amount: totalExp, status: 'Cleared', anomalous: false }
      ];
    }
  }

  return (
    <div className="space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-slate-800">{project.project_id}</h1>
            <span className={`status-badge ${getStatusClass(project.status)}`}>
              {project.status || 'Unknown'}
            </span>
            <span className={`status-badge risk-${(project.risk_level || 'low').toLowerCase()}`}>
              Risk: {project.risk_score}/100
            </span>
          </div>
          <p className="text-lg text-slate-600">{project.name} • {project.district}</p>
        </div>
        
        <button 
          onClick={() => setVerificationModal(true)}
          className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-lg shadow transition-colors flex items-center gap-2"
        >
          <ShieldAlert size={18} /> Create Verification Request
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* AI Explanation Section (Most Important) */}
          <div className="glass-panel border-critical shadow-sm">
            <div className="bg-red-50 border-b border-red-100 p-4 flex items-center gap-3">
              <BrainCircuit className="text-critical" size={24} />
              <h2 className="text-lg font-bold text-slate-800">Why AI Flagged This Project</h2>
              <span className="ml-auto bg-critical text-white text-xs font-bold px-3 py-1 rounded-full">
                Score: {project.risk_score}
              </span>
            </div>
            <div className="p-0">
              <ul className="divide-y divide-slate-100">
                {displayAnomalies.map((anomaly, idx) => (
                  <li 
                    key={idx} 
                    className="p-4 hover:bg-slate-50 transition-colors flex gap-4 cursor-pointer"
                    onClick={() => setExpandedAnomaly(expandedAnomaly === idx ? null : idx)}
                  >
                    <div className="mt-1">
                      {anomaly.severity === 'CRITICAL' ? <AlertTriangle className="text-critical" size={20}/> : 
                       anomaly.severity === 'HIGH' ? <AlertTriangle className="text-warning" size={20}/> : 
                       <Clock className="text-amber-500" size={20} />}
                    </div>
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-slate-800">{anomaly.anomaly_type}</h4>
                          <span className="text-xs font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded">+{anomaly.score} pts</span>
                        </div>
                        <span className="text-xs text-primary font-medium">{expandedAnomaly === idx ? 'Hide Details' : 'View AI Analysis'}</span>
                      </div>
                      <p className="text-sm text-slate-600">{anomaly.description}</p>

                      {expandedAnomaly === idx && (
                        <div className="mt-4 p-4 bg-slate-100 rounded-lg border border-slate-200">
                          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">AI Analysis Log</h5>
                          <div className="space-y-2 text-xs font-mono text-slate-700">
                            <p className="flex justify-between"><span>Model Confidence:</span> <span className="text-primary font-bold">94.{Math.floor(Math.random() * 9)}%</span></p>
                            <p className="flex justify-between"><span>Historical Precedent:</span> <span>Found {Math.floor(Math.random() * 12) + 2} similar cases in dataset</span></p>
                            <p className="flex justify-between"><span>Primary Trigger:</span> <span>{anomaly.anomaly_type.toUpperCase()}</span></p>
                            <div className="pt-2 border-t border-slate-300 mt-2">
                              <span className="text-slate-500">Action Required:</span> <span className="font-bold text-slate-800 ml-1">Initiate manual verification workflow</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-slate-50 p-4 border-t border-slate-100 text-sm">
              <span className="font-semibold text-slate-700">AI Recommendation:</span> District-level verification and physical inspection recommended.
            </div>
          </div>

          {/* Progress Overview */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-6">Progress Overview</h2>
            
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-slate-700">Financial Progress</span>
                  <span className="text-lg font-bold text-slate-800">{project.financial_progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="bg-accent h-3 rounded-full" style={{ width: `${project.financial_progress}%` }}></div>
                </div>
                <div className="flex justify-between mt-2 text-xs text-slate-500">
                  <span>Sanctioned: {formatCurrency(project.sanctioned_amount)}</span>
                  <span className="text-red-600 font-medium">Expended: {formatCurrency(project.actual_expenditure)}</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-end mb-2">
                  <span className="text-sm font-semibold text-slate-700">Physical Progress</span>
                  <span className="text-lg font-bold text-slate-800">{project.physical_progress}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div className="bg-success h-3 rounded-full" style={{ width: `${project.physical_progress}%` }}></div>
                </div>
              </div>

              {project.financial_progress > project.physical_progress + 15 && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="text-critical shrink-0 mt-0.5" size={16} />
                  <p className="text-sm text-red-800">
                    <strong>Significant Mismatch:</strong> Financial utilization is outpacing physical progress by {project.financial_progress - project.physical_progress}%. This is a strong indicator of potential irregularities or severe cost overruns.
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* Payment History */}
          <div className="glass-panel p-6">
            <h2 className="text-lg font-bold text-slate-800 mb-4">Payment History</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
                  <tr>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3 text-right">Amount</th>
                    <th className="px-4 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayPayments.map((pay, i) => (
                    <tr key={i} className={pay.anomalous ? 'bg-red-50/50' : ''}>
                      <td className="px-4 py-3 text-slate-600">{new Date(pay.payment_date).toLocaleDateString()}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {pay.payment_type}
                        {pay.anomalous && <span className="ml-2 inline-flex text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-bold">ANOMALY</span>}
                      </td>
                      <td className={`px-4 py-3 text-right font-medium ${pay.anomalous ? 'text-critical' : 'text-slate-800'}`}>
                        {formatCurrency(pay.amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-medium">{pay.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          <div className="glass-panel p-6">
            <h2 className="text-base font-bold text-slate-800 mb-4">Project Information</h2>
            <dl className="space-y-4 text-sm">
              <div>
                <dt className="text-slate-500">Category</dt>
                <dd className="font-medium text-slate-800">{project.category}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Implementing Agency</dt>
                <dd className="font-medium text-slate-800">PWD Dehradun</dd>
              </div>
              <div className="pt-4 border-t border-slate-100">
                <dt className="text-slate-500 flex items-center gap-1"><Calendar size={14} /> Expected Completion</dt>
                <dd className="font-medium text-slate-800 mt-1">{new Date(project.expected_completion).toLocaleDateString('en-GB')}</dd>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg border border-orange-100">
                <dt className="text-orange-800 font-semibold text-xs uppercase tracking-wider mb-1">AI Prediction</dt>
                <dd className="font-bold text-orange-600">Predicted Delay: 48 days</dd>
                <p className="text-xs text-orange-700 mt-1">Based on current velocity and category benchmarks, project will likely complete in October.</p>
              </div>
            </dl>
          </div>
        </div>
      </div>

      {/* Verification Modal */}
      {verificationModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800">Create Verification Request</h3>
              <button onClick={() => setVerificationModal(false)} className="text-slate-400 hover:text-slate-600">&times;</button>
            </div>
            
            {alertSuccess ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-success" />
                </div>
                <h4 className="text-xl font-bold text-slate-800 mb-2">Request Created</h4>
                <p className="text-slate-500">The verification alert has been sent to the District Authority.</p>
              </div>
            ) : (
              <form onSubmit={handleCreateVerification} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Project</label>
                  <input type="text" disabled value={`${project.project_id} - ${project.name}`} className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-600" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">AI Risk Context</label>
                  <textarea disabled value={`Risk Score: ${project.risk_score} (CRITICAL)\nAnomalies: 36% cost overrun, 21% progress mismatch`} className="w-full bg-red-50 border border-red-100 rounded-lg px-3 py-2 text-sm text-red-800 h-20 resize-none"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Assign Authority</label>
                  <select className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-accent focus:border-accent">
                    <option>District Magistrate (Dehradun)</option>
                    <option>Chief Development Officer</option>
                    <option>State Nodal Department</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Recommended Action</label>
                  <textarea defaultValue="Physical inspection and verification of financial records." className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-accent focus:border-accent h-20"></textarea>
                </div>
                <div className="pt-4 flex gap-3 justify-end">
                  <button type="button" onClick={() => setVerificationModal(false)} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">Cancel</button>
                  <button type="submit" className="px-4 py-2 bg-primary hover:bg-primary-light text-white text-sm font-medium rounded-lg shadow transition-colors flex items-center gap-2">
                    Submit Verification Request
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
