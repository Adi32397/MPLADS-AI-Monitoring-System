import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, GeoJSON, useMap, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getDistrictCoordinates } from '../utils/districtCoordinates';
import { Map, AlertTriangle, ShieldAlert, Activity, Filter, ChevronRight, BarChart3, TrendingUp, DollarSign, Clock, Zap, CheckCircle2, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const formatCurrency = (val) => `₹${(val / 10000000).toFixed(2)} Cr`;

function getProjectCoordinates(districtCoords, projectId, index, total) {
  if (!districtCoords) return [22.5, 78.9];
  if (total <= 1) return districtCoords;
  const angle = (index / Math.max(total, 1)) * 2 * Math.PI;
  let hash = 0;
  const str = String(projectId);
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) % 1000;
  const radius = 0.025 + ((hash % 45) / 1000);
  
  const pLat = districtCoords[0] + radius * Math.cos(angle);
  const pLng = districtCoords[1] + (radius * Math.sin(angle) * 1.15);
  return [pLat, pLng];
}

function MapUpdater({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [bounds, map]);
  return null;
}

export default function GeographicRisk({ user }) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Data States
  const [overviewData, setOverviewData] = useState([]);
  const [stateData, setStateData] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [projectsData, setProjectsData] = useState([]);
  const [geoJsonData, setGeoJsonData] = useState(null);

  // Navigation States
  const [level, setLevel] = useState('INDIA'); // INDIA, STATE, DISTRICT
  const [selectedState, setSelectedState] = useState(null);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [mapBounds, setMapBounds] = useState(null);

  useEffect(() => {
    // Load GeoJSON and initial India overview
    Promise.all([
      fetch('/india_states.geojson').then(res => res.json()).catch(() => null),
      api.getGeographicOverview(),
      api.getAllDistrictsOverview()
    ]).then(([geoJson, overview, districts]) => {
      setGeoJsonData(geoJson);
      setOverviewData(overview);

      if (user && user.role === 'state') {
        const stateName = user.state;
        api.getStateOverview(stateName).then(data => {
          setStateData(data);
          setLevel('STATE');
          setSelectedState(stateName);
          setAllDistricts(districts.filter(d => d.State === stateName));
          setLoading(false);
        });
      } else {
        setAllDistricts(districts);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const handleStateClick = (stateName, bounds) => {
    setLoading(true);
    api.getStateOverview(stateName).then(data => {
      setStateData(data);
      setSelectedState(stateName);
      setLevel('STATE');
      if (bounds) setMapBounds(bounds);
      setLoading(false);
    });
  };

  const handleDistrictClick = (districtName) => {
    setLoading(true);
    const coords = getDistrictCoordinates(districtName);
    if (coords) {
      setMapBounds([[coords[0] - 0.15, coords[1] - 0.15], [coords[0] + 0.15, coords[1] + 0.15]]);
    }

    api.getDistrictProjects(districtName).then(data => {
      setProjectsData(data);
      setSelectedDistrict(districtName);
      setLevel('DISTRICT');
      
      // If a user clicked a district directly from the INDIA map, stateData is empty.
      // We must fetch it so the charts (which compare districts in that state) populate correctly!
      if (data.length > 0) {
        const parentState = data[0].State;
        if (selectedState !== parentState) {
          api.getStateOverview(parentState).then(sData => {
            setStateData(sData);
            setSelectedState(parentState);
            setLoading(false);
          });
          return; // Prevents the outer setLoading(false) from firing early
        }
      }
      setLoading(false);
    });
  };

  const resetMap = () => {
    setLevel('INDIA');
    setSelectedState(null);
    setSelectedDistrict(null);
    setProjectsData([]);
    setMapBounds([[8.4, 68.7], [37.6, 97.2]]); // Approximate India bounds
  };

  const handleBackToIndia = () => {
    resetMap();
  };

  const getRiskColor = (score) => {
    if (score >= 75) return '#ef4444'; // Critical - Red
    if (score >= 50) return '#f97316'; // High - Orange
    if (score >= 25) return '#eab308'; // Medium - Yellow
    return '#22c55e'; // Low - Green
  };

  const onEachState = (feature, layer) => {
    const stateName = feature.properties.NAME_1 || feature.properties.st_nm;
    // Find matching state data from backend
    // Exact string matching might be tricky due to naming conventions, we do a loose include for prototype
    const data = overviewData.find(s => s.State.toLowerCase().includes((stateName || '').toLowerCase()));
    
    if (data) {
      layer.setStyle({
        fillColor: getRiskColor(data.avgRiskScore),
        weight: 1,
        opacity: 1,
        color: 'white',
        fillOpacity: 0.7
      });
      
      layer.bindTooltip(`
        <div class="p-1">
          <strong class="block text-sm">${data.State}</strong>
          <span class="text-xs">Avg Risk: ${data.avgRiskScore}</span><br/>
          <span class="text-xs">Projects: ${data.totalProjects}</span>
        </div>
      `, { sticky: true });

      layer.on({
        click: (e) => {
          handleStateClick(data.State, e.target.getBounds());
        },
        mouseover: (e) => {
          const l = e.target;
          l.setStyle({ fillOpacity: 1, weight: 2 });
        },
        mouseout: (e) => {
          const l = e.target;
          l.setStyle({ fillOpacity: 0.7, weight: 1 });
        }
      });
    } else {
      layer.setStyle({ fillColor: '#e2e8f0', weight: 1, color: 'white', fillOpacity: 0.4 });
    }
  };

  if (loading && overviewData.length === 0) {
    return <div className="p-8 text-center text-slate-500">Loading Geographic Analytics...</div>;
  }

  // Calculate current aggregated view metrics
  let currentMetrics = { title: 'India Overview', data: overviewData };
  if (level === 'STATE') {
    currentMetrics = { title: `${selectedState} Districts`, data: stateData };
  } else if (level === 'DISTRICT') {
    // If in district level, we show projects in the table, but keep stateData for the charts
    currentMetrics = { title: `${selectedDistrict} Analysis`, data: stateData };
  }

  const topRisks = [...currentMetrics.data].sort((a, b) => b.avgRiskScore - a.avgRiskScore).slice(0, 5);
  const totalHighRisk = currentMetrics.data.reduce((acc, curr) => acc + curr.highRiskCount + curr.criticalCount, 0);
  const totalOverruns = currentMetrics.data.reduce((acc, curr) => acc + curr.costOverruns, 0);

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Map className="text-primary" /> Geographic Risk Analytics
          </h1>
          <p className="text-slate-500 mt-1">Identify spatial concentrations of anomalies, fraud indicators, and delays.</p>
        </div>
      </div>

      {/* BREADCRUMB */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 flex justify-between items-center shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-600">
          <button onClick={resetMap} className="hover:text-primary transition-colors">India</button>
          {level !== 'INDIA' && (
            <>
              <ChevronRight size={16} className="text-slate-400"/>
              <button onClick={() => handleStateClick(selectedState)} className="hover:text-primary transition-colors">{selectedState}</button>
            </>
          )}
          {level === 'DISTRICT' && (
            <>
              <ChevronRight size={16} className="text-slate-400"/>
              <span className="text-slate-800 font-semibold">{selectedDistrict}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={selectedDistrict || ''} 
            onChange={(e) => {
              if (e.target.value) handleDistrictClick(e.target.value);
              else resetMap();
            }}
            className="border border-slate-300 rounded px-2.5 py-1 text-xs bg-white text-slate-700 outline-none focus:border-primary font-medium"
          >
            <option value="">-- Jump to District on Map --</option>
            {[...new Set(allDistricts.map(d => d.District))].sort().map(dName => (
              <option key={dName} value={dName}>{dName}</option>
            ))}
          </select>
          <button onClick={resetMap} className="text-xs bg-slate-100 px-3 py-1.5 rounded font-medium hover:bg-slate-200 transition-colors">Reset Map</button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* INTERACTIVE MAP */}
        <div className="lg:col-span-2 glass-panel overflow-hidden border-2 border-slate-200/60 relative flex flex-col">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center shrink-0">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <Map size={18} className="text-slate-500"/>
              Geospatial AI Overlay {selectedDistrict ? `— ${selectedDistrict} (${projectsData.length} Projects Plotted)` : ''}
            </h3>
            <div className="flex gap-3 text-xs font-semibold">
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#ef4444]"></span> Critical</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#f97316]"></span> High</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#eab308]"></span> Med</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-[#22c55e]"></span> Low</span>
            </div>
          </div>
          <div className="h-[500px] w-full bg-slate-50 z-0">
            <MapContainer center={[22.5937, 78.9629]} zoom={4} className="h-full w-full" zoomControl={false}>
              <TileLayer
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
              />
              <TileLayer
                url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
              />
              {geoJsonData && <GeoJSON data={geoJsonData} onEachFeature={onEachState} />}
              
              {/* DISTRICT MARKERS - ALWAYS VISIBLE */}
              {allDistricts.map(districtObj => {
                const coords = getDistrictCoordinates(districtObj.District);
                if (!coords) return null;
                // Only show markers for the selected state if we are in STATE or DISTRICT view
                if (level !== 'INDIA' && selectedState) {
                  // Find if this district belongs to the selected state by checking stateData
                  const belongsToState = stateData.find(d => d.District === districtObj.District);
                  if (!belongsToState) return null;
                }

                let riskColor = getRiskColor(districtObj.avgRiskScore);
                // Override with worst-case scenario so critical projects are never hidden by the average
                if (districtObj.criticalCount > 0) riskColor = '#ef4444'; // Red
                else if (districtObj.highRiskCount > 0) riskColor = '#f97316'; // Orange

                const customIcon = L.divIcon({
                  className: 'custom-div-icon',
                  html: `<div style="background-color:${riskColor}; width:16px; height:16px; border-radius:50%; border:2px solid white; box-shadow: 0 0 5px rgba(0,0,0,0.5);"></div>`,
                  iconSize: [16, 16],
                  iconAnchor: [8, 8]
                });

                return (
                  <Marker 
                    key={districtObj.District} 
                    position={coords} 
                    icon={customIcon}
                    eventHandlers={{
                      click: () => handleDistrictClick(districtObj.District)
                    }}
                  >
                    <Tooltip direction="top" offset={[0, -10]} opacity={1}>
                      <div className="text-center w-48">
                        <strong className="block text-sm text-slate-800 border-b pb-1 mb-1">{districtObj.District}</strong>
                        <span className="text-xs text-slate-500 font-medium block">Risk Score: {districtObj.avgRiskScore}</span>
                        <span className="text-xs text-slate-500 font-medium block mb-2">Total Projects: {districtObj.totalProjects}</span>
                        {districtObj.projectIds && districtObj.projectIds.length > 0 && (
                          <div className="text-left bg-slate-50 p-1 rounded border border-slate-200">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Project IDs:</span>
                            <div className="flex flex-wrap gap-1">
                              {districtObj.projectIds.slice(0, 8).map(id => (
                                <span key={id} className="text-[10px] bg-white border border-slate-200 px-1 rounded text-slate-600">{id}</span>
                              ))}
                              {districtObj.projectIds.length > 8 && (
                                <span className="text-[10px] text-slate-400">+{districtObj.projectIds.length - 8} more</span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  </Marker>
                );
              })}

              {/* INDIVIDUAL PROJECT MARKERS IN SELECTED DISTRICT */}
              {level === 'DISTRICT' && selectedDistrict && projectsData.map((p, idx) => {
                const districtCoords = getDistrictCoordinates(selectedDistrict);
                const pCoords = getProjectCoordinates(districtCoords, p.Project_ID, idx, projectsData.length);
                
                const pRiskLevel = p.risk?.risk_level || 'LOW';
                const pScore = p.risk?.score || 0;
                const pRiskColor = pRiskLevel === 'CRITICAL' ? '#ef4444' :
                                   pRiskLevel === 'HIGH' ? '#f97316' :
                                   pRiskLevel === 'MEDIUM' ? '#eab308' : '#22c55e';

                const pIcon = L.divIcon({
                  className: 'custom-project-pin',
                  html: `
                    <div style="position:relative; display:flex; align-items:center; justify-content:center; cursor:pointer;">
                      <div style="background-color:${pRiskColor}; width:13px; height:13px; border-radius:50%; border:2px solid white; box-shadow: 0 0 6px ${pRiskColor};"></div>
                    </div>
                  `,
                  iconSize: [14, 14],
                  iconAnchor: [7, 7]
                });

                return (
                  <Marker key={p.Project_ID} position={pCoords} icon={pIcon}>
                    <Tooltip direction="top" offset={[0, -10]}>
                      <div className="text-xs font-sans">
                        <strong className="block text-slate-800">{p.Project_ID}</strong>
                        <span className="text-slate-600 block truncate max-w-[180px]">{p.Project_Name}</span>
                        <span style={{ color: pRiskColor, fontWeight: 'bold' }}>{pRiskLevel} ({pScore}) • {p.Status}</span>
                      </div>
                    </Tooltip>
                    <Popup>
                      <div className="p-1 w-64 font-sans">
                        <div className="flex justify-between items-start mb-1.5 border-b border-slate-200 pb-1.5">
                          <span className="text-[11px] font-mono font-bold bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded">{p.Project_ID}</span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ backgroundColor: pRiskColor + '20', color: pRiskColor }}>
                            {pRiskLevel} ({pScore})
                          </span>
                        </div>
                        <h4 className="text-xs font-bold text-slate-800 mb-1 leading-snug">{p.Project_Name}</h4>
                        <p className="text-[11px] text-slate-600 mb-2"><strong>Status:</strong> {p.Status}</p>
                        <div className="text-[11px] bg-slate-50 p-2 rounded border border-slate-200 mb-2 space-y-1">
                          <div className="flex justify-between">
                            <span className="text-slate-500">Sanctioned:</span>
                            <span className="font-semibold text-slate-700">{formatCurrency(p.Sanctioned_Amount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Expenditure:</span>
                            <span className={`font-semibold ${p.Actual_Expenditure > p.Sanctioned_Amount ? 'text-red-600' : 'text-slate-700'}`}>
                              {formatCurrency(p.Actual_Expenditure)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Progress (F/P):</span>
                            <span className="font-semibold text-slate-700">{p.Financial_Progress}% / {p.Physical_Progress}%</span>
                          </div>
                        </div>
                        <button 
                          onClick={() => navigate('/projects')}
                          className="w-full text-center text-xs py-1.5 bg-primary text-white rounded font-medium hover:bg-primary/90 transition-colors shadow-sm"
                        >
                          View in Projects Section →
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
              <MapUpdater bounds={mapBounds} />
            </MapContainer>
          </div>
        </div>

        {/* RIGHT COLUMN: ALERTS & RANKINGS */}
        <div className="space-y-6">
          {/* AI INSIGHTS */}
          <div className="glass-panel p-5 border-t-4 border-t-indigo-500">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <Zap size={18} className="text-indigo-500"/> AI Geographic Insights
            </h3>
            <div className="space-y-3">
              {totalHighRisk > 0 && (
                <div className="bg-red-50 p-3 rounded border border-red-100 text-sm text-red-800 flex gap-2">
                  <AlertTriangle size={16} className="shrink-0 mt-0.5 text-red-600"/>
                  <p><strong>High concentration of risk</strong> detected. There are {totalHighRisk} flagged projects requiring attention in this region.</p>
                </div>
              )}
              {totalOverruns > 0 && (
                <div className="bg-orange-50 p-3 rounded border border-orange-100 text-sm text-orange-800 flex gap-2">
                  <DollarSign size={16} className="shrink-0 mt-0.5 text-orange-600"/>
                  <p><strong>{totalOverruns} projects</strong> show expenditure exceeding sanctioned amounts.</p>
                </div>
              )}
              {totalHighRisk === 0 && totalOverruns === 0 && (
                <div className="bg-emerald-50 p-3 rounded border border-emerald-100 text-sm text-emerald-800 flex gap-2">
                  <CheckCircle2 size={16} className="shrink-0 mt-0.5 text-emerald-600"/>
                  <p>No significant geographic anomalies detected in this region.</p>
                </div>
              )}
            </div>
          </div>

          {/* RISK RANKING */}
          <div className="glass-panel p-5">
            <h3 className="font-bold text-slate-800 flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-slate-500"/> Risk Ranking ({level === 'INDIA' ? 'States' : 'Districts'})
            </h3>
            <div className="space-y-3">
              {topRisks.map((item, idx) => (
                <div 
                  key={idx} 
                  onClick={() => level === 'INDIA' ? handleStateClick(item.State) : handleDistrictClick(item.District)}
                  className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer transition-colors border border-transparent hover:border-slate-200"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-slate-400 w-4">{idx + 1}.</span>
                    <span className="text-sm font-medium text-slate-700">{item.State || item.District}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">{item.avgRiskScore}</span>
                    <span className={`w-3 h-3 rounded-full`} style={{backgroundColor: getRiskColor(item.avgRiskScore)}}></span>
                  </div>
                </div>
              ))}
              {topRisks.length === 0 && <p className="text-sm text-slate-500 italic">No data available.</p>}
            </div>
          </div>
        </div>

      </div>

      {/* CHARTS ROW */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass-panel p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">High-Risk Projects Concentration</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentMetrics.data.slice(0, 10)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={level === 'INDIA' ? 'State' : 'District'} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                <RechartsTooltip cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="criticalCount" name="Critical Risk" stackId="a" fill="#ef4444" radius={[0, 0, 0, 0]} />
                <Bar dataKey="highRiskCount" name="High Risk" stackId="a" fill="#f97316" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-5">
          <h3 className="text-base font-semibold text-slate-800 mb-4">Geographic Financial Risk</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={currentMetrics.data.slice(0, 10)} margin={{ top: 10, right: 10, left: 0, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey={level === 'INDIA' ? 'State' : 'District'} axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} tickFormatter={(v) => `₹${(v/10000000).toFixed(0)}Cr`}/>
                <RechartsTooltip formatter={(value) => [formatCurrency(value), '']} cursor={{fill: '#f8fafc'}} />
                <Bar dataKey="totalSanctioned" name="Sanctioned" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="totalExpenditure" name="Expenditure" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* TOP HIGH-RISK PROJECTS TABLE (Only visible when District is selected) */}
      {level === 'DISTRICT' && (
        <div className="glass-panel overflow-hidden mt-8">
          <div className="flex justify-between items-center px-4 py-3 border-b border-slate-200 bg-slate-50 rounded-t-lg">
            <h3 className="font-bold text-slate-800 flex items-center gap-2">
              <ShieldAlert size={18} className="text-red-500"/>
              Top Flagged Projects in {selectedDistrict}
            </h3>
            {level !== 'INDIA' && user?.role !== 'state' && (
              <button 
                onClick={handleBackToIndia}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ArrowLeft size={16} />
                Back to India
              </button>
            )}
            {level === 'DISTRICT' && user?.role === 'state' && (
              <button 
                onClick={() => {
                  setLevel('STATE');
                  setSelectedDistrict(null);
                  setProjectsData([]);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 rounded text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              >
                <ArrowLeft size={16} />
                Back to State
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-white border-b border-slate-200 text-slate-600 font-medium">
                <tr>
                  <th className="px-5 py-4">Project Details</th>
                  <th className="px-5 py-4">Geography</th>
                  <th className="px-5 py-4">Financials</th>
                  <th className="px-5 py-4">Progress (F/P)</th>
                  <th className="px-5 py-4">AI Risk Score</th>
                  <th className="px-5 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {projectsData.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-5 py-8 text-center text-slate-500">
                      No projects found for this district.
                    </td>
                  </tr>
                ) : projectsData.map(p => (
                  <tr key={p.Project_ID} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{p.Project_ID}</p>
                      <p className="text-slate-500 text-xs w-48 truncate">{p.Project_Name}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-sm font-medium">{p.District}</p>
                      <p className="text-xs text-slate-400">{p.State}</p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="text-slate-700">S: {formatCurrency(p.Sanctioned_Amount)}</p>
                      <p className={`font-medium ${p.Actual_Expenditure > p.Sanctioned_Amount ? 'text-red-600' : 'text-slate-600'}`}>
                        E: {formatCurrency(p.Actual_Expenditure)}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold ${p.Financial_Progress > p.Physical_Progress + 20 ? 'text-red-600' : 'text-slate-700'}`}>{p.Financial_Progress}%</span>
                        <span className="text-slate-300">/</span>
                        <span className="text-slate-500">{p.Physical_Progress}%</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`text-xs font-bold px-2 py-1 rounded ${
                        p.risk.risk_level === 'CRITICAL' ? 'bg-red-100 text-red-700' :
                        p.risk.risk_level === 'HIGH' ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {p.risk.risk_level} ({p.risk.score})
                      </span>
                    </td>
                    <td className="px-5 py-4 text-center">
                      <button 
                        onClick={() => navigate('/verification')}
                        className="px-4 py-1.5 bg-primary text-white text-xs font-medium rounded hover:bg-primary/90 transition-colors"
                      >
                        Add to Verification Queue
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
