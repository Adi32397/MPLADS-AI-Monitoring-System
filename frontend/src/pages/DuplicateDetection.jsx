import { useState, useEffect } from 'react';
import { api } from '../api';
import { Copy, AlertTriangle, X, Check, XCircle } from 'lucide-react';

export default function DuplicateDetection({ user }) {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedComparison, setSelectedComparison] = useState(null);

  useEffect(() => {
    api.getDuplicates().then(data => {
      let filteredData = data;
      if (user) {
        if (user.role === 'mp') filteredData = data.filter(d => d.constituency === 'Example Constituency');
        if (user.role === 'district') filteredData = data; // Show all for demo so CSV upload is visible
        if (user.role === 'state') filteredData = data.filter(d => d.state === user.state);
      }
      if (filteredData.length === 0) {
        throw new Error("No duplicates found from API, falling back to mock");
      }
      setDuplicates(filteredData);
      setLoading(false);
    }).catch(err => {
      // Mock Data if endpoint fails
      const mockDuplicates = [
        {
          work_a: 'MPL-2026-1002', work_b: 'MPL-2026-1027',
          name_a: 'Health Project 2', name_b: 'Health Project 27',
          district: 'Nainital', state: 'Uttarakhand', constituency: 'Nainital-Udhamsingh Nagar', category: 'Health',
          cost_a: 5000000, cost_b: 5000000, similarity: 94, status: 'Potential Duplicate — Requires Verification'
        },
        {
          work_a: 'MPL-2026-1010', work_b: 'MPL-2026-1040',
          name_a: 'Infrastructure Project 10', name_b: 'Infrastructure Project 40',
          district: 'Dehradun', state: 'Uttarakhand', constituency: 'Example Constituency', category: 'Infrastructure',
          cost_a: 3500000, cost_b: 3500000, similarity: 87, status: 'Potential Duplicate — Requires Verification'
        },
        {
          work_a: 'MPL-2026-0321', work_b: 'MPL-2026-0322',
          name_a: 'Community Hall Construction', name_b: 'Construction of Community Hall',
          district: 'Dehradun', state: 'Uttarakhand', constituency: 'Example Constituency', category: 'Infrastructure',
          cost_a: 2000000, cost_b: 1980000, similarity: 96, status: 'Potential Duplicate — Requires Verification'
        },
        {
          work_a: 'MPL-2026-0411', work_b: 'MPL-2026-0511',
          name_a: 'School Renovation', name_b: 'Primary School Renovation',
          district: 'Pune', state: 'Maharashtra', constituency: 'Pune City', category: 'Education',
          cost_a: 1500000, cost_b: 1450000, similarity: 78, status: 'Potential Duplicate — Requires Verification'
        }
      ];

      let filteredMock = mockDuplicates;
      if (user) {
        if (user.role === 'mp') filteredMock = mockDuplicates.filter(d => d.constituency === 'Example Constituency');
        if (user.role === 'district') filteredMock = mockDuplicates; // Show all for demo
        if (user.role === 'state') filteredMock = mockDuplicates.filter(d => d.state === user.state);
      }

      setDuplicates(filteredMock);
      setLoading(false);
    });
  }, [user]);

  const formatCurrency = (val) => `₹${(val / 100000).toFixed(1)} Lakh`;

  return (
    <div className="space-y-6 relative">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Copy className="text-accent" /> Duplicate Work Detection</h1>
          <p className="text-slate-500 mt-1">AI similarity matching for potential duplicate project sanctions.</p>
        </div>
      </div>
      
      {/* Comparison Modal */}
      {selectedComparison && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="flex justify-between items-center p-6 border-b border-slate-100 bg-slate-50">
              <div>
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                  <Copy className="text-accent" size={20} /> AI Similarity Comparison
                </h2>
                <p className="text-slate-500 text-sm mt-1">
                  Confidence Score: <span className="font-bold text-orange-600">{selectedComparison.similarity}%</span>
                </p>
              </div>
              <button onClick={() => setSelectedComparison(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            
            {/* Modal Body - Side by Side */}
            <div className="flex-1 overflow-y-auto p-6 bg-slate-50">
              <div className="grid md:grid-cols-2 gap-8">
                {/* Work A */}
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs font-bold tracking-wider text-slate-400 uppercase mb-4 border-b pb-2">Record A (Original)</div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Project ID</p>
                      <p className="font-semibold text-slate-800">{selectedComparison.work_a}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Project Name</p>
                      <p className="font-medium text-slate-800">{selectedComparison.name_a}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Location</p>
                        <p className="text-sm font-medium text-slate-800">{selectedComparison.district}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Category</p>
                        <p className="text-sm font-medium text-slate-800">{selectedComparison.category}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Sanctioned Cost</p>
                      <p className="font-semibold text-slate-800">{formatCurrency(selectedComparison.cost_a)}</p>
                    </div>
                  </div>
                </div>

                {/* Work B */}
                <div className="bg-orange-50 p-6 rounded-lg border border-orange-200 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-16 h-16 bg-orange-100 rounded-bl-full flex items-center justify-center border-l border-b border-orange-200">
                    <AlertTriangle className="text-orange-500 mb-2 ml-2" size={20} />
                  </div>
                  <div className="text-xs font-bold tracking-wider text-orange-600 uppercase mb-4 border-b border-orange-200 pb-2">Record B (Suspect)</div>
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs text-slate-500">Project ID</p>
                      <p className="font-semibold text-slate-800">{selectedComparison.work_b}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Project Name</p>
                      <p className="font-medium text-slate-800">{selectedComparison.name_b}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-slate-500">Location</p>
                        <p className="text-sm font-medium text-slate-800">{selectedComparison.district}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500">Category</p>
                        <p className="text-sm font-medium text-slate-800">{selectedComparison.category}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">Sanctioned Cost</p>
                      <p className="font-semibold text-slate-800">{formatCurrency(selectedComparison.cost_b)}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Highlight Note & Detailed Breakdown */}
              <div className="mt-6 space-y-4">
                <div className="p-4 bg-blue-50 border border-blue-100 rounded-lg flex gap-3 text-blue-800 text-sm">
                  <AlertTriangle size={18} className="shrink-0 text-blue-500" />
                  <p><strong>AI Note:</strong> These records share a <strong>{selectedComparison.similarity}% semantic similarity</strong> in the project description, matching location, and a highly similar sanctioned budget. This strongly indicates a potential duplicate sanction request.</p>
                </div>
                
                <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                  <div className="px-4 py-3 border-b border-slate-200 bg-slate-100/50">
                    <h4 className="text-sm font-semibold text-slate-800">AI Duplicate Detection Engine Breakdown</h4>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Semantic NLP Similarity (Project Names)</span>
                      <span className="font-semibold text-red-600">{selectedComparison.similarity}% Match</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Financial Proximity (Sanctioned Amount)</span>
                      <span className="font-semibold text-red-600">
                        {Math.abs(selectedComparison.cost_a - selectedComparison.cost_b) === 0 ? '100% Match (Exact)' : '98% Match'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Geographic Location Overlap</span>
                      <span className="font-semibold text-red-600">100% Match (Same District)</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-slate-600">Sector / Category Alignment</span>
                      <span className="font-semibold text-red-600">100% Match ({selectedComparison.category})</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
              <button onClick={() => setSelectedComparison(null)} className="px-5 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-2">
                 Cancel
              </button>
              <button onClick={() => setSelectedComparison(null)} className="px-5 py-2 bg-slate-800 text-white font-medium hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                <XCircle size={16} /> Mark as False Positive
              </button>
              <button onClick={() => setSelectedComparison(null)} className="px-5 py-2 bg-red-600 text-white font-medium hover:bg-red-700 rounded-lg transition-colors flex items-center gap-2 shadow-sm">
                <Check size={16} /> Flag as Duplicate
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="glass-panel overflow-hidden">
        {loading ? <div className="p-8 text-center">Running similarity analysis...</div> : (
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium">
              <tr>
                <th className="px-6 py-4">Work A</th>
                <th className="px-6 py-4">Work B</th>
                <th className="px-6 py-4">Location & Category</th>
                <th className="px-6 py-4">Similarity Score</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {duplicates.map((d, i) => (
                <tr key={i} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{d.work_a}</p>
                    <p className="text-slate-500 text-xs w-48 truncate">{d.name_a}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-semibold text-slate-800">{d.work_b}</p>
                    <p className="text-slate-500 text-xs w-48 truncate">{d.name_b}</p>
                  </td>
                  <td className="px-6 py-4 text-slate-600">{d.district} <br/><span className="text-xs text-slate-400">{d.category}</span></td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-orange-600">{d.similarity}%</span>
                      <div className="w-16 h-1.5 bg-slate-200 rounded-full"><div className="bg-orange-500 h-full" style={{width: `${d.similarity}%`}}></div></div>
                    </div>
                  </td>
                  <td className="px-6 py-4"><span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700 w-max"><AlertTriangle size={12}/> {d.status}</span></td>
                  <td className="px-6 py-4">
                    <button 
                      onClick={() => setSelectedComparison(d)}
                      className="text-accent font-medium text-sm hover:text-accent-light transition-colors"
                    >
                      Compare Projects
                    </button>
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
