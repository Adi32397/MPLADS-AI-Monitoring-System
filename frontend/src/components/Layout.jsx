import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, AlertTriangle, Search, Activity, 
  Map, FileText, Settings, LogOut, ShieldAlert, BarChart3, Copy,
  Info, Github, Linkedin
} from 'lucide-react';
import CivicShieldChat from './CivicShieldChat';
import { useFinancialYear } from '../context/FinancialYearContext';

export default function Layout({ user, onLogout }) {
  const location = useLocation();
  const { financialYear, setFinancialYear, availableYears } = useFinancialYear();

  const getNavItems = (role) => {
    switch (role) {
      case 'mp':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'My Projects', path: '/projects', icon: Search },
          { name: 'AI Insights', path: '/anomalies', icon: AlertTriangle },
          { name: 'Fund Utilization', path: '/utilization', icon: BarChart3 },
          { name: 'Delayed Projects', path: '/delayed', icon: Activity },
          { name: 'High-Risk Projects', path: '/high-risk', icon: AlertTriangle },
          { name: 'Alerts', path: '/alerts', icon: ShieldAlert },
          { name: 'About Developer', path: '/about', icon: Info },
        ];
      case 'district':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'AI Anomaly Detection', path: '/anomalies', icon: AlertTriangle },
          { name: 'Duplicate Detection', path: '/duplicates', icon: Copy },
          { name: 'All Projects', path: '/projects', icon: Search },
          { name: 'Financial Monitoring', path: '/utilization', icon: BarChart3 },
          { name: 'Verification Queue', path: '/verification', icon: Activity },
          { name: 'Alerts Center', path: '/alerts', icon: ShieldAlert },
          { name: 'Geographic Risk', path: '/geographic', icon: Map },
          { name: 'About Developer', path: '/about', icon: Info },
        ];
      case 'state':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'District Performance', path: '#', icon: Activity },
          { name: 'Project Monitoring', path: '/projects', icon: Search },
          { name: 'AI Risk Intelligence', path: '/anomalies', icon: AlertTriangle },
          { name: 'Duplicate Detection', path: '/duplicates', icon: Copy },
          { name: 'Geographic Risk', path: '#', icon: Map },
          { name: 'Fund Utilization', path: '/utilization', icon: BarChart3 },
          { name: 'Alerts & Escalations', path: '/alerts', icon: ShieldAlert },
          { name: 'About Developer', path: '/about', icon: Info },
        ];
      case 'ministry':
        return [
          { name: 'Dashboard', path: '/', icon: LayoutDashboard },
          { name: 'National Overview', path: '#', icon: Activity },
          { name: 'State Performance', path: '#', icon: BarChart3 },
          { name: 'AI Risk Intelligence', path: '/anomalies', icon: AlertTriangle },
          { name: 'Geographic Risk', path: '#', icon: Map },
          { name: 'Financial Analytics', path: '#', icon: BarChart3 },
          { name: 'Trend Analysis', path: '#', icon: Activity },
          { name: 'Alerts & Escalations', path: '/alerts', icon: ShieldAlert },
          { name: 'About Developer', path: '/about', icon: Info },
        ];
      default:
        return [];
    }
  };

  const navItems = getNavItems(user?.role);

  const getHeaderContext = (role) => {
    switch (role) {
      case 'mp': return 'Constituency: Example Constituency';
      case 'district': return 'District: Dehradun';
      case 'state': return 'State: Uttarakhand';
      case 'ministry': return 'Scope: National';
      default: return '';
    }
  };

  const getRoleTitle = (role) => {
    switch (role) {
      case 'mp': return 'Member of Parliament';
      case 'district': return 'District Authority';
      case 'state': return 'State Nodal Authority';
      case 'ministry': return 'Ministry';
      default: return 'User';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-primary text-slate-300 flex flex-col hidden md:flex">
        <div className="p-5 border-b border-primary-light/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-12 rounded-lg bg-gradient-to-b from-amber-500/10 via-slate-900/90 to-slate-950 border border-amber-500/30 flex items-center justify-center p-1 shadow-inner shrink-0">
              <img 
                src="/civicshield-logo.png" 
                alt="CivicShield Emblem" 
                className="max-h-full max-w-full object-contain filter drop-shadow-[0_2px_6px_rgba(251,191,36,0.3)]" 
              />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-wide leading-tight">
                CivicShield
              </h1>
              <p className="text-[10px] text-accent-light font-semibold tracking-wider uppercase mt-0.5">MPLADS Intelligence</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                (item.path === '/' ? location.pathname === `/${user?.role}/dashboard` : location.pathname === item.path) 
                  ? 'bg-accent/20 text-white font-medium' 
                  : 'hover:bg-primary-light hover:text-white'
              }`}
            >
              <item.icon size={18} className={(item.path === '/' ? location.pathname === `/${user?.role}/dashboard` : location.pathname === item.path) ? 'text-accent-light' : ''} />
              {item.name}
            </Link>
          ))}
        </nav>
        
        {/* Creator Info Card in Panel */}
        <div className="mx-3 my-2 p-3 rounded-xl bg-slate-900/95 border border-slate-700/60 shadow-md">
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-amber-300 text-slate-950 font-extrabold text-xs flex items-center justify-center shrink-0 shadow">
              AS
            </div>
            <div className="overflow-hidden min-w-0">
              <Link to="/about" className="text-xs font-bold text-white hover:text-amber-400 transition-colors truncate block">
                Aditya Singh Saini
              </Link>
              <p className="text-[10px] text-amber-400 font-medium truncate">Student of UPES</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight line-clamp-2 mb-2">
            Computer Science | Full-Stack | AI & Cloud
          </p>
          <div className="flex items-center gap-1.5 pt-2 border-t border-slate-800">
            <a 
              href="https://github.com/Adi32397" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] font-medium transition-colors"
              title="GitHub Profile"
            >
              <Github size={11} /> GitHub
            </a>
            <a 
              href="https://www.linkedin.com/in/aditya-singh-saini-a3654731b/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1 py-1 px-1.5 rounded bg-[#0A66C2]/20 hover:bg-[#0A66C2]/30 text-[#38bdf8] hover:text-white text-[10px] font-medium transition-colors border border-[#0A66C2]/40"
              title="LinkedIn Profile"
            >
              <Linkedin size={11} /> LinkedIn
            </a>
          </div>
        </div>

        <div className="p-4 border-t border-primary-light">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-light font-bold">
              {user.name ? user.name.charAt(0) : 'U'}
            </div>
            <div>
              <p className="text-sm text-white font-medium">{getRoleTitle(user.role)}</p>
              <p className="text-xs text-slate-400 capitalize">{getRoleTitle(user.role)}</p>
            </div>
          </div>
          <button 
            onClick={onLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors w-full"
          >
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 z-10">
          <div className="flex items-center text-sm text-slate-500 gap-4">
            <div className="flex items-center gap-2 md:hidden">
              <img src="/civicshield-logo.png" alt="CivicShield" className="w-6 h-7 object-contain" />
              <span className="font-bold text-slate-800 text-sm tracking-wide">CivicShield</span>
              <div className="h-4 w-px bg-slate-300 ml-1"></div>
            </div>
            <div className="flex items-center">
              <span className="font-medium text-slate-700 text-xs sm:text-sm">Financial Year:</span> 
              <select 
                value={financialYear}
                onChange={(e) => setFinancialYear(e.target.value)}
                className="ml-2 bg-slate-50 border border-slate-300 hover:border-slate-400 rounded px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#1677FF] cursor-pointer text-slate-800 shadow-sm transition-all"
              >
                {availableYears.map(fy => (
                  <option key={fy} value={fy}>{fy}</option>
                ))}
              </select>
            </div>
            <div className="h-4 w-px bg-slate-300"></div>
            <div className="font-medium text-slate-700 bg-slate-100 px-3 py-1 rounded-full text-xs border border-slate-200">
              {getHeaderContext(user?.role)}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link 
              to="/about" 
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors shadow-sm"
              title="About Developer & Project"
            >
              <Info size={14} className="text-accent" />
              <span>About Developer</span>
            </Link>
            <button className="relative p-2 text-slate-400 hover:text-slate-600">
              <ShieldAlert size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-critical rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <Outlet context={{ financialYear, setFinancialYear }} />
        </main>
        
        {/* Global Chatbot Widget */}
        <CivicShieldChat user={user} />
      </div>
    </div>
  );
}
