import React, { useState, useEffect } from 'react';
import { Shield, Lock, User, Eye, EyeOff, AlertTriangle, Hexagon } from 'lucide-react';

// --- Sub-components ---

const TopNavBar = () => {
  const [time, setTime] = useState('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).toUpperCase();
      const timeStr = now.toLocaleTimeString('en-US', { hour12: false });
      setTime(`${dateStr}   ${timeStr}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute top-0 left-0 w-full flex justify-between items-center px-6 py-4 border-b border-[#00D4FF]/20 z-20 bg-[#020b14]/80 backdrop-blur-sm">
      <div className="flex items-center gap-4">
        <div className="flex gap-1">
          <div className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full"></div>
          <div className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full opacity-50"></div>
          <div className="w-1.5 h-1.5 bg-[#00D4FF] rounded-full opacity-25"></div>
        </div>
        <Shield size={18} className="text-[#00D4FF]" />
        <div className="flex items-baseline gap-3">
          <h1 className="text-[#00D4FF] font-bold tracking-[0.2em] text-sm">CIVICSHIELD</h1>
          <span className="text-[#1677FF]/70 text-[10px] tracking-widest hidden sm:block">MPLADS INTELLIGENCE SYSTEM</span>
        </div>
      </div>
      <div className="flex items-center gap-6 text-[10px] tracking-widest text-[#00D4FF]">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-[#22C55E] rounded-full animate-pulse"></div>
          <span className="text-[#22C55E]">SYS ONLINE</span>
        </div>
        <span className="hidden md:block opacity-70">{time}</span>
      </div>
    </div>
  );
};

const RadarPanel = () => {
  return (
    <div className="hidden lg:flex w-[60%] h-full relative flex-row justify-center items-center z-10 gap-16">
      
      {/* Background Radar Grid */}
      <div className="absolute inset-0 flex items-center justify-center opacity-[0.15] pointer-events-none">
        <div className="w-[800px] h-[800px] rounded-full border border-[#00D4FF] absolute left-10"></div>
        <div className="w-[600px] h-[600px] rounded-full border border-[#00D4FF] absolute left-10"></div>
        <div className="w-[400px] h-[400px] rounded-full border border-[#00D4FF] absolute left-10"></div>
        <div className="w-full h-[1px] bg-[#00D4FF] absolute"></div>
        <div className="h-full w-[1px] bg-[#00D4FF] absolute left-[450px]"></div>
      </div>

      <div className="flex flex-col items-center">
        {/* The 3D Rotating Cyber Earth with Details */}
        <div className="relative w-96 h-96 mb-12 flex items-center justify-center group">
          <style>{`
            @keyframes spinEarth {
              0% { transform: translateX(0%); }
              100% { transform: translateX(-50%); }
            }
            @keyframes scanLaser {
              0% { transform: translateY(-20px); opacity: 0; }
              10% { opacity: 0.8; }
              90% { opacity: 0.8; }
              100% { transform: translateY(320px); opacity: 0; }
            }
            @keyframes blinkData {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.5; }
            }
          `}</style>

          {/* Outer glow */}
          <div className="absolute inset-0 rounded-full bg-[#1677FF] opacity-30 blur-[60px] animate-pulse pointer-events-none"></div>

          {/* Targeting Brackets */}
          <div className="absolute top-[-20px] left-[-20px] w-8 h-8 border-t-2 border-l-2 border-[#00D4FF] opacity-60"></div>
          <div className="absolute top-[-20px] right-[-20px] w-8 h-8 border-t-2 border-r-2 border-[#00D4FF] opacity-60"></div>
          <div className="absolute bottom-[-20px] left-[-20px] w-8 h-8 border-b-2 border-l-2 border-[#00D4FF] opacity-60"></div>
          <div className="absolute bottom-[-20px] right-[-20px] w-8 h-8 border-b-2 border-r-2 border-[#00D4FF] opacity-60"></div>
          
          {/* Orbital Ring with Satellite */}
          <div className="absolute inset-[-15%] rounded-full border border-[#00D4FF]/30 border-t-[#00D4FF]/60 border-b-[#00D4FF]/60 z-30 pointer-events-none" style={{ transform: 'rotateX(75deg) rotateY(-15deg)' }}>
             <div className="absolute top-0 left-1/2 w-full h-full animate-[spin_10s_linear_infinite] transform -translate-x-1/2">
               <div className="w-2 h-2 bg-[#00D4FF] rounded-full shadow-[0_0_15px_#00D4FF] absolute top-[-4px] left-1/2 transform -translate-x-1/2"></div>
             </div>
          </div>
          
          {/* Floating Data Labels */}
          <div className="absolute top-10 right-[-80px] text-[8px] font-mono text-[#00D4FF] z-30 animate-[blinkData_4s_infinite]">
            <div className="border border-[#00D4FF]/40 bg-[#020b14]/90 p-1.5 mb-1 backdrop-blur-md shadow-[0_0_10px_rgba(0,212,255,0.2)]">
              TRK: LAT 45.92° N
            </div>
            <div className="border border-[#00D4FF]/40 bg-[#020b14]/90 p-1.5 backdrop-blur-md shadow-[0_0_10px_rgba(0,212,255,0.2)]">
              TRK: LON 12.48° E
            </div>
          </div>
          
          <div className="absolute bottom-20 left-[-60px] text-[8px] font-mono text-[#00D4FF] z-30 animate-[blinkData_5s_infinite]">
            <div className="border border-[#00D4FF]/40 bg-[#020b14]/90 p-1.5 mb-1 backdrop-blur-md shadow-[0_0_10px_rgba(0,212,255,0.2)]">
              SYS_STAT: NOMINAL
            </div>
          </div>

          {/* Sphere Container */}
          <div className="relative w-80 h-80 rounded-full overflow-hidden border border-[#00D4FF]/30 shadow-[inset_0_0_80px_rgba(0,212,255,0.8),_0_0_30px_rgba(0,212,255,0.4)] bg-[#020b14]">
            
            {/* Latitude & Longitude Lines (Static) */}
            <div className="absolute inset-0 rounded-full border-t border-b border-[#00D4FF]/20 transform scale-y-50"></div>
            <div className="absolute inset-0 rounded-full border-t border-b border-[#00D4FF]/20 transform scale-y-75"></div>
            <div className="absolute inset-0 rounded-full border-l border-r border-[#00D4FF]/10 transform scale-x-50"></div>
            <div className="absolute inset-0 flex items-center justify-center"><div className="w-full h-[1px] bg-[#00D4FF]/40"></div></div>
            <div className="absolute inset-0 flex items-center justify-center"><div className="h-full w-[1px] bg-[#00D4FF]/20"></div></div>
            
            {/* 3D Curved Surface Overlay (Inner Shadow) */}
            <div className="absolute inset-0 rounded-full shadow-[inset_-40px_-20px_100px_rgba(2,11,20,1),inset_20px_10px_50px_rgba(22,119,255,0.4)] z-20 pointer-events-none"></div>

            {/* Scanning Laser Overlay inside sphere */}
            <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
               <div className="w-full h-[2px] bg-[#00D4FF] shadow-[0_0_15px_#00D4FF] opacity-80 animate-[scanLaser_4s_ease-in-out_infinite]"></div>
            </div>

            {/* Rotating Texture (The "Earth" surface) */}
            <div className="absolute top-0 left-0 h-full w-[200%] animate-[spinEarth_20s_linear_infinite] flex opacity-60 z-10"
                 style={{
                   backgroundImage: 'radial-gradient(circle at center, #00D4FF 1px, transparent 1px)',
                   backgroundSize: '16px 16px'
                 }}>
              <div className="absolute top-[20%] left-[10%] w-[15%] h-[40%] bg-[#00D4FF] blur-[8px] opacity-40 rounded-[40%_60%_70%_30%]"></div>
              <div className="absolute top-[50%] left-[30%] w-[20%] h-[20%] bg-[#00D4FF] blur-[8px] opacity-30 rounded-full"></div>
              <div className="absolute top-[10%] left-[60%] w-[25%] h-[60%] bg-[#00D4FF] blur-[8px] opacity-40 rounded-[30%_70%_40%_60%]"></div>
              <div className="absolute top-[60%] left-[80%] w-[10%] h-[30%] bg-[#00D4FF] blur-[8px] opacity-30 rounded-full"></div>
              
              <div className="absolute top-[20%] left-[60%] w-[15%] h-[40%] bg-[#00D4FF] blur-[8px] opacity-40 rounded-[40%_60%_70%_30%]"></div>
              <div className="absolute top-[50%] left-[80%] w-[20%] h-[20%] bg-[#00D4FF] blur-[8px] opacity-30 rounded-full"></div>
              <div className="absolute top-[10%] left-[110%] w-[25%] h-[60%] bg-[#00D4FF] blur-[8px] opacity-40 rounded-[30%_70%_40%_60%]"></div>
              <div className="absolute top-[60%] left-[130%] w-[10%] h-[30%] bg-[#00D4FF] blur-[8px] opacity-30 rounded-full"></div>
            </div>
          </div>
        </div>

        {/* Telemetry Text */}
        <div 
          className="relative z-10 space-y-4 font-mono w-full text-center mt-6"
          style={{ animation: 'textTyping 6s steps(40, end) infinite' }}
        >
          <div>
            <h2 className="text-[#00D4FF] tracking-[0.3em] font-bold text-sm">GLOBAL MONITORING</h2>
            <p className="text-[#00D4FF]/70 text-[10px] tracking-widest mt-1">1,842 ACTIVE PROJECTS • 247 NODES</p>
          </div>
          
          <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-[10px] text-[#00D4FF] tracking-widest mt-6 border-t border-[#00D4FF]/20 pt-4 w-96 text-left mx-auto">
            <div>
              <p className="opacity-50 mb-1">ZONE</p>
              <p className="font-bold">SECTOR-7A</p>
            </div>
            <div>
              <p className="opacity-50 mb-1">SCAN</p>
              <p className="font-bold">ACTIVE</p>
            </div>
            <div>
              <p className="opacity-50 mb-1">NODES</p>
              <p className="font-bold">247 / 250</p>
            </div>
            <div>
              <p className="opacity-50 mb-1">UPTIME</p>
              <p className="font-bold">99.98%</p>
            </div>
          </div>
        </div>
      </div>

      {/* New Live Anomaly Feed Card to fill the gap */}
      <div className="hidden xl:flex flex-col gap-6 w-80 z-20 font-mono mt-[-20px]">
        {/* Feed Card */}
        <div 
          className="border border-[#00D4FF]/30 bg-[#020b14]/80 p-5 backdrop-blur-md shadow-[0_0_20px_rgba(0,212,255,0.05)] relative overflow-hidden"
          style={{ animation: 'textTyping 8s steps(40, end) infinite' }}
        >
          <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-[#00D4FF] to-transparent"></div>
          
          <h3 className="text-[10px] font-bold text-[#00D4FF] mb-5 tracking-[0.2em] flex items-center gap-2 border-b border-[#00D4FF]/20 pb-3">
            <div className="w-2 h-2 bg-[#EF4444] rounded-full animate-pulse"></div>
            LIVE ANOMALY FEED
          </h3>
          
          <div className="space-y-5">
            <div className="animate-[blinkData_4s_infinite]">
              <div className="flex justify-between items-center text-[9px] text-[#EF4444] mb-1.5 font-bold">
                <span className="tracking-widest">CRITICAL ALERT</span>
                <span>0.2s AGO</span>
              </div>
              <p className="text-[10px] text-[#00D4FF]/80 leading-relaxed">MPL-452: Fund mismatch detected in Dehradun sector.</p>
            </div>

            <div className="animate-[blinkData_5s_infinite]">
              <div className="flex justify-between items-center text-[9px] text-[#F59E0B] mb-1.5 font-bold">
                <span className="tracking-widest">WARNING</span>
                <span>12s AGO</span>
              </div>
              <p className="text-[10px] text-[#00D4FF]/80 leading-relaxed">MPL-891: Execution delay exceeds threshold by 48 days.</p>
            </div>

            <div className="animate-[blinkData_6s_infinite]">
              <div className="flex justify-between items-center text-[9px] text-[#00D4FF] mb-1.5 font-bold">
                <span className="tracking-widest">INFO</span>
                <span>45s AGO</span>
              </div>
              <p className="text-[10px] text-[#00D4FF]/60 leading-relaxed">System successfully audited 142 payment records.</p>
            </div>
          </div>
        </div>

        {/* System Stats Card */}
        <div 
          className="border border-[#00D4FF]/30 bg-[#020b14]/80 p-5 backdrop-blur-md shadow-[0_0_20px_rgba(0,212,255,0.05)]"
          style={{ animation: 'textTyping 10s steps(40, end) infinite' }}
        >
          <h3 className="text-[10px] font-bold text-[#00D4FF] mb-4 tracking-[0.2em] border-b border-[#00D4FF]/20 pb-3">AI RISK ENGINE</h3>
          <div className="space-y-4">
            <div className="flex justify-between text-[10px] text-[#00D4FF]">
              <span className="opacity-70">FRAUD MODEL</span>
              <span className="text-[#22C55E] font-bold">v4.1.2</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#00D4FF]">
              <span className="opacity-70">CONFIDENCE</span>
              <span className="font-bold">94.8%</span>
            </div>
            <div className="flex justify-between text-[10px] text-[#00D4FF]">
              <span className="opacity-70">NODES ACTIVE</span>
              <span className="font-bold">247/250</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

const BottomStatusBar = () => (
  <div className="absolute bottom-0 left-0 w-full flex justify-between items-center px-4 py-1 border-t border-[#00D4FF]/20 bg-[#020b14] z-20 text-[9px] tracking-widest text-[#00D4FF]/60 font-mono">
    <div className="flex gap-4">
      <span>NODES: 247</span>
      <span className="text-[#F59E0B]">ALERTS: 3 ACTIVE</span>
      <span>PROJECTS: 1,842</span>
      <span>COVERAGE: 84.2%</span>
    </div>
    <div className="hidden sm:flex gap-4">
      <span>ENC: TLS 1.3</span>
      <span>GOV-CERT v4.1</span>
      <span>© 2026</span>
    </div>
  </div>
);

const playAccessGrantedSound = () => {
  // Sound disabled per user request
};

const playErrorSound = () => {
  // Sound disabled per user request
};

const LoginCard = ({ onLogin }) => {
  const [role, setRole] = useState('District Authority');
  const [username, setUsername] = useState('district.demo');
  const [password, setPassword] = useState('demo123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const roles = [
    { name: 'Member of Parliament', mockUser: 'mp.demo' },
    { name: 'District Authority', mockUser: 'district.demo' }
  ];

  const handleRoleChange = (e) => {
    const selected = e.target.value;
    setRole(selected);
    const mockUser = roles.find(r => r.name === selected)?.mockUser;
    setUsername(mockUser || '');
    setPassword('demo123');
    setError('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!username || !password) {
      setError("ENTER CREDENTIALS");
      playErrorSound();
      return;
    }

    if (password !== 'demo123') {
      setError('ERR: INVALID SECURE CODE');
      playErrorSound();
      return;
    }

    setError('');
    setIsLoading(true);
    playAccessGrantedSound();

    setTimeout(() => {
      setIsLoading(false);
      let formattedRole = 'district';
      if (role === 'Member of Parliament') formattedRole = 'mp';
      onLogin({ username, role: formattedRole, name: role });
    }, 1500);
  };

  return (
    <div className="w-full max-w-[400px] relative z-10 font-mono">
      {/* Corner Brackets */}
      <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-[#00D4FF]"></div>
      <div className="absolute top-0 right-0 w-6 h-6 border-t border-r border-[#00D4FF]"></div>
      <div className="absolute bottom-0 left-0 w-6 h-6 border-b border-l border-[#00D4FF]"></div>
      <div className="absolute bottom-0 right-0 w-6 h-6 border-b border-r border-[#00D4FF]"></div>
      
      {/* Container */}
      <div className="bg-[#020b14]/80 backdrop-blur-md border border-[#00D4FF]/20 p-8 pt-10 shadow-[0_0_30px_rgba(0,212,255,0.05)]">
        
        {/* Branding */}
        <style>{`
          @keyframes flipDiamond {
            0% { transform: rotate(45deg) rotateY(0deg); box-shadow: 0 0 15px rgba(0,212,255,0.2); border-color: rgba(0,212,255,0.4); }
            50% { transform: rotate(45deg) rotateY(180deg); box-shadow: 0 0 40px rgba(0,212,255,0.8); border-color: rgba(0,212,255,1); }
            100% { transform: rotate(45deg) rotateY(360deg); box-shadow: 0 0 15px rgba(0,212,255,0.2); border-color: rgba(0,212,255,0.4); }
          }
          @keyframes textTyping {
            0% { clip-path: inset(0 100% 0 0); }
            15%, 85% { clip-path: inset(0 0 0 0); }
            100% { clip-path: inset(0 100% 0 0); }
          }
          @keyframes textPulse {
            0%, 100% { opacity: 1; text-shadow: 0 0 10px rgba(0, 212, 255, 0.2); }
            50% { opacity: 0.8; text-shadow: 0 0 25px rgba(0, 212, 255, 0.8); }
          }
        `}</style>
        <div className="flex flex-col items-center mb-8">
          <div className="relative mb-6" style={{ perspective: '1000px' }}>
            <div 
              className="w-16 h-16 border bg-[#00D4FF]/5 flex items-center justify-center"
              style={{ animation: 'flipDiamond 4s ease-in-out infinite', transformStyle: 'preserve-3d' }}
            >
              <div style={{ transform: 'rotate(-45deg)' }}>
                <Shield size={24} className="text-[#00D4FF]" />
              </div>
            </div>
          </div>
          <h2 
            className="text-xl font-bold text-[#F8FAFC] tracking-[0.3em] uppercase"
            style={{ animation: 'textTyping 6s steps(30, end) infinite, textPulse 3s infinite 1.5s' }}
          >CIVICSHIELD</h2>
          <p 
            className="text-[9px] text-[#00D4FF]/70 mt-2 tracking-[0.2em] uppercase"
            style={{ animation: 'textTyping 8s steps(40, end) infinite' }}
          >MPLADS FRAUD DETECTION</p>
        </div>

        {/* Warning Badge */}
        <div 
          className="border border-[#F59E0B]/50 bg-[#F59E0B]/10 p-2 mb-8 flex items-center justify-center gap-2"
          style={{ animation: 'textTyping 4s steps(20, end) infinite' }}
        >
          <AlertTriangle size={12} className="text-[#F59E0B]" />
          <span className="text-[9px] text-[#F59E0B] tracking-[0.1em] uppercase font-bold">AUTHORIZED PERSONNEL ONLY</span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="text-[10px] text-[#EF4444] text-center animate-pulse tracking-widest border border-[#EF4444]/30 p-2 bg-[#EF4444]/10">
              {error}
            </div>
          )}

          <div>
            <label className="block text-[9px] font-bold text-[#00D4FF]/80 mb-2 tracking-[0.2em] uppercase">CLEARANCE (ROLE)</label>
            <select 
              value={role} 
              onChange={handleRoleChange}
              className="block w-full bg-transparent border border-[#00D4FF]/30 text-[#00D4FF] rounded-none py-2.5 px-3 focus:outline-none focus:border-[#00D4FF] text-[10px] tracking-widest appearance-none cursor-pointer hover:bg-[#00D4FF]/5 transition-colors uppercase"
              disabled={isLoading}
            >
              {roles.map(r => <option key={r.name} value={r.name} className="bg-[#020b14]">{r.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-[#00D4FF]/80 mb-2 tracking-[0.2em] uppercase">OFFICER ID / USERNAME</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-3.5 w-3.5 text-[#00D4FF]/50" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full bg-transparent border border-[#00D4FF]/30 text-[#00D4FF] rounded-none py-2.5 pl-10 pr-3 focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_10px_rgba(0,212,255,0.1)] text-[10px] tracking-widest placeholder-[#00D4FF]/30 transition-all uppercase"
                placeholder="ENTER OFFICER ID"
                disabled={isLoading}
              />
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-bold text-[#00D4FF]/80 mb-2 tracking-[0.2em] uppercase">ACCESS CODE</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-3.5 w-3.5 text-[#00D4FF]/50" />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full bg-transparent border border-[#00D4FF]/30 text-[#00D4FF] rounded-none py-2.5 pl-10 pr-10 focus:outline-none focus:border-[#00D4FF] focus:shadow-[0_0_10px_rgba(0,212,255,0.1)] text-[10px] tracking-widest placeholder-[#00D4FF]/30 transition-all"
                placeholder="ENTER ACCESS CODE"
                disabled={isLoading}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#00D4FF]/50 hover:text-[#00D4FF] focus:outline-none transition-colors"
                disabled={isLoading}
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center items-center gap-3 py-3 border border-[#00D4FF] text-[10px] font-bold text-[#00D4FF] hover:bg-[#00D4FF]/10 hover:shadow-[0_0_15px_rgba(0,212,255,0.2)] focus:outline-none uppercase tracking-[0.3em] transition-all mt-4"
          >
            {isLoading ? (
              <span className="flex items-center gap-2"><div className="w-3 h-3 border-2 border-[#00D4FF] border-t-transparent rounded-full animate-spin"></div> DECRYPTING...</span>
            ) : (
              <span className="flex items-center gap-2"><Hexagon size={14} /> SECURE LOGIN</span>
            )}
          </button>
        </form>

        <div className="mt-10 flex justify-between items-center border-t border-[#00D4FF]/20 pt-4 text-[8px] tracking-widest">
          <span className="text-[#00D4FF]/50 uppercase">MINISTRY OF STATISTICS</span>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 bg-[#22C55E] rounded-full"></div>
            <span className="text-[#22C55E] uppercase">ENCRYPTED</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main Page Component ---

const startAmbientRadarSound = () => {
  // Sound disabled per user request
};

export default function Login({ onLogin }) {
  useEffect(() => {
    return () => {
      // Cleanup when navigating away
      if (window.radarInterval) {
        clearInterval(window.radarInterval);
      }
      window.radarSoundPlaying = false;
    };
  }, []);
  return (
    <div 
      onClick={startAmbientRadarSound} 
      className="h-screen w-full bg-[#020b14] font-mono text-[#00D4FF] relative overflow-hidden flex flex-col selection:bg-[#00D4FF]/30"
    >
      {/* Background Grid Pattern */}
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'linear-gradient(rgba(0, 212, 255, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(0, 212, 255, 0.2) 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>
      
      {/* Background City Silhouette (Optional aesthetic touch) */}
      <div className="absolute bottom-0 left-0 w-full h-32 opacity-10 pointer-events-none flex items-end justify-between px-10">
         {/* Simple abstract blocks representing buildings */}
         <div className="w-16 h-24 border border-[#00D4FF]"></div>
         <div className="w-12 h-32 border border-[#00D4FF]"></div>
         <div className="w-20 h-16 border border-[#00D4FF]"></div>
         <div className="w-14 h-28 border border-[#00D4FF]"></div>
         <div className="w-24 h-20 border border-[#00D4FF]"></div>
         <div className="w-10 h-10 border border-[#00D4FF]"></div>
         <div className="w-32 h-14 border border-[#00D4FF]"></div>
      </div>

      <TopNavBar />
      
      <div className="flex-1 flex w-full h-full relative pt-16 pb-8">
        <RadarPanel />
        <div className="w-full lg:w-[40%] flex items-center justify-center p-8 z-10">
          <LoginCard onLogin={onLogin} />
        </div>
      </div>

      <BottomStatusBar />
    </div>
  );
}
