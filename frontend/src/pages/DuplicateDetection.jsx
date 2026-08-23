import { useState, useEffect } from 'react';
import { api } from '../api';
import { Copy, AlertTriangle } from 'lucide-react';

export default function DuplicateDetection() {
  const [duplicates, setDuplicates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getDuplicates().then(data => {
      setDuplicates(data);
      setLoading(false);
    }).catch(err => {
      setDuplicates([{
        work_a: 'MPL-2026-0321', work_b: 'MPL-2026-0322',
        name_a: 'Construction of Community Hall', name_b: 'Community Hall Construction',
        district: 'Rampur', category: 'Infrastructure',
        cost_a: 2000000, cost_b: 1980000, similarity: 87, status: 'Requires Verification'
      }]);
      setLoading(false);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2"><Copy className="text-accent" /> Duplicate Work Detection</h1>
          <p className="text-slate-500 mt-1">AI similarity matching for potential duplicate project sanctions.</p>
        </div>
      </div>
      
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
                <tr key={i} className="hover:bg-slate-50">
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
                  <td className="px-6 py-4"><span className="status-badge status-verification flex items-center gap-1 w-max"><AlertTriangle size={12}/> {d.status}</span></td>
                  <td className="px-6 py-4"><button className="text-accent font-medium text-sm">Compare Projects</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
