import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { ShieldAlert, Filter, AlertTriangle, FileText, CheckCircle2, ChevronRight, CheckSquare, Clock, Map, Activity, Zap, Search, UserCheck, X, Camera, Paperclip } from 'lucide-react';

const formatCurrency = (val) => `₹${(val / 100000).toFixed(1)} Lakh`;

// Mock Officers generated for Prototype
const MOCK_OFFICERS = [
  "Rajesh Kumar — District Nodal Officer — MPLADS Monitoring Team",
  "Priya Sharma — District Project Officer — District Administration",
  "Amit Verma — Executive Engineer — PWD Verification Team",
  "Neha Singh — Finance Officer — District Finance & Audit Team"
];

export default function VerificationQueue({ user }) {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState([]);
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectDetails, setProjectDetails] = useState(null);
  
  // Filters
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [selectedState, setSelectedState] = useState('All States');
  const [selectedDistrict, setSelectedDistrict] = useState('All Districts');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [searchTerm, setSearchTerm] = useState('');

  const fetchQueue = () => {
    setLoading(true);
    const s = selectedState === 'All States' ? '' : selectedState;
    const d = selectedDistrict === 'All Districts' ? '' : selectedDistrict;
    
    api.getVerificationQueue(s, d).then(data => {
      setQueue(data);
      setStates([...new Set(data.map(p => p.State))].filter(Boolean).sort());
      setDistricts([...new Set(data.map(p => p.District))].filter(Boolean).sort());
      setLoading(false);
    }).catch(console.error);
  };

  useEffect(() => {
    fetchQueue();
  }, [selectedState, selectedDistrict]);

  const handleViewDetails = (projectId) => {
    setSelectedProject(projectId);
    api.getVerificationProject(projectId).then(data => {
      setProjectDetails(data);
    });
  };

  const closeDetails = () => {
    setSelectedProject(null);
    setProjectDetails(null);
    fetchQueue(); // Refresh queue to reflect any saved changes
  };

  // Filter queue purely on frontend for search/status
  const filteredQueue = queue.filter(p => {
    const matchesSearch = p.Project_ID.toLowerCase().includes(searchTerm.toLowerCase()) || p.Project_Name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || p.workflow.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Metrics
  const criticalCount = queue.filter(p => p.risk.risk_level === 'CRITICAL').length;
  const highCount = queue.filter(p => p.risk.risk_level === 'HIGH').length;
  const pendingCount = queue.filter(p => p.workflow.status === 'Pending Verification').length;
  const verifiedCount = queue.filter(p => p.workflow.status === 'Closed' || p.workflow.status === 'Verified - No Issue').length;

  if (loading && queue.length === 0) {
    return <div className="p-8 text-center text-slate-500">Loading Verification Queue...</div>;
  }

  return (
    <div className="space-y-6 pb-12 relative">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <CheckSquare className="text-primary" /> Verification Queue
          </h1>
          <p className="text-slate-500 mt-1">Review AI-flagged projects, assign verification officers, and track field inspections.</p>
        </div>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center justify-between">
          <div><p className="text-red-800 text-sm font-semibold">Critical Risk</p><h3 className="text-2xl font-bold text-red-900 mt-1">{criticalCount}</h3></div>
          <AlertTriangle className="text-red-300" size={32} />
        </div>
        <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center justify-between">
          <div><p className="text-orange-800 text-sm font-semibold">High Risk</p><h3 className="text-2xl font-bold text-orange-900 mt-1">{highCount}</h3></div>
          <ShieldAlert className="text-orange-300" size={32} />
        </div>
        <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center justify-between">
          <div><p className="text-blue-800 text-sm font-semibold">Pending Verification</p><h3 className="text-2xl font-bold text-blue-900 mt-1">{pendingCount}</h3></div>
          <Clock className="text-blue-300" size={32} />
        </div>
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center justify-between">
          <div><p className="text-emerald-800 text-sm font-semibold">Verified / Closed</p><h3 className="text-2xl font-bold text-emerald-900 mt-1">{verifiedCount}</h3></div>
          <CheckCircle2 className="text-emerald-300" size={32} />
        </div>
      </div>

      {/* FILTERS */}
      <div className="glass-panel p-4 flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input 
            type="text" 
            placeholder="Search by ID or Name..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-300 rounded-lg text-sm outline-none focus:border-primary"
          />
        </div>
        <select value={selectedState} onChange={(e) => { setSelectedState(e.target.value); setSelectedDistrict('All Districts'); }} className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
          <option>All States</option>
          {states.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={selectedDistrict} onChange={(e) => setSelectedDistrict(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
          <option>All Districts</option>
          {districts.map(d => <option key={d} value={d}>{d}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="border border-slate-300 rounded-lg px-3 py-2 text-sm outline-none">
          <option>All Statuses</option>
          <option>Pending Verification</option>
          <option>Assigned</option>
          <option>Under Verification</option>
          <option>Escalated</option>
          <option>Closed</option>
        </select>
      </div>

      {/* AI VERIFICATION INSIGHTS */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-xl border border-indigo-100 flex gap-4 items-center shadow-sm">
        <div className="p-3 bg-white rounded-full shadow-sm text-indigo-600 shrink-0"><Zap size={20} /></div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900">AI Verification Insights</h4>
          <p className="text-sm text-indigo-700 mt-1">
            <strong>{pendingCount}</strong> projects require officer assignment. 
            <strong> {queue.filter(p => p.risk.reasons.some(r => r.includes('Cost Overrun'))).length}</strong> projects show significant expenditure above sanctioned limits.
          </p>
        </div>
      </div>

      {/* QUEUE TABLE */}
      <div className="glass-panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-5 py-4">Project</th>
                <th className="px-5 py-4">Risk Profile</th>
                <th className="px-5 py-4">Progress (Fin/Phy)</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Assigned To</th>
                <th className="px-5 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredQueue.length === 0 ? (
                <tr><td colSpan="6" className="px-5 py-8 text-center text-slate-500">No projects found in the verification queue.</td></tr>
              ) : (
                filteredQueue.map(p => (
                  <tr key={p.Project_ID} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{p.Project_ID}</p>
                      <p className="text-slate-500 text-xs w-48 truncate">{p.Project_Name}</p>
                      <p className="text-slate-400 text-xs mt-1 flex items-center gap-1"><Map size={10}/> {p.District}</p>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        p.risk.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        p.risk.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.risk.risk_level} ({p.risk.score})
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${p.Financial_Progress > p.Physical_Progress + 20 ? 'text-red-600' : 'text-slate-700'}`}>{p.Financial_Progress}%</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">{p.Physical_Progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${
                        p.workflow.status === 'Pending Verification' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                        p.workflow.status === 'Closed' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        'bg-blue-100 text-blue-700 border-blue-200'
                      }`}>
                        {p.workflow.status}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {p.workflow.assigned_officer ? (
                        <p className="text-xs text-slate-700 font-medium truncate w-40">{p.workflow.assigned_officer.split('—')[0]}</p>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => handleViewDetails(p.Project_ID)}
                        className="px-4 py-1.5 bg-slate-800 text-white text-xs font-medium rounded hover:bg-slate-700 transition-colors"
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* VERIFICATION DETAILS MODAL OVERLAY */}
      {selectedProject && (
        <VerificationDetailsModal 
          projectDetails={projectDetails} 
          onClose={closeDetails} 
        />
      )}
    </div>
  );
}

// --------------------------------------------------------------------------------
// SUB-COMPONENT: VerificationDetailsModal
// --------------------------------------------------------------------------------
function VerificationDetailsModal({ projectDetails, onClose }) {
  if (!projectDetails) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-4xl p-8 flex justify-center text-slate-500">
          Loading Project Dossier...
        </div>
      </div>
    );
  }

  const p = projectDetails;
  
  // Forms State
  const [assignOfficer, setAssignOfficer] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [findings, setFindings] = useState(p.workflow.findings || '');
  const [remarks, setRemarks] = useState(p.workflow.officer_remarks || '');
  const [inspectionResult, setInspectionResult] = useState(p.workflow.inspection_result || 'Pending');
  const [decision, setDecision] = useState(p.workflow.final_decision || 'Pending');
  const [checklist, setChecklist] = useState(p.workflow.checklist || { financial: {}, project: {}, compliance: {} });

  // Prototype Evidence State
  const [photosUploaded, setPhotosUploaded] = useState(false);
  const [previewFile, setPreviewFile] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileUpload = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      setPhotosUploaded(true);
    }
  };

  const toggleCheck = (category, field) => {
    setChecklist(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [field]: !prev[category][field]
      }
    }));
  };

  const handleAssign = () => {
    if (!assignOfficer) return alert("Please select an officer");
    api.assignVerification(p.Project_ID, {
      assigned_officer: assignOfficer,
      priority: p.risk.risk_level,
      due_date: dueDate || new Date().toISOString()
    }).then(() => {
      alert("Officer Assigned Successfully");
      onClose();
    }).catch(console.error);
  };

  const handleSubmitFindings = () => {
    if (decision === 'Pending') return alert("Please select a Final Decision");
    api.submitVerificationFindings(p.Project_ID, {
      findings,
      officer_remarks: remarks,
      inspection_result: inspectionResult,
      final_decision: decision,
      checklist,
      evidence: [] // Evidence mock handled via UI
    }).then(() => {
      alert("Verification Findings Submitted Successfully");
      onClose();
    }).catch(console.error);
  };

  const gap = p.Financial_Progress - p.Physical_Progress;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 py-8">
      <div className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-6xl h-full flex flex-col overflow-hidden border border-slate-200">
        
        {/* MODAL HEADER */}
        <div className="px-6 py-4 bg-white border-b border-slate-200 flex justify-between items-center shrink-0">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl font-bold text-slate-800">{p.Project_ID}</h2>
              <span className={`text-xs font-bold px-2 py-1 rounded ${
                p.workflow.status === 'Closed' ? 'bg-emerald-100 text-emerald-800' : 'bg-blue-100 text-blue-800'
              }`}>
                STATUS: {p.workflow.status.toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">{p.Project_Name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><X size={20}/></button>
        </div>

        {/* MODAL SCROLLABLE BODY */}
        <div className="flex-1 overflow-y-auto p-6 flex flex-col lg:flex-row gap-6">
          
          {/* LEFT COLUMN: Data & AI Context */}
          <div className="w-full lg:w-1/2 space-y-6">
            
            {/* AI Risk Assessment Box */}
            <div className="bg-white rounded-lg shadow-sm border border-red-200 overflow-hidden">
              <div className="px-5 py-3 bg-red-50 border-b border-red-100 flex justify-between items-center">
                <h3 className="font-bold text-red-900 flex items-center gap-2"><Zap size={18}/> AI Risk Assessment</h3>
                <span className="bg-red-600 text-white text-xs font-bold px-2 py-1 rounded">Score: {p.risk.score}/100</span>
              </div>
              <div className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Why AI Flagged This Project</h4>
                  <div className="space-y-2">
                    {p.risk.reasons.map((r, i) => (
                      <p key={i} className="text-sm text-slate-700">{r}</p>
                    ))}
                  </div>
                </div>
                <div className="bg-red-50 p-3 rounded border border-red-100 text-sm text-red-800">
                  <strong>Recommended Action:</strong> District-level verification and physical inspection recommended.
                </div>
              </div>
            </div>

            {/* Core Data Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500">Sanctioned Amount</p>
                <p className="text-lg font-bold text-slate-800">{formatCurrency(p.Sanctioned_Amount)}</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500">Actual Expenditure</p>
                <p className={`text-lg font-bold ${p.Actual_Expenditure > p.Sanctioned_Amount ? 'text-red-600' : 'text-slate-800'}`}>
                  {formatCurrency(p.Actual_Expenditure)}
                </p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500">Progress (Fin/Phy)</p>
                <p className="text-lg font-bold text-slate-800">{p.Financial_Progress}% / {p.Physical_Progress}%</p>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-sm border border-slate-200">
                <p className="text-xs text-slate-500">Progress Gap</p>
                <p className={`text-lg font-bold ${gap > 15 ? 'text-red-600' : 'text-emerald-600'}`}>
                  {gap > 0 ? '+' : ''}{gap}% pts
                </p>
              </div>
            </div>

            {/* Evidence Prototype UI */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden relative">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><Paperclip size={18}/> Verification Evidence (Prototype)</h3>
              </div>
              <div className="p-5">
                <p className="text-xs text-slate-500 mb-4">Functional mock demonstrating document handling without requiring production S3 storage.</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="text-blue-500" size={20}/>
                      <div><p className="text-sm font-medium">Sanction_Order.pdf</p><p className="text-xs text-slate-400">Uploaded 12 days ago</p></div>
                    </div>
                    <button onClick={() => setPreviewFile('Sanction_Order.pdf')} className="text-xs text-primary font-medium hover:underline">Preview</button>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Camera className="text-emerald-500" size={20}/>
                      <div>
                        <p className="text-sm font-medium">Site_Inspection_Photos.zip</p>
                        <p className="text-xs text-slate-400">{photosUploaded ? 'Uploaded just now' : 'Missing'}</p>
                      </div>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileUpload} className="hidden" />
                    {!photosUploaded ? (
                      <button onClick={() => fileInputRef.current.click()} className="text-xs bg-slate-100 px-3 py-1 rounded text-slate-600 hover:bg-slate-200 font-medium">Upload File</button>
                    ) : (
                      <button onClick={() => setPreviewFile('Site_Inspection_Photos.zip')} className="text-xs text-primary font-medium hover:underline">Preview</button>
                    )}
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* RIGHT COLUMN: Officer Actions & Workflow */}
          <div className="w-full lg:w-1/2 space-y-6">
            
            {/* ASSIGNMENT BLOCK */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><UserCheck size={18}/> Assignment & Routing</h3>
              </div>
              <div className="p-5 space-y-4">
                {p.workflow.assigned_officer ? (
                  <div className="bg-blue-50 p-3 rounded border border-blue-100">
                    <p className="text-xs text-blue-500 font-bold uppercase mb-1">Currently Assigned To</p>
                    <p className="text-sm text-blue-900 font-medium">{p.workflow.assigned_officer}</p>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1">Select Officer / Team (Demo Users)</label>
                      <select value={assignOfficer} onChange={e => setAssignOfficer(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                        <option value="">-- Select Officer --</option>
                        {MOCK_OFFICERS.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    </div>
                    <button onClick={handleAssign} className="w-full py-2 bg-slate-800 text-white rounded text-sm font-medium hover:bg-slate-700">Assign Officer</button>
                  </>
                )}
              </div>
            </div>

            {/* CHECKLIST & FINDINGS BLOCK */}
            <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 flex items-center gap-2"><CheckSquare size={18}/> Officer Findings & Verification</h3>
              </div>
              <div className="p-5 space-y-6">
                
                {/* Interactive Checklist */}
                <div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Financial Verification</h4>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.financial?.sanction || false} onChange={() => toggleCheck('financial', 'sanction')} /> Sanction Amount Validated</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.financial?.expenditure || false} onChange={() => toggleCheck('financial', 'expenditure')} /> Expenditure Validated</label>
                  </div>
                  <h4 className="text-sm font-bold text-slate-700 mb-2">Project Verification</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.project?.physical || false} onChange={() => toggleCheck('project', 'physical')} /> Physical Progress Verified</label>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={checklist.project?.location || false} onChange={() => toggleCheck('project', 'location')} /> Asset Location Verified</label>
                  </div>
                </div>

                {/* Forms */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Inspection Result</label>
                    <select value={inspectionResult} onChange={e => setInspectionResult(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm">
                      <option value="Pending">-- Select Result --</option>
                      <option value="Work matches reported progress">Work matches reported progress</option>
                      <option value="Work partially matches">Work partially matches</option>
                      <option value="Major discrepancy found">Major discrepancy found</option>
                      <option value="Asset not found">Asset not found</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Verification Findings</label>
                    <textarea value={findings} onChange={e => setFindings(e.target.value)} rows={3} className="w-full border border-slate-300 rounded px-3 py-2 text-sm" placeholder="Enter detailed findings..."></textarea>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1">Final Decision</label>
                    <select value={decision} onChange={e => setDecision(e.target.value)} className="w-full border border-slate-300 rounded px-3 py-2 text-sm bg-slate-50">
                      <option value="Pending">-- Select Final Decision --</option>
                      <option value="Verified - No Issue">Verified - No Issue (Close Case)</option>
                      <option value="Irregularity Found">Irregularity Found (Initiate Action)</option>
                      <option value="Escalated">Escalate to Higher Authority</option>
                    </select>
                  </div>
                </div>

                <button onClick={handleSubmitFindings} className="w-full py-2.5 bg-primary text-white rounded text-sm font-bold hover:bg-primary/90 transition-colors">
                  Submit Findings & Update Status
                </button>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* PROTOTYPE DOCUMENT PREVIEW MODAL */}
      {previewFile && (
        <div className="fixed inset-0 z-[60] bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-8">
          <div className="bg-white w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex flex-col overflow-hidden">
            <div className="px-4 py-3 bg-slate-100 border-b border-slate-200 flex justify-between items-center shrink-0">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <FileText size={18} className="text-primary"/> 
                Document Preview: {previewFile}
              </h3>
              <button onClick={() => setPreviewFile(null)} className="p-1.5 hover:bg-slate-200 rounded-full text-slate-500"><X size={18}/></button>
            </div>
            <div className="flex-1 bg-slate-200 flex flex-col items-center justify-center p-8 text-center border-4 border-dashed border-slate-300 m-8 rounded-xl opacity-75">
              <div className="bg-white p-6 rounded-full shadow-sm mb-4"><FileText size={48} className="text-slate-400"/></div>
              <h4 className="text-xl font-bold text-slate-700">MOCK DOCUMENT VIEWER</h4>
              <p className="text-slate-500 mt-2 max-w-md">In a production environment, this iframe would securely render the document from an S3 bucket or equivalent government storage solution.</p>
              <div className="mt-6 px-4 py-2 bg-slate-300 rounded text-slate-600 text-sm font-mono">FILE: {previewFile}</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
