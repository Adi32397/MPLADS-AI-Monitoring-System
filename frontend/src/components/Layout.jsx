import { Outlet, Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, AlertTriangle, Search, Activity, 
  Map, FileText, Settings, LogOut, ShieldAlert, BarChart3, Copy
} from 'lucide-react';

export default function Layout({ user, onLogout }) {
  const location = useLocation();

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard },
    { name: 'AI Anomaly Detection', path: '/anomalies', icon: AlertTriangle },
    { name: 'Duplicate Detection', path: '/duplicates', icon: Copy },
    { name: 'All Projects', path: '/projects', icon: Search },
    { name: 'Alerts Center', path: '/alerts', icon: ShieldAlert },
    { name: 'Geographic Risk', path: '#', icon: Map },
    { name: 'Analytics', path: '#', icon: BarChart3 },
    { name: 'Reports', path: '#', icon: FileText },
    { name: 'Settings', path: '#', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar */}
      <div className="w-64 bg-primary text-slate-300 flex flex-col hidden md:flex">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="text-accent-light" />
            CivicShield AI
          </h1>
          <p className="text-xs text-slate-400 mt-1">MPLADS Intelligence</p>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                location.pathname === item.path 
                  ? 'bg-accent/20 text-white font-medium' 
                  : 'hover:bg-primary-light hover:text-white'
              }`}
            >
              <item.icon size={18} className={location.pathname === item.path ? 'text-accent-light' : ''} />
              {item.name}
            </Link>
          ))}
        </nav>
        
        <div className="p-4 border-t border-primary-light">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center text-accent-light font-bold">
              {user.name.charAt(0)}
            </div>
            <div>
              <p className="text-sm text-white font-medium">{user.name}</p>
              <p className="text-xs text-slate-400 capitalize">{user.role.replace('_', ' ')}</p>
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
          <div className="flex items-center text-sm text-slate-500">
            <span className="font-medium text-slate-700">Financial Year:</span> 
            <select className="ml-2 bg-transparent border-none focus:ring-0 cursor-pointer">
              <option>2025-2026</option>
              <option>2024-2025</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 text-slate-400 hover:text-slate-600">
              <ShieldAlert size={20} />
              <span className="absolute top-1 right-1 w-2 h-2 bg-critical rounded-full"></span>
            </button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
