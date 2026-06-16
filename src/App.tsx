import React, { useState, useEffect } from 'react';
import { Worker, DailyYield, Sale } from './types';
import { initAuth, googleSignIn, logout } from './utils/firebaseAuth';
import DashboardView from './components/DashboardView';
import WorkersView from './components/WorkersView';
import HarvestYieldView from './components/HarvestYieldView';
import SalesView from './components/SalesView';
import AuthModal from './components/AuthModal';
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  ClipboardList, 
  TrendingUp, 
  CloudSun,
  Leaf,
  Info,
  CalendarCheck,
  CheckCircle,
  FileSpreadsheet
} from 'lucide-react';

export default function App() {
  // 1. Core States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'workers' | 'yield' | 'sales'>('dashboard');
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [yields, setYields] = useState<DailyYield[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Database Connection Status State
  const [mongoStatus, setMongoStatus] = useState<{
    connected: boolean;
    provider: 'mongodb' | 'file_fallback';
    uriConfigured: boolean;
    loading: boolean;
  }>({
    connected: false,
    provider: 'file_fallback',
    uriConfigured: false,
    loading: true
  });

  // Computed role values
  const allowedEditors = ['yougrajbora1@gmail.com', 'yougrajbora.developer@gmail.com'];
  const isEditor = currentUserEmail !== null && allowedEditors.includes(currentUserEmail.toLowerCase().trim());

  // 1.5 Setup Auth Persistence listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUserEmail(user.email);
      },
      () => {
        setCurrentUserEmail(null);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleHeaderLogin = () => {
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (email: string, token: string | null) => {
    setCurrentUserEmail(email);
  };

  const handleHeaderLogout = async () => {
    try {
      await logout();
      setCurrentUserEmail(null);
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  // 2. Load Initially and setup status syncing
  const loadData = async () => {
    try {
      const res = await fetch('/api/data');
      if (res.ok) {
        const body = await res.json();
        setWorkers(body.workers || []);
        setYields(body.yields || []);
        setSales(body.sales || []);
        
        // Cache to localstorage as standard client-side safeguard
        localStorage.setItem('estate_workers', JSON.stringify(body.workers || []));
        localStorage.setItem('estate_yields', JSON.stringify(body.yields || []));
        localStorage.setItem('estate_sales', JSON.stringify(body.sales || []));

        setMongoStatus({
          connected: body.mongoConnected,
          provider: body.mongoConnected ? 'mongodb' : 'file_fallback',
          uriConfigured: body.mongoConnected || !body.fallbackUsed,
          loading: false
        });
      } else {
        throw new Error("HTTP error: " + res.status);
      }
    } catch (err) {
      console.error("Failed to load data from web service:", err);
      // Fail back to local variables cached previously
      const savedWorkers = localStorage.getItem('estate_workers');
      const savedYields = localStorage.getItem('estate_yields');
      const savedSales = localStorage.getItem('estate_sales');
      setWorkers(savedWorkers ? JSON.parse(savedWorkers) : []);
      setYields(savedYields ? JSON.parse(savedYields) : []);
      setSales(savedSales ? JSON.parse(savedSales) : []);

      setMongoStatus({
        connected: false,
        provider: 'file_fallback',
        uriConfigured: false,
        loading: false
      });
    }
  };

  const checkStatus = async () => {
    try {
      const res = await fetch('/api/status');
      if (res.ok) {
        const body = await res.json();
        setMongoStatus({
          connected: body.connected,
          provider: body.provider,
          uriConfigured: body.uriConfigured,
          loading: false
        });
      }
    } catch (e) {
      console.error("Express API offline:", e);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(checkStatus, 15000);
    return () => clearInterval(interval);
  }, []);



  // 4. CRUD handlers executing on Backend Express Service with client-side optimistic UI updates
  const handleAddWorker = async (w: Omit<Worker, 'id' | 'createdAt'>) => {
    const newW: Worker = {
      ...w,
      id: `w-${Date.now()}`,
      createdAt: new Date().toISOString().split('T')[0]
    };
    
    // Optimistic UI updates
    const updated = [...workers, newW];
    setWorkers(updated);
    localStorage.setItem('estate_workers', JSON.stringify(updated));

    try {
      await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newW)
      });
    } catch (err) {
      console.error("Express API post workers failure:", err);
    }
  };

  const handleUpdateWorker = async (updated: Worker) => {
    const updatedList = workers.map(w => w.id === updated.id ? updated : w);
    setWorkers(updatedList);
    localStorage.setItem('estate_workers', JSON.stringify(updatedList));

    try {
      await fetch('/api/workers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error("Express API post worker update failure:", err);
    }
  };

  const handleAddYield = async (record: Omit<DailyYield, 'id'>) => {
    const newY: DailyYield = {
      ...record,
      id: `y-${Date.now()}`
    };
    
    const updatedList = [...yields, newY];
    setYields(updatedList);
    localStorage.setItem('estate_yields', JSON.stringify(updatedList));

    try {
      await fetch('/api/yields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newY)
      });
    } catch (err) {
      console.error("Express API post yields failure:", err);
    }
  };

  const handleUpdateYieldStatus = async (id: string, status: 'Paid' | 'Pending') => {
    const target = yields.find(y => y.id === id);
    if (!target) return;
    const updated = { ...target, paymentStatus: status };

    const updatedList = yields.map(y => y.id === id ? updated : y);
    setYields(updatedList);
    localStorage.setItem('estate_yields', JSON.stringify(updatedList));

    try {
      await fetch('/api/yields', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated)
      });
    } catch (err) {
      console.error("Express API post yield status update failure:", err);
    }
  };

  const handleDeleteYield = async (id: string) => {
    const updatedList = yields.filter(y => y.id !== id);
    setYields(updatedList);
    localStorage.setItem('estate_yields', JSON.stringify(updatedList));

    try {
      await fetch(`/api/yields/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Express API delete yield failure:", err);
    }
  };

  const handleAddSale = async (s: Omit<Sale, 'id'>) => {
    const newS: Sale = {
      ...s,
      id: `s-${Date.now()}`
    };

    const updatedList = [...sales, newS];
    setSales(updatedList);
    localStorage.setItem('estate_sales', JSON.stringify(updatedList));

    try {
      await fetch('/api/sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newS)
      });
    } catch (err) {
      console.error("Express API post sale failure:", err);
    }
  };

  const handleDeleteSale = async (id: string) => {
    const updatedList = sales.filter(s => s.id !== id);
    setSales(updatedList);
    localStorage.setItem('estate_sales', JSON.stringify(updatedList));

    try {
      await fetch(`/api/sales/${id}`, {
        method: 'DELETE'
      });
    } catch (err) {
      console.error("Express API delete sale failure:", err);
    }
  };

  const handleImportAllData = async (backup: { workers: Worker[]; yields: DailyYield[]; sales: Sale[] }) => {
    setWorkers(backup.workers || []);
    setYields(backup.yields || []);
    setSales(backup.sales || []);
    localStorage.setItem('estate_workers', JSON.stringify(backup.workers || []));
    localStorage.setItem('estate_yields', JSON.stringify(backup.yields || []));
    localStorage.setItem('estate_sales', JSON.stringify(backup.sales || []));

    try {
      await fetch('/api/data/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(backup)
      });
    } catch (err) {
      console.error("Express API post import failure:", err);
    }
  };

  const handleWipeAllData = async () => {
    setWorkers([]);
    setYields([]);
    setSales([]);
    localStorage.setItem('estate_workers', JSON.stringify([]));
    localStorage.setItem('estate_yields', JSON.stringify([]));
    localStorage.setItem('estate_sales', JSON.stringify([]));

    try {
      await fetch('/api/data/wipe', {
        method: 'POST'
      });
    } catch (err) {
      console.error("Express API post wipe failure:", err);
    }
  };



  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-800" id="main-app-container">
      {/* 1. Sidebar Navigation - Desktop */}
      <aside className="w-64 bg-leaf-900 text-white flex-col hidden lg:flex shrink-0 border-r border-leaf-800">
        <div className="p-6 border-b border-leaf-800 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center text-emerald-950 font-bold shadow-inner text-base">
            🍃
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">TeaFlow Manager</h1>
            <p className="text-[10px] text-leaf-300 font-mono tracking-wider">VALLEY MOSS ESTATES</p>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === 'dashboard'
                ? 'bg-leaf-800/60 border-r-4 border-emerald-400 text-white'
                : 'text-leaf-100 hover:bg-leaf-800/30'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 opacity-85 text-emerald-400" /> Operations
          </button>

          <button
            onClick={() => setActiveTab('workers')}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === 'workers'
                ? 'bg-leaf-800/60 border-r-4 border-emerald-400 text-white'
                : 'text-leaf-100 hover:bg-leaf-800/30'
            }`}
          >
            <Users className="w-4 h-4 opacity-85 text-emerald-400" /> Employees
          </button>

          <button
            onClick={() => setActiveTab('yield')}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === 'yield'
                ? 'bg-leaf-800/60 border-r-4 border-emerald-400 text-white'
                : 'text-leaf-100 hover:bg-leaf-800/30'
            }`}
          >
            <ClipboardList className="w-4 h-4 opacity-85 text-emerald-400" /> Harvest Ledger
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === 'sales'
                ? 'bg-leaf-800/60 border-r-4 border-emerald-400 text-white'
                : 'text-leaf-100 hover:bg-leaf-800/30'
            }`}
          >
            <TrendingUp className="w-4 h-4 opacity-85 text-emerald-400" /> Sales Ledger
          </button>
        </nav>

        <div className="p-6 mt-auto border-t border-leaf-800 bg-leaf-950/45">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-leaf-800 border border-leaf-700 flex items-center justify-center font-bold text-sm text-leaf-200">
              EA
            </div>
            <div>
              <p className="text-xs font-semibold text-white">Estate Admin</p>
              <p className="text-[10px] text-leaf-300">Upper Assam Sector</p>
            </div>
          </div>
        </div>
      </aside>

      {/* 2. Responsive Mobile Sidedrawer/Menu overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex lg:hidden" id="mobile-navigation-drawer">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-xs" onClick={() => setMobileMenuOpen(false)} />
          <aside className="relative w-64 max-w-[280px] bg-leaf-900 text-white h-full flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="p-6 border-b border-leaf-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center text-emerald-950 font-bold shadow-inner text-base">
                  🍃
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white tracking-tight">TeaFlow Manager</h1>
                  <p className="text-[9px] text-leaf-300 font-mono tracking-wider">VALLEY MOSS</p>
                </div>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-white hover:text-gray-300 p-1 font-bold">
                ✕
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-1">
              <button
                onClick={() => { setActiveTab('dashboard'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === 'dashboard'
                    ? 'bg-leaf-800/80 border-r-4 border-emerald-400 text-white'
                    : 'text-leaf-100 hover:bg-leaf-800/30'
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" /> Operations
              </button>

              <button
                onClick={() => { setActiveTab('workers'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === 'workers'
                    ? 'bg-leaf-800/80 border-r-4 border-emerald-400 text-white'
                    : 'text-leaf-100 hover:bg-leaf-800/30'
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" /> Employees
              </button>

              <button
                onClick={() => { setActiveTab('yield'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === 'yield'
                    ? 'bg-leaf-800/80 border-r-4 border-emerald-400 text-white'
                    : 'text-leaf-100 hover:bg-leaf-800/30'
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-400" /> Harvest Ledger
              </button>

              <button
                onClick={() => { setActiveTab('sales'); setMobileMenuOpen(false); }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === 'sales'
                    ? 'bg-leaf-800/80 border-r-4 border-emerald-400 text-white'
                    : 'text-leaf-100 hover:bg-leaf-800/30'
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Sales Ledger
              </button>
            </nav>

            <div className="p-6 mt-auto border-t border-leaf-800 bg-leaf-950/45">
              <p className="text-xs font-semibold text-white">Estate Admin</p>
              <p className="text-[10px] text-leaf-300">Upper Assam Sector</p>
            </div>
          </aside>
        </div>
      )}

      {/* Main Panel Content Area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-x-hidden lg:h-screen lg:overflow-y-auto">
        {/* Top Header Bar */}
        <header className="min-h-16 bg-white border-b border-gray-200 flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 px-4 sm:px-8 shrink-0 shadow-2xs gap-3">
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-3">
              {/* Mobile/Tablet Hamburger menu */}
              <button 
                onClick={() => setMobileMenuOpen(true)}
                className="lg:hidden p-1.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-700 hover:bg-gray-100 cursor-pointer text-base"
              >
                ☰
              </button>
              <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500 font-sans">
                <span>Assam Sector</span>
                <span>/</span>
                <span className="text-gray-950 font-semibold uppercase tracking-wider text-[11px]">
                  {activeTab === 'dashboard' ? 'Daily Management Overview' : `${activeTab} Management`}
                </span>
              </div>
            </div>

            {/* Mobile-only view status mini badge */}
            <div className="flex sm:hidden items-center gap-1.5">
              {isEditor ? (
                <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded border border-emerald-200">
                  Editor
                </span>
              ) : (
                <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200">
                  Spectator
                </span>
              )}
            </div>
          </div>

          {/* Interactive Live Login / Identity Control Widget */}
          <div className="flex items-center flex-wrap gap-2 text-xs font-sans w-full sm:w-auto justify-end">
            {currentUserEmail ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-1 px-2.5 rounded-lg max-w-full overflow-hidden">
                <div className="flex flex-col text-right">
                  <span className="text-[9px] font-mono leading-none text-slate-400">User:</span>
                  <span className="text-[10px] font-semibold text-slate-800 truncate max-w-[120px] sm:max-w-[180px]" title={currentUserEmail}>
                    {currentUserEmail}
                  </span>
                </div>
                {isEditor ? (
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-150 text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-help shadow-3xs uppercase" title="Validated Valley Moss Editor credentials">
                    Editor
                  </span>
                ) : (
                  <span className="bg-amber-50 text-amber-800 border border-amber-150 text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-help shadow-3xs" title="View-Only: Login under approved emails to manage ledger">
                    Spectator
                  </span>
                )}
                <button
                  onClick={handleHeaderLogout}
                  className="p-1 px-1.5 hover:bg-slate-200 text-slate-600 rounded text-[9px] uppercase tracking-wider font-bold cursor-pointer transition border border-slate-200"
                >
                  Logout
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-500 font-sans hidden lg:inline">
                  Spectator Mode active. Log In with approved account to edit:
                </span>
                <button
                  onClick={handleHeaderLogin}
                  className="px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-lg text-[10px] font-bold font-sans transition flex items-center justify-center gap-1 cursor-pointer shadow-3xs"
                >
                  🔒 Editor Sign In
                </button>
              </div>
            )}

            {/* MongoDB Atlas Status Pill */}
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-semibold border shadow-3xs transition-all duration-300 ${
              mongoStatus.connected
                ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                : mongoStatus.uriConfigured
                ? 'bg-amber-50 text-amber-800 border-amber-250 animate-pulse'
                : 'bg-slate-50 text-slate-705 border-slate-200'
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${
                mongoStatus.connected 
                  ? 'bg-emerald-500 animate-ping' 
                  : mongoStatus.uriConfigured 
                  ? 'bg-amber-500 animate-bounce' 
                  : 'bg-slate-400 font-bold'
              }`}></div>
              <span>
                {mongoStatus.connected 
                  ? 'MongoDB Atlas (Live)' 
                  : mongoStatus.uriConfigured 
                  ? 'Connecting Mongo...' 
                  : 'Local File Fallback'}
              </span>
            </div>
          </div>
        </header>

        {/* Content View Area */}
        <div className="p-4 sm:p-8 flex-1 flex flex-col gap-6" id="view-stage">
          {/* MongoDB Offline Configuration Warning Alert */}
          {!mongoStatus.connected && (
            <div className="bg-slate-900 text-white rounded-xl p-5 border border-slate-800 shadow-md flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in duration-500">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-emerald-400 text-sm">🍃</span>
                  <h4 className="text-[10px] font-bold font-sans uppercase tracking-widest text-slate-300">
                    MongoDB Database Cluster Configured
                  </h4>
                  <span className="text-[8px] bg-emerald-950 text-emerald-300 font-mono font-semibold px-2 py-0.5 rounded-full border border-emerald-900 uppercase">
                    Ready for connection
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed font-sans max-w-3xl">
                  This application now supports persistent data storage inside your custom <strong className="text-white">MongoDB Atlas Database Cluster</strong>. Currently, the server is running in <strong className="text-white">Local File Fallback Mode</strong> using server-side local storage. To connect your cluster, configure the <code className="bg-slate-800 px-1 py-0.5 rounded font-mono text-[10px] text-emerald-400">MONGODB_URI</code> connection string variable in the Settings panel of Google AI Studio.
                </p>
              </div>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText("MONGODB_URI");
                  alert("Copied environmental secret variable name to clipboard: 'MONGODB_URI'");
                }}
                className="shrink-0 flex items-center justify-center px-4 py-2 bg-slate-800 hover:bg-slate-750 transition border border-slate-700/80 rounded-lg select-none font-mono text-[10px] text-emerald-400 font-semibold cursor-pointer gap-1"
                title="Copy Variable Name"
              >
                MONGODB_URI 📋
              </button>
            </div>
          )}
          {/* Spectator Guard Warning Banner */}
          {!isEditor && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-3xs animate-in slide-in-from-top duration-300" id="spectator-badge-alert">
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 text-sm">
                  🔒
                </div>
                <div>
                  <h4 className="text-xs sm:text-xs font-bold text-amber-900 font-sans uppercase tracking-wider">Valley Moss Ledger View-Only Mode</h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-sans mt-0.5">
                    {currentUserEmail ? (
                      <>Account <strong className="font-mono text-amber-900 font-semibold">{currentUserEmail}</strong> has read-only access. Only authorized managers (<code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[10px]">yougrajbora1@gmail.com</code> or <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[10px]">yougrajbora.developer@gmail.com</code>) can create logs or edit worker states.</>
                    ) : (
                      <>Spectator view. Log in with an approved manager credential to register pluckers, record yields, or finalize trades.</>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2 self-stretch sm:self-center shrink-0">
                {!currentUserEmail && (
                  <button 
                    onClick={handleHeaderLogin}
                    className="w-full sm:w-auto px-4 py-1.5 bg-amber-800 hover:bg-amber-900 text-white font-semibold text-xs rounded-lg transition shadow-3xs cursor-pointer text-center"
                  >
                    Authenticate
                  </button>
                )}
                <span className="hidden sm:inline-flex items-center text-[9px] font-mono font-bold tracking-widest text-amber-500 border border-amber-250 uppercase bg-amber-50 px-1.5 py-0.5 rounded">
                  Spectator Profile
                </span>
              </div>
            </div>
          )}

          {/* Render screens depending on tab selection */}
          {activeTab === 'dashboard' && (
            <DashboardView 
              workers={workers} 
              yields={yields} 
              sales={sales} 
              onNavigate={(view) => setActiveTab(view)}
            />
          )}

          {activeTab === 'workers' && (
            <WorkersView 
              workers={workers} 
              yields={yields} 
              onAddWorker={handleAddWorker} 
              onUpdateWorker={handleUpdateWorker}
              canEdit={isEditor}
            />
          )}

          {activeTab === 'yield' && (
            <HarvestYieldView 
              workers={workers} 
              yields={yields} 
              onAddYield={handleAddYield}
              onUpdateYieldStatus={handleUpdateYieldStatus}
              onDeleteYield={handleDeleteYield}
              canEdit={isEditor}
            />
          )}

          {activeTab === 'sales' && (
            <SalesView 
              sales={sales} 
              onAddSale={handleAddSale} 
              onDeleteSale={handleDeleteSale}
              canEdit={isEditor}
            />
          )}
        </div>

        {/* Corporate footer, clean and humble */}
        <footer className="bg-white border-t border-gray-150 py-4 px-8 text-[11px] text-gray-400 mt-auto font-sans flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-emerald-800">Valley Moss Estates</span>
            <span>© 2026 Commercial Leaf Ledger</span>
          </div>
          <span className="font-mono text-3xs">Version 3.2.1 • GIS Platform</span>
        </footer>
      </div>

      {/* Interactive identity gating modal */}
      <AuthModal 
        isOpen={authModalOpen} 
        onClose={() => setAuthModalOpen(false)} 
        onAuthSuccess={handleAuthSuccess} 
      />
    </div>
  );
}
