import React, { useState, useEffect } from "react";
import { Worker, DailyYield, Sale, SyncConfig } from "./types";
import { initAuth, googleSignIn, logout } from "./utils/firebaseAuth";
import DashboardView from "./components/DashboardView";
import WorkersView from "./components/WorkersView";
import HarvestYieldView from "./components/HarvestYieldView";
import SalesView from "./components/SalesView";
import SheetsSyncView from "./components/SheetsSyncView";
import AuthModal from "./components/AuthModal";
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
  FileSpreadsheet,
} from "lucide-react";

export default function App() {
  // 1. Core States
  const [activeTab, setActiveTab] = useState<
    "dashboard" | "workers" | "yield" | "sales" | "sync"
  >("dashboard");
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [yields, setYields] = useState<DailyYield[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);

  const [syncConfig, setSyncConfig] = useState<SyncConfig>({
    clientId:
      "920166951012-mk4j4fe0suu9be8rml96ec0vfvrrl3hf.apps.googleusercontent.com",
    spreadsheetId: "",
    spreadsheetUrl: "",
    accessToken: null,
    tokenExpiresAt: null,
    isLinked: false,
    lastSyncedAt: null,
  });

  const [currentUserEmail, setCurrentUserEmail] = useState<string | null>(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);

  // Computed role values
  const allowedEditors = [
    "yougrajbora1@gmail.com",
    "yougrajbora.developer@gmail.com",
  ];
  const isEditor =
    currentUserEmail !== null &&
    allowedEditors.includes(currentUserEmail.toLowerCase().trim());

  // 1.5 Setup Auth Persistence listener
  useEffect(() => {
    const unsubscribe = initAuth(
      (user, token) => {
        setCurrentUserEmail(user.email);
        setSyncConfig((prev) => ({
          ...prev,
          accessToken: token,
          isLinked: true,
        }));
      },
      () => {
        setCurrentUserEmail(null);
        setSyncConfig((prev) => ({
          ...prev,
          accessToken: null,
          isLinked: false,
        }));
      },
    );
    return () => unsubscribe();
  }, []);

  const handleHeaderLogin = () => {
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (email: string, token: string | null) => {
    setCurrentUserEmail(email);
    if (token) {
      handleUpdateSyncConfig({
        accessToken: token,
        isLinked: true,
      });
    }
  };

  const handleHeaderLogout = async () => {
    try {
      await logout();
      setCurrentUserEmail(null);
      handleUpdateSyncConfig({
        accessToken: null,
        isLinked: false,
      });
    } catch (e) {
      console.error("Logout error", e);
    }
  };

  // 2. Load initially from Localstorage or seed if first time ever
  useEffect(() => {
    const isInitialized = localStorage.getItem("estate_initialized");
    const savedWorkers = localStorage.getItem("estate_workers");
    const savedYields = localStorage.getItem("estate_yields");
    const savedSales = localStorage.getItem("estate_sales");
    const savedSync = localStorage.getItem("estate_sync_config");

    setWorkers(savedWorkers ? JSON.parse(savedWorkers) : []);
    setYields(savedYields ? JSON.parse(savedYields) : []);
    setSales(savedSales ? JSON.parse(savedSales) : []);
    if (!isInitialized) {
      localStorage.setItem("estate_initialized", "true");
    }

    if (savedSync) {
      try {
        const parsedSync = JSON.parse(savedSync);
        // Do not restore sensitive raw access token from localStorage for security, keep session only
        setSyncConfig({
          ...parsedSync,
          accessToken: null,
          isLinked: false,
        });
      } catch (e) {
        console.error("Failed to parse sync config");
      }
    }
  }, []);

  // 3. Persist modifications locally
  const saveWorkers = (newWorkers: Worker[]) => {
    setWorkers(newWorkers);
    localStorage.setItem("estate_workers", JSON.stringify(newWorkers));
  };

  const saveYields = (newYields: DailyYield[]) => {
    setYields(newYields);
    localStorage.setItem("estate_yields", JSON.stringify(newYields));
  };

  const saveSales = (newSales: Sale[]) => {
    setSales(newSales);
    localStorage.setItem("estate_sales", JSON.stringify(newSales));
  };

  // 4. Data Ops Event Handlers
  const handleAddWorker = (w: Omit<Worker, "id" | "createdAt">) => {
    const newW: Worker = {
      ...w,
      id: `w-${Date.now()}`,
      createdAt: new Date().toISOString().split("T")[0],
    };
    saveWorkers([...workers, newW]);
  };

  const handleUpdateWorker = (updated: Worker) => {
    saveWorkers(workers.map((w) => (w.id === updated.id ? updated : w)));
  };

  const handleAddYield = (record: Omit<DailyYield, "id">) => {
    const newY: DailyYield = {
      ...record,
      id: `y-${Date.now()}`,
    };
    saveYields([...yields, newY]);
  };

  const handleUpdateYieldStatus = (id: string, status: "Paid" | "Pending") => {
    saveYields(
      yields.map((y) => (y.id === id ? { ...y, paymentStatus: status } : y)),
    );
  };

  const handleDeleteYield = (id: string) => {
    saveYields(yields.filter((y) => y.id !== id));
  };

  const handleAddSale = (s: Omit<Sale, "id">) => {
    const newS: Sale = {
      ...s,
      id: `s-${Date.now()}`,
    };
    saveSales([...sales, newS]);
  };

  const handleDeleteSale = (id: string) => {
    saveSales(sales.filter((s) => s.id !== id));
  };

  const handleImportAllData = (backup: {
    workers: Worker[];
    yields: DailyYield[];
    sales: Sale[];
  }) => {
    saveWorkers(backup.workers);
    saveYields(backup.yields);
    saveSales(backup.sales);
  };

  const handleWipeAllData = () => {
    saveWorkers([]);
    saveYields([]);
    saveSales([]);
    localStorage.setItem("estate_initialized", "true");
  };

  const handleUpdateSyncConfig = (updates: Partial<SyncConfig>) => {
    const newConfig = { ...syncConfig, ...updates };
    setSyncConfig(newConfig);

    // Save non-sensitive metadata only in localStorage
    const savedRepresentation = {
      clientId: newConfig.clientId,
      spreadsheetId: newConfig.spreadsheetId,
      spreadsheetUrl: newConfig.spreadsheetUrl,
      lastSyncedAt: newConfig.lastSyncedAt,
    };
    localStorage.setItem(
      "estate_sync_config",
      JSON.stringify(savedRepresentation),
    );
  };

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div
      className="min-h-screen bg-slate-50 flex font-sans text-slate-800"
      id="main-app-container"
    >
      {/* 1. Sidebar Navigation - Desktop */}
      <aside className="w-64 bg-leaf-900 text-white flex-col hidden lg:flex shrink-0 border-r border-leaf-800">
        <div className="p-6 border-b border-leaf-800 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center text-emerald-950 font-bold shadow-inner text-base">
            🍃
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight">
              TeaFlow Manager
            </h1>
            <p className="text-[10px] text-leaf-300 font-mono tracking-wider">
              VALLEY MOSS ESTATES
            </p>
          </div>
        </div>

        <nav className="flex-1 py-6 space-y-1">
          <button
            onClick={() => setActiveTab("dashboard")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === "dashboard"
                ? "bg-leaf-800/60 border-r-4 border-emerald-400 text-white"
                : "text-leaf-100 hover:bg-leaf-800/30"
            }`}
          >
            <LayoutDashboard className="w-4 h-4 opacity-85 text-emerald-400" />{" "}
            Operations
          </button>

          <button
            onClick={() => setActiveTab("workers")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === "workers"
                ? "bg-leaf-800/60 border-r-4 border-emerald-400 text-white"
                : "text-leaf-100 hover:bg-leaf-800/30"
            }`}
          >
            <Users className="w-4 h-4 opacity-85 text-emerald-400" /> Employees
          </button>

          <button
            onClick={() => setActiveTab("yield")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === "yield"
                ? "bg-leaf-800/60 border-r-4 border-emerald-400 text-white"
                : "text-leaf-100 hover:bg-leaf-800/30"
            }`}
          >
            <ClipboardList className="w-4 h-4 opacity-85 text-emerald-400" />{" "}
            Harvest Ledger
          </button>

          <button
            onClick={() => setActiveTab("sales")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === "sales"
                ? "bg-leaf-800/60 border-r-4 border-emerald-400 text-white"
                : "text-leaf-100 hover:bg-leaf-800/30"
            }`}
          >
            <TrendingUp className="w-4 h-4 opacity-85 text-emerald-400" /> Sales
            Ledger
          </button>

          <button
            onClick={() => setActiveTab("sync")}
            className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider cursor-pointer ${
              activeTab === "sync"
                ? "bg-leaf-800/60 border-r-4 border-emerald-450 text-white"
                : "text-leaf-100 hover:bg-leaf-800/30"
            }`}
          >
            <FileSpreadsheet className="w-4 h-4 opacity-85 text-emerald-450" />{" "}
            Sheet Sync
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
        <div
          className="fixed inset-0 z-50 flex lg:hidden"
          id="mobile-navigation-drawer"
        >
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="relative w-64 max-w-[280px] bg-leaf-900 text-white h-full flex flex-col z-50 animate-in slide-in-from-left duration-200">
            <div className="p-6 border-b border-leaf-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-emerald-500 rounded-md flex items-center justify-center text-emerald-950 font-bold shadow-inner text-base">
                  🍃
                </div>
                <div>
                  <h1 className="text-sm font-bold text-white tracking-tight">
                    TeaFlow Manager
                  </h1>
                  <p className="text-[9px] text-leaf-300 font-mono tracking-wider">
                    VALLEY MOSS
                  </p>
                </div>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="text-white hover:text-gray-300 p-1 font-bold"
              >
                ✕
              </button>
            </div>

            <nav className="flex-1 py-6 space-y-1">
              <button
                onClick={() => {
                  setActiveTab("dashboard");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === "dashboard"
                    ? "bg-leaf-800/80 border-r-4 border-emerald-400 text-white"
                    : "text-leaf-100 hover:bg-leaf-800/30"
                }`}
              >
                <LayoutDashboard className="w-4 h-4 text-emerald-400" />{" "}
                Operations
              </button>

              <button
                onClick={() => {
                  setActiveTab("workers");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === "workers"
                    ? "bg-leaf-800/80 border-r-4 border-emerald-400 text-white"
                    : "text-leaf-100 hover:bg-leaf-800/30"
                }`}
              >
                <Users className="w-4 h-4 text-emerald-400" /> Employees
              </button>

              <button
                onClick={() => {
                  setActiveTab("yield");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === "yield"
                    ? "bg-leaf-800/80 border-r-4 border-emerald-400 text-white"
                    : "text-leaf-100 hover:bg-leaf-800/30"
                }`}
              >
                <ClipboardList className="w-4 h-4 text-emerald-400" /> Harvest
                Ledger
              </button>

              <button
                onClick={() => {
                  setActiveTab("sales");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === "sales"
                    ? "bg-leaf-800/80 border-r-4 border-emerald-400 text-white"
                    : "text-leaf-100 hover:bg-leaf-800/30"
                }`}
              >
                <TrendingUp className="w-4 h-4 text-emerald-400" /> Sales Ledger
              </button>

              <button
                onClick={() => {
                  setActiveTab("sync");
                  setMobileMenuOpen(false);
                }}
                className={`w-full text-left px-6 py-3 flex items-center gap-3 transition font-semibold text-xs uppercase tracking-wider ${
                  activeTab === "sync"
                    ? "bg-leaf-800/80 border-r-4 border-emerald-450 text-white"
                    : "text-leaf-100 hover:bg-leaf-800/30"
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 text-emerald-450" /> Sheet
                Sync
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
                  {activeTab === "dashboard"
                    ? "Daily Management Overview"
                    : `${activeTab} Management`}
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
                  <span className="text-[9px] font-mono leading-none text-slate-400">
                    User:
                  </span>
                  <span
                    className="text-[10px] font-semibold text-slate-800 truncate max-w-[120px] sm:max-w-[180px]"
                    title={currentUserEmail}
                  >
                    {currentUserEmail}
                  </span>
                </div>
                {isEditor ? (
                  <span
                    className="bg-emerald-50 text-emerald-800 border border-emerald-150 text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-help shadow-3xs uppercase"
                    title="Validated Valley Moss Editor credentials"
                  >
                    Editor
                  </span>
                ) : (
                  <span
                    className="bg-amber-50 text-amber-800 border border-amber-150 text-[9px] font-bold px-1.5 py-0.5 rounded-full cursor-help shadow-3xs"
                    title="View-Only: Login under approved emails to manage ledger"
                  >
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

            <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-semibold border border-slate-200 shadow-3xs">
              <div
                className={`w-1.5 h-1.5 rounded-full ${syncConfig.isLinked ? "bg-emerald-400 animate-pulse" : "bg-gray-400"}`}
              ></div>
              <span className="hidden md:inline">
                {syncConfig.isLinked ? "Sheet Connected" : "Local Storage"}
              </span>
            </div>
          </div>
        </header>

        {/* Content View Area */}
        <div className="p-4 sm:p-8 flex-1 flex flex-col gap-6" id="view-stage">
          {/* Spectator Guard Warning Banner */}
          {!isEditor && (
            <div
              className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-3xs animate-in slide-in-from-top duration-300"
              id="spectator-badge-alert"
            >
              <div className="flex items-start gap-2.5">
                <div className="p-2 bg-amber-100 text-amber-800 rounded-lg shrink-0 text-sm">
                  🔒
                </div>
                <div>
                  <h4 className="text-xs sm:text-xs font-bold text-amber-900 font-sans uppercase tracking-wider">
                    Valley Moss Ledger View-Only Mode
                  </h4>
                  <p className="text-[11px] text-amber-700 leading-relaxed font-sans mt-0.5">
                    {currentUserEmail ? (
                      <>
                        Account{" "}
                        <strong className="font-mono text-amber-900 font-semibold">
                          {currentUserEmail}
                        </strong>{" "}
                        has read-only access. Only authorized managers (
                        <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[10px]">
                          yougrajbora1@gmail.com
                        </code>{" "}
                        or{" "}
                        <code className="font-mono bg-amber-100 px-1 py-0.5 rounded text-[10px]">
                          yougrajbora.developer@gmail.com
                        </code>
                        ) can create logs, edit worker states, or sync
                        spreadsheets.
                      </>
                    ) : (
                      <>
                        Spectator view. Log in with an approved manager
                        credential to register pluckers, record yields, finalize
                        trades, or synchronize with Google Sheets.
                      </>
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
          {activeTab === "dashboard" && (
            <DashboardView
              workers={workers}
              yields={yields}
              sales={sales}
              onNavigate={(view) => setActiveTab(view)}
            />
          )}

          {activeTab === "workers" && (
            <WorkersView
              workers={workers}
              yields={yields}
              onAddWorker={handleAddWorker}
              onUpdateWorker={handleUpdateWorker}
              canEdit={isEditor}
            />
          )}

          {activeTab === "yield" && (
            <HarvestYieldView
              workers={workers}
              yields={yields}
              onAddYield={handleAddYield}
              onUpdateYieldStatus={handleUpdateYieldStatus}
              onDeleteYield={handleDeleteYield}
              canEdit={isEditor}
            />
          )}

          {activeTab === "sales" && (
            <SalesView
              sales={sales}
              onAddSale={handleAddSale}
              onDeleteSale={handleDeleteSale}
              canEdit={isEditor}
            />
          )}

          {activeTab === "sync" && (
            <SheetsSyncView
              workers={workers}
              yields={yields}
              sales={sales}
              syncConfig={syncConfig}
              onUpdateSyncConfig={handleUpdateSyncConfig}
              onImportData={handleImportAllData}
              onResetAllData={handleWipeAllData}
              canEdit={isEditor}
            />
          )}
        </div>

        {/* Corporate footer, clean and humble */}
        <footer className="bg-white border-t border-gray-150 py-4 px-8 text-[11px] text-gray-400 mt-auto font-sans flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-emerald-800">
              Valley Moss Estates
            </span>
            <span>© 2026 Commercial Leaf Ledger</span>
          </div>
          <span className="font-mono text-3xs">
            Version 3.2.1 • GIS Platform
          </span>
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
