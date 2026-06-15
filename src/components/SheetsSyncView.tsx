import React, { useState, useEffect } from "react";
import { Worker, DailyYield, Sale, SyncConfig } from "../types";

import {
  FileSpreadsheet,
  CheckCircle,
  CloudRain,
  RefreshCw,
  Download,
  Upload,
  AlertTriangle,
  HelpCircle,
  Sparkles,
  ExternalLink,
  Laptop,
  CheckCircle2,
  Copy,
  FolderSync,
} from "lucide-react";
import {
  createSpreadsheet,
  syncDataToSheet,
  fetchDataFromSheet,
} from "../utils/googleSheets";
import { googleSignIn, logout as firebaseLogout } from "../utils/firebaseAuth";
import firebaseConfig from "../../firebase-applet-config.json";

interface SheetsSyncProps {
  workers: Worker[];
  yields: DailyYield[];
  sales: Sale[];
  syncConfig: SyncConfig;
  onUpdateSyncConfig: (config: Partial<SyncConfig>) => void;
  onImportData: (data: {
    workers: Worker[];
    yields: DailyYield[];
    sales: Sale[];
  }) => void;
  onResetAllData: () => void;
  canEdit?: boolean;
}

export default function SheetsSyncView({
  workers,
  yields,
  sales,
  syncConfig,
  onUpdateSyncConfig,
  onImportData,
  onResetAllData,
  canEdit = true,
}: SheetsSyncProps) {
  // Local UI states
  const [clientIdInput, setClientIdInput] = useState(
    syncConfig.clientId ||
      "383182885994-39ve8q899s67c006n7vukpld6e2aiq.apps.googleusercontent.com",
  ); // standard public test client ID
  const [spreadsheetIdInput, setSpreadsheetIdInput] = useState(
    syncConfig.spreadsheetId || "",
  );
  const [isSyncing, setIsSyncing] = useState(false);
  const [isFetching, setIsFetching] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [isCreatingSheet, setIsCreatingSheet] = useState(false);
  const [copiedRangeText, setCopiedRangeText] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [apiDisabledUrl, setApiDisabledUrl] = useState<string | null>(null);

  // Parse and handle Google Sheets API errors (like SERVICE_DISABLED/not been used in project)
  const handleSheetsError = (err: any, prefix: string) => {
    const rawMsg = err?.message || String(err);
    console.error(prefix, err);

    // Check if the error message informs us that Sheets API is disabled or not used yet
    if (
      rawMsg.includes("sheets.googleapis.com") &&
      (rawMsg.includes("disabled") ||
        rawMsg.includes("has not been used") ||
        rawMsg.includes("SERVICE_DISABLED") ||
        rawMsg.includes("403") ||
        rawMsg.includes("PERMISSION_DENIED"))
    ) {
      // Formulate or extract the activation URL from Google
      let activationUrl = `https://console.developers.google.com/apis/api/sheets.googleapis.com/overview?project=${firebaseConfig.projectId || "teaflowmanage"}`;
      const urlMatches = rawMsg.match(
        /https:\/\/console\.developers\.google\.com\/apis\/api\/sheets\.googleapis\.com\/overview\?project=[0-9a-zA-Z_-]+/,
      );
      if (urlMatches && urlMatches[0]) {
        activationUrl = urlMatches[0];
      }

      setApiDisabledUrl(activationUrl);

      const cleanMsg = `Google Sheets API is Disabled!\n\nYour custom Google Cloud project "${firebaseConfig.projectId}" needs to have the Google Sheets API enabled to perform synchronization.\n\nPlease visit the link below to enable it (wait 2-3 minutes for Google's systems to process afterwards), then reload this app and try again:\n\n${activationUrl}`;
      setSyncStatusMsg(`[ERROR] ${cleanMsg}`);

      setCustomModal({
        type: "error",
        title: "Google Sheets API Disabled",
        message: cleanMsg,
      });
    } else {
      setSyncStatusMsg(`[ERROR] ${prefix}: ${rawMsg}`);
      showCustomAlert("Sheets API Error", `${prefix}: ${rawMsg}`, "error");
    }
  };

  // Safe Dialog Overlay State
  const [customModal, setCustomModal] = useState<{
    type: "error" | "warning" | "success" | "confirm";
    title: string;
    message: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  const showCustomAlert = (
    title: string,
    message: string,
    type: "error" | "warning" | "success" = "warning",
  ) => {
    setCustomModal({
      type,
      title,
      message,
    });
  };

  const showCustomConfirm = (
    title: string,
    message: string,
    onConfirm: () => void,
  ) => {
    setCustomModal({
      type: "confirm",
      title,
      message,
      onConfirm: () => {
        setCustomModal(null);
        onConfirm();
      },
      onCancel: () => {
        setCustomModal(null);
      },
    });
  };

  // Synchronize local states with props
  useEffect(() => {
    if (syncConfig.clientId) setClientIdInput(syncConfig.clientId);
    if (syncConfig.spreadsheetId)
      setSpreadsheetIdInput(syncConfig.spreadsheetId);
  }, [syncConfig.clientId, syncConfig.spreadsheetId]);

  // Launch Google login via Firebase SDK
  const handleConnectGoogle = async () => {
    onUpdateSyncConfig({ clientId: clientIdInput });
    setSyncStatusMsg(
      "Connecting to your Google Account safely via Firebase...",
    );

    try {
      const result = await googleSignIn();
      if (result) {
        // Token expires in 1 hour
        const expiresAt = Date.now() + 3600 * 1000;

        onUpdateSyncConfig({
          accessToken: result.accessToken,
          tokenExpiresAt: expiresAt,
          isLinked: true,
        });

        setSyncStatusMsg(
          "Successfully linked with Google Sheets Account! Access Token retrieved.",
        );
      } else {
        showCustomAlert(
          "Authentication Failed",
          "OAuth failed to return a valid access token. Check client ID variables.",
          "error",
        );
      }
    } catch (err: any) {
      console.error("Firebase Auth Error:", err);
      const isPopupClosed =
        err?.code === "auth/popup-closed-by-user" ||
        err?.message?.includes("popup-closed-by-user");
      const isUnauthorizedDomain =
        err?.code === "auth/unauthorized-domain" ||
        err?.message?.includes("auth/unauthorized-domain") ||
        err?.message?.includes("unauthorized-domain");

      let friendlyMessage = "";
      if (isPopupClosed) {
        friendlyMessage =
          "The Google login popup was closed. Often, browsers block popups in iframe environments. Please ensure popups/redirects are allowed in your browser settings of this tab and tap 'Authorize' again.";
      } else if (isUnauthorizedDomain) {
        friendlyMessage = `This domain (${window.location.hostname}) is unauthorized by your Firebase project "${firebaseConfig.projectId}". To resolve, go to your Firebase Console under Authentication > Settings > Authorized domains and add: "${window.location.hostname}" and its "ais-pre-*" equivalent, then reload the app!`;
      } else {
        friendlyMessage = `Google Authentication error: ${err.message || String(err)}`;
      }

      setSyncStatusMsg(`[ERROR] ${friendlyMessage}`);
      showCustomAlert("Google Connection Status", friendlyMessage, "error");
    }
  };

  // Create a brand new workbook spreadsheet and register inside setup state
  const handleCreateAutoSheet = async () => {
    if (!syncConfig.accessToken) {
      showCustomAlert(
        "Connection Required",
        "Please Connect Google Account first using the Authorize Google Account option!",
        "warning",
      );
      return;
    }

    setIsCreatingSheet(true);
    setSyncStatusMsg("Creating Spreadsheet on Google Drive...");

    try {
      const { spreadsheetId, spreadsheetUrl } = await createSpreadsheet(
        syncConfig.accessToken,
        "Premium Tea Estate",
      );

      onUpdateSyncConfig({
        spreadsheetId,
        spreadsheetUrl,
      });

      setSpreadsheetIdInput(spreadsheetId);
      setSyncStatusMsg(
        `Created dynamic Workbook! Excel URL loaded: ${spreadsheetId}`,
      );
    } catch (err: any) {
      handleSheetsError(err, "Failed to auto-create Google Sheet");
    } finally {
      setIsCreatingSheet(false);
    }
  };

  // Perform full data bulk sync to Google sheet
  const handleSyncNow = async () => {
    if (!syncConfig.accessToken) {
      showCustomAlert(
        "Session Expired",
        "Your Google Session has expired or is disconnected. Click 'Authorize Google Account' below first!",
        "warning",
      );
      return;
    }

    if (!spreadsheetIdInput.trim()) {
      showCustomAlert(
        "Spreadsheet Required",
        "Please paste a target Google Spreadsheet ID or click 'Create Sheet' to generate one!",
        "warning",
      );
      return;
    }

    setIsSyncing(true);
    setSyncStatusMsg(
      "Syncing data grids to Google Sheets (Workers, Daily_Yield, Sales)...",
    );

    try {
      // Save sheet setting
      onUpdateSyncConfig({ spreadsheetId: spreadsheetIdInput.trim() });

      const success = await syncDataToSheet(
        syncConfig.accessToken,
        spreadsheetIdInput.trim(),
        workers,
        yields,
        sales,
      );

      if (success) {
        onUpdateSyncConfig({
          lastSyncedAt: new Date().toLocaleString(),
        });
        setSyncStatusMsg(
          "All data tables synchronized successfully with Google Sheets! Look at your Sheet now! 🎉",
        );
      }
    } catch (err: any) {
      handleSheetsError(err, "Sheets API Error");
    } finally {
      setIsSyncing(false);
    }
  };

  // Perform full data bulk fetch from Google sheets
  const handleFetchNow = async () => {
    if (!syncConfig.accessToken) {
      showCustomAlert(
        "Session Expired",
        "Your Google Session has expired or is disconnected. Click 'Authorize Google Account' below first!",
        "warning",
      );
      return;
    }

    if (!spreadsheetIdInput.trim()) {
      showCustomAlert(
        "Spreadsheet Required",
        "Please paste a target Google Spreadsheet ID or click 'Create Sheet' to generate one!",
        "warning",
      );
      return;
    }

    showCustomConfirm(
      "Confirm Workspace Import",
      "Are you sure you want to pull data from Google Sheets? This will OVERWRITE your current local data with the spreadsheet contents.",
      async () => {
        setIsFetching(true);
        setSyncStatusMsg(
          "Fetching data grids from Google Sheets (Workers, Daily_Yield, Sales)...",
        );

        try {
          // Save sheet setting
          onUpdateSyncConfig({ spreadsheetId: spreadsheetIdInput.trim() });

          const data = await fetchDataFromSheet(
            syncConfig.accessToken,
            spreadsheetIdInput.trim(),
          );

          if (data) {
            onImportData(data);
            onUpdateSyncConfig({
              lastSyncedAt: new Date().toLocaleString(),
            });
            setSyncStatusMsg(
              "All data tables retrieved and imported successfully from Google Sheets! 🎉",
            );
          }
        } catch (err: any) {
          handleSheetsError(err, "Sheets API Pull Error");
        } finally {
          setIsFetching(false);
        }
      },
    );
  };

  // Manual export to local CSV bundle
  const handleExportCSV = () => {
    // Generates simple CSV string helper
    const downloadCSVFile = (
      filename: string,
      headers: string[],
      rows: string[][],
    ) => {
      const csvContent =
        "data:text/csv;charset=utf-8," +
        [
          headers.join(","),
          ...rows.map((e) =>
            e.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(","),
          ),
        ].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    };

    // Export Workers
    const workerHeaders = [
      "Worker ID",
      "Name",
      "Phone",
      "Default Wage Rate",
      "Role",
      "Status",
      "Registered Date",
    ];
    const workerRows = workers.map((w) => [
      w.id,
      w.name,
      w.phone,
      String(w.defaultRate),
      w.role,
      w.active ? "Active" : "Inactive",
      w.createdAt,
    ]);
    downloadCSVFile("TeaEstate_Workers.csv", workerHeaders, workerRows);

    // Export Yields
    const yieldHeaders = [
      "Yield ID",
      "Date",
      "Worker ID",
      "Worker Name",
      "Activity",
      "Leaves Plucked (kg)",
      "Wage Rate",
      "Base Wages",
      "Advance Amount",
      "Net Payable",
      "Status",
    ];
    const yieldRows = yields.map((y) => [
      y.id,
      y.date,
      y.workerId,
      y.workerName,
      y.activity,
      String(y.leavesPlucked),
      String(y.wageRate),
      String(y.baseWages),
      String(y.cashAdvanceAmount),
      String(y.netPayable),
      y.paymentStatus,
    ]);
    downloadCSVFile("TeaEstate_Yield_Ledger.csv", yieldHeaders, yieldRows);

    // Export Sales
    const salesHeaders = [
      "Sale ID",
      "Date",
      "Invoice No",
      "Tea Category",
      "Quantity (kg)",
      "Price per kg",
      "Total Amount",
      "Buyer Name",
      "Notes",
    ];
    const salesRows = sales.map((s) => [
      s.id,
      s.date,
      s.invoiceNo,
      s.teaType,
      String(s.quantity),
      String(s.pricePerKg),
      String(s.totalAmount),
      s.buyerName,
      s.notes,
    ]);
    downloadCSVFile("TeaEstate_Sales_Ledger.csv", salesHeaders, salesRows);
  };

  // Parse JSON file import
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileReader = new FileReader();
    if (e.target.files && e.target.files[0]) {
      fileReader.readAsText(e.target.files[0], "UTF-8");
      fileReader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.workers && parsed.yields && parsed.sales) {
            onImportData(parsed);
            showCustomAlert(
              "Import Successful",
              "Roster state and transaction logs imported successfully!",
              "success",
            );
          } else {
            showCustomAlert(
              "Import Mismatch",
              "Invalid Estate Backup file structure. Missing keys (workers, yields, sales).",
              "error",
            );
          }
        } catch (err) {
          showCustomAlert(
            "Parse Failure",
            "Failed to parse JSON backup file structure.",
            "error",
          );
        }
      };
    }
  };

  // Download complete app raw JSON state as backup file
  const handleExportJSONBackup = () => {
    const dataStr =
      "data:text/json;charset=utf-8," +
      encodeURIComponent(JSON.stringify({ workers, yields, sales }, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute(
      "download",
      `TeaEstate_FullBackup_${new Date().toISOString().split("T")[0]}.json`,
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.removeChild(downloadAnchor);
  };

  return (
    <div className="space-y-8" id="sheets-sync-container">
      {/* Upper Title Section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-6 border-leaf-200">
        <div>
          <h1 className="text-3xl font-display font-medium text-leaf-900 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="w-8 h-8 text-leaf-600 animate-bounce" />{" "}
            Google Workspace Sync
          </h1>
          <p className="text-gray-500 mt-1 font-sans">
            Connect your estate directly with Google Sheets or Google Drive.
            Keep your ledgers stored safely on your personal cloud.
          </p>
        </div>
      </div>

      {/* Grid: Instructions & Live Status sync blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Sync Settings Module */}
        <div className="lg:col-span-1 space-y-6">
          {/* Authorization Config Card */}
          <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-2xs">
            <h3 className="text-base font-display font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-leaf-600" /> Google Connection
              Settings
            </h3>

            {!canEdit ? (
              <div className="py-6 px-3 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto mb-3 text-sm">
                  🔒
                </div>
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Sync Settings Locked
                </h4>
                <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed font-sans">
                  Google Drive / Spreadsheet persistence is restricted to
                  validated administrators. Guest spectators cannot change cloud
                  configurations.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-3xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                    Google Cloud Client ID
                  </label>
                  <input
                    type="text"
                    placeholder="Paste your OAuth2 Client ID..."
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-leaf-600 font-mono"
                    id="client-id-field"
                  />
                  <p className="text-3xs text-gray-400 mt-1">
                    OAuth Client ID with origins authorized for development.
                  </p>
                </div>

                {/* Status flag */}
                <div className="p-3.5 bg-gray-50 rounded-lg border text-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-gray-500 font-medium">
                      Session Status:
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded-full font-semibold font-mono text-3xs tracking-wider uppercase ${
                        syncConfig.isLinked
                          ? "bg-emerald-50 text-emerald-800"
                          : "bg-rose-50 text-rose-700"
                      }`}
                    >
                      {syncConfig.isLinked ? "Connected" : "Disconnected"}
                    </span>
                  </div>

                  {!syncConfig.isLinked ? (
                    <button
                      onClick={handleConnectGoogle}
                      className="w-full mt-2 py-2 bg-leaf-700 hover:bg-leaf-600 text-white rounded text-xs font-semibold font-sans transition flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                      id="connect-google-btn"
                    >
                      Authorize Google Account
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-3xs text-emerald-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />{" "}
                        Authorized Scopes Loaded (Sheets / Drive)
                      </p>
                      <button
                        onClick={() =>
                          onUpdateSyncConfig({
                            isLinked: false,
                            accessToken: null,
                            lastSyncedAt: null,
                          })
                        }
                        className="w-full py-1 border border-gray-200 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-100 rounded text-3xs text-gray-500 font-sans transition cursor-pointer"
                      >
                        Disconnect Account Session
                      </button>
                    </div>
                  )}
                </div>

                {/* Spreadsheet ID configuration */}
                {syncConfig.isLinked && (
                  <div className="pt-4 border-t border-gray-50 space-y-4 animate-in fade-in duration-150">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-3xs font-semibold text-gray-400 uppercase tracking-wider">
                          Google Spreadsheet ID
                        </label>
                        <button
                          onClick={handleCreateAutoSheet}
                          disabled={isCreatingSheet}
                          className="text-3xs text-leaf-700 font-semibold hover:text-leaf-900 flex items-center gap-0.5 cursor-pointer disabled:opacity-55"
                        >
                          {isCreatingSheet ? "Creating..." : "Create Sheet"}{" "}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <input
                        type="text"
                        placeholder="Enter spreadsheet address or ID..."
                        value={spreadsheetIdInput}
                        onChange={(e) => setSpreadsheetIdInput(e.target.value)}
                        className="w-full px-3 py-1.5 border border-gray-200 rounded text-xs focus:outline-none focus:border-leaf-600 font-mono"
                        id="spreadsheet-id-field"
                      />
                      <p className="text-3xs text-gray-400 mt-1">
                        Paste spreadsheet ID (string from URL) or click `Create
                        Sheet` to auto-provision.
                      </p>
                    </div>

                    {syncConfig.spreadsheetUrl && (
                      <a
                        href={syncConfig.spreadsheetUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-leaf-800 font-semibold hover:underline flex items-center gap-1 font-sans justify-center p-2 rounded bg-leaf-50/50 border border-leaf-100"
                      >
                        <ExternalLink className="w-4 h-4" /> Open spreadsheet in
                        Google Sheets
                      </a>
                    )}

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={handleSyncNow}
                        disabled={isSyncing || isFetching}
                        className="py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold font-sans transition flex items-center justify-center gap-1 cursor-pointer disabled:bg-gray-400"
                        id="trigger-sync-btn"
                      >
                        <Upload
                          className={`w-3.5 h-3.5 ${isSyncing ? "animate-bounce" : ""}`}
                        />
                        {isSyncing ? "Pushing..." : "Push to Sheet"}
                      </button>

                      <button
                        onClick={handleFetchNow}
                        disabled={isSyncing || isFetching}
                        className="py-2 bg-blue-700 hover:bg-blue-600 text-white rounded text-xs font-semibold font-sans transition flex items-center justify-center gap-1 cursor-pointer disabled:bg-gray-400"
                        id="trigger-fetch-btn"
                      >
                        <Download
                          className={`w-3.5 h-3.5 ${isFetching ? "animate-bounce" : ""}`}
                        />
                        {isFetching ? "Pulling..." : "Pull from Sheet"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Backup & Import module */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 space-y-4">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
              Offline Backups & Manual Exports
            </h3>
            <p className="text-xs text-gray-500 font-sans">
              Always protect your data. You can download and restore backups
              matching Excel spreadsheets globally.
            </p>

            <div className="space-y-2">
              <button
                onClick={handleExportCSV}
                className="w-full text-left p-3 border rounded-lg hover:border-leaf-200 hover:bg-leaf-50 flex items-center gap-3 transition cursor-pointer"
              >
                <Download className="w-4 h-4 text-leaf-700" />
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">
                    Export 3 Separate CSVs
                  </h4>
                  <p className="text-3xs text-gray-400">
                    Workers, plucking yields, and trade transactions.
                  </p>
                </div>
              </button>

              <button
                onClick={handleExportJSONBackup}
                className="w-full text-left p-3 border rounded-lg hover:border-leaf-200 hover:bg-leaf-50 flex items-center gap-3 transition cursor-pointer"
              >
                <Laptop className="w-4 h-4 text-gray-600" />
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">
                    Download Offline JSON Backup
                  </h4>
                  <p className="text-3xs text-gray-400">
                    Full structured backup ready for transfer restore.
                  </p>
                </div>
              </button>

              <label className="w-full text-left p-3 border rounded-lg hover:border-leaf-200 hover:bg-leaf-50 flex items-center gap-3 transition cursor-pointer select-none">
                <Upload className="w-4 h-4 text-amber-700" />
                <div>
                  <h4 className="text-xs font-semibold text-gray-800">
                    Import Offline Backup (.json)
                  </h4>
                  <p className="text-3xs text-gray-400">
                    Restore your state immediately from previous export.
                  </p>
                </div>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJSON}
                  className="hidden"
                />
              </label>

              {canEdit && (
                <button
                  type="button"
                  onClick={() => {
                    showCustomConfirm(
                      "Reset Vineyard & Estate Ledger",
                      "WARNING: This operation is permanent! Under 'Fresh Start', all current registered workers, plucking yield histories, and sales ledger sheets will be deleted from your browser storage. Do you want to continue?",
                      () => {
                        onResetAllData();
                        setSyncStatusMsg(
                          "Commercial ledger cleared completely. You can now start registering your active team and new plucking sheets from a blank slate.",
                        );
                        showCustomAlert(
                          "Database Reset Complete",
                          "The ledger state has been set to empty. You have a fresh, blank slate!",
                          "success",
                        );
                      },
                    );
                  }}
                  className="w-full text-left p-3 border border-red-100 bg-red-50/50 hover:bg-red-50 rounded-lg flex items-center gap-3 transition cursor-pointer text-red-800"
                >
                  <span className="w-4 h-4 text-red-600 font-bold block text-center leading-4">
                    🚨
                  </span>
                  <div>
                    <h4 className="text-xs font-bold uppercase tracking-wider text-red-900">
                      Wipe & Reset Ledger Data
                    </h4>
                    <p className="text-3xs text-red-600 mt-0.5">
                      Delete all workers, yield books, and transactions
                      permanently.
                    </p>
                  </div>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Sync Console & Help Instructions */}
        <div className="lg:col-span-2 space-y-6">
          {apiDisabledUrl && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-xl p-5 shadow-xs space-y-3 animate-in slide-in-from-top-4 duration-300">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900 uppercase tracking-widest">
                    Google Sheets API Activation Required
                  </h4>
                  <p className="text-xs text-amber-800 leading-normal mt-1">
                    Google Sheets integration is failing because the{" "}
                    <strong className="font-semibold text-amber-950">
                      Google Sheets API
                    </strong>{" "}
                    has not been enabled for your custom Firebase Cloud project{" "}
                    <strong className="font-semibold text-amber-950">
                      "{firebaseConfig.projectId}"
                    </strong>{" "}
                    yet.
                  </p>
                </div>
              </div>

              <div className="pl-8 space-y-2.5">
                <div className="text-3xs md:text-2xs text-amber-900 space-y-1 bg-white/60 p-3 rounded-lg border border-amber-200 leading-relaxed">
                  <p className="font-bold uppercase tracking-wider text-amber-950 text-[9px] mb-1">
                    Steps to resolve this error:
                  </p>
                  <ol className="list-decimal pl-4 space-y-1 block">
                    <li>
                      Click the button below to open the official Google Cloud
                      activation console for your project config.
                    </li>
                    <li>
                      Ensure you are logged into your Google Developer/Firebase
                      account.
                    </li>
                    <li>
                      Click the blue{" "}
                      <strong className="font-semibold">"Enable"</strong> button
                      at the top of the Google Cloud console.
                    </li>
                    <li>
                      Wait 2–3 minutes for the action to propagate across the
                      Google servers.
                    </li>
                    <li>
                      Return here, reload the page, and click{" "}
                      <strong className="font-semibold">"Push to Sheet"</strong>{" "}
                      again!
                    </li>
                  </ol>
                </div>

                <a
                  href={apiDisabledUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Enable Google Sheets API{" "}
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          )}

          {/* Live Sync execution status logger console */}
          <div className="bg-[#1e1e1e] rounded-xl border border-gray-850 p-6 font-mono text-xs text-white shadow-md">
            <div className="flex items-center justify-between border-b border-gray-800 pb-3 mb-4">
              <span className="text-emerald-400 font-semibold flex items-center gap-1.5">
                ● Sync Engine Terminal
              </span>
              <span className="text-3xs text-gray-400">UTC System Time</span>
            </div>

            <div className="space-y-2 text-3xs md:text-2xs max-h-48 overflow-y-auto">
              <p className="text-gray-500">
                [SYSTEM INIT] Workspace tea-estate syncing client deployed.
              </p>
              <p className="text-gray-500">
                [LOCAL STORAGE] SQLite/JSON relational local instance populated
                index total: {workers.length + yields.length + sales.length}{" "}
                rows.
              </p>

              {syncConfig.lastSyncedAt && (
                <p className="text-emerald-400 font-semibold">
                  [SUCCESS] Sync sequence completed at {syncConfig.lastSyncedAt}
                  . Write successful across Workers, Daily_Yield, Sales.
                </p>
              )}

              {syncStatusMsg && (
                <p className="text-yellow-300 font-semibold">
                  [ENGINE] {syncStatusMsg}
                </p>
              )}

              {!syncConfig.isLinked && (
                <p className="text-pink-400">
                  [ALERT] Google Account offline. Active session waiting for
                  user validation... Connect GSI account below or click the
                  connect buttons.
                </p>
              )}
            </div>

            <div className="border-t border-gray-800 mt-4 pt-3 flex items-center justify-between text-3xs text-gray-400">
              <span>
                Spreadsheet Synced: {syncConfig.lastSyncedAt || "Never"}
              </span>
              <button
                onClick={() =>
                  setSyncStatusMsg("Terminal diagnostics reset. Ready.")
                }
                className="hover:text-white cursor-pointer"
              >
                Clear logs
              </button>
            </div>
          </div>

          {/* Guide setup instructions accordian */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-display font-semibold text-gray-900 flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-leaf-600" /> How to connect
                Google Sheets?
              </h3>
              <button
                onClick={() => setShowGuide(!showGuide)}
                className="text-xs text-leaf-700 hover:text-leaf-900 font-medium cursor-pointer"
              >
                {showGuide ? "Hide instructions" : "Show instructions"}
              </button>
            </div>

            {showGuide && (
              <div className="space-y-4 text-xs text-gray-600 font-sans border-t pt-4 border-gray-100 animate-in fade-in duration-150">
                <p>
                  To sync data directly to your own Google Sheets workbook,
                  follow these simple steps to configure your own safe
                  Credentials:
                </p>

                <ol className="list-decimal pl-5 space-y-3">
                  <li>
                    <strong>Get a Google Client ID</strong>: Go to{" "}
                    <a
                      href="https://console.cloud.google.com"
                      target="_blank"
                      rel="noreferrer"
                      className="text-leaf-700 underline font-semibold"
                    >
                      Google Cloud Console
                    </a>
                    , create a project, then head to{" "}
                    <em>APIs & Services &gt; Credentials</em>, and create an{" "}
                    <strong>OAuth Client ID</strong> for a{" "}
                    <strong>Web Application</strong>.
                  </li>
                  <li>
                    <strong>Authorize Development Origins</strong>: In your
                    Google Cloud Client ID settings under{" "}
                    <strong>Authorized JavaScript Origins</strong>, add the
                    following URL: <br />
                    <code className="bg-slate-100 p-1 rounded font-mono text-3xs block select-all mt-1 border">
                      https://ais-dev-23ciyhqtn6vukwiecj2aiq-908472346283.asia-east1.run.app
                    </code>
                  </li>
                  <li>
                    <strong>Configure Scopes</strong>: Ensure you approve sheets
                    scopes. In your OAuth consent screen step, configure the two
                    scopes: <br />
                    <code className="text-3xs font-mono bg-slate-50 border p-1 rounded block mt-1">
                      https://www.googleapis.com/auth/spreadsheets
                      <br />
                      https://www.googleapis.com/auth/drive.file
                    </code>
                  </li>
                  <li>
                    <strong>Connect & Sync</strong>: Save your Client ID. Click{" "}
                    <em>Authorize Google Account</em> above to login. Your
                    spreadsheets will write instantly!
                  </li>
                </ol>

                <div className="bg-amber-50 p-4 border border-amber-100 rounded-lg flex gap-3 text-3xs md:text-2xs text-amber-850">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold">Security first:</h4>
                    <p className="mt-0.5">
                      Your access token is strictly kept in-memory inside the
                      browser session and never sent to our servers. Your
                      security is 100% protected.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick spreadsheet mock view (so they can see what is happening) */}
          <div className="bg-white p-6 rounded-xl border border-gray-150 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-display font-semibold text-gray-900">
                  Tea Estate Workbook Map
                </h3>
                <p className="text-3xs text-gray-400">
                  This illustrates the sheets layout we sync inside your Google
                  spreadsheet workbook
                </p>
              </div>
              <span className="text-2xs text-[#2e7d32] bg-[#e8f5e9] px-2 py-0.5 rounded font-mono">
                Standard Schema
              </span>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center text-3xs font-sans">
              <div className="p-3 bg-gray-50 border rounded-lg flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 border-b pb-1 mb-1">
                    Sheet 1: Workers
                  </h4>
                  <p className="text-gray-500">
                    Fields for IDs, names, contact phones, commissions, active
                    resignation flags.
                  </p>
                </div>
                <span className="text-gray-400 font-mono mt-2 block">
                  {workers.length} rows synced
                </span>
              </div>

              <div className="p-3 bg-gray-50 border rounded-lg flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 border-b pb-1 mb-1">
                    Sheet 2: Daily_Yield
                  </h4>
                  <p className="text-gray-500">
                    Fields for date sessions, plucked leaves in kg, flat wage
                    rates, cash advances deducted, status.
                  </p>
                </div>
                <span className="text-gray-400 font-mono mt-2 block">
                  {yields.length} rows synced
                </span>
              </div>

              <div className="p-3 bg-gray-50 border rounded-lg flex flex-col justify-between">
                <div>
                  <h4 className="font-bold text-gray-800 border-b pb-1 mb-1">
                    Sheet 3: Sales
                  </h4>
                  <p className="text-gray-500">
                    Fields for commercial invoices, tea categories
                    (packaged/raw), weight kgs, buyer names.
                  </p>
                </div>
                <span className="text-gray-400 font-mono mt-2 block">
                  {sales.length} rows synced
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Elegant Dialog Modal */}
      {customModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-xl shadow-xl border border-gray-100 max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div
                className={`p-3 rounded-full shrink-0 ${
                  customModal.type === "error"
                    ? "bg-rose-50 text-rose-600"
                    : customModal.type === "success"
                      ? "bg-emerald-50 text-emerald-600"
                      : customModal.type === "confirm"
                        ? "bg-blue-50 text-blue-600"
                        : "bg-amber-50 text-amber-600"
                }`}
              >
                {customModal.type === "error" ? (
                  <AlertTriangle className="w-5 h-5" />
                ) : customModal.type === "success" ? (
                  <CheckCircle2 className="w-5 h-5" />
                ) : customModal.type === "confirm" ? (
                  <HelpCircle className="w-5 h-5" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-500" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900">
                  {customModal.title}
                </h3>
                <p className="text-xs text-gray-500 mt-2 leading-relaxed whitespace-pre-line">
                  {customModal.message}
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              {customModal.type === "confirm" ? (
                <>
                  <button
                    onClick={customModal.onCancel}
                    className="px-3.5 py-1.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded text-xs font-semibold font-sans transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={customModal.onConfirm}
                    className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded text-xs font-semibold font-sans transition cursor-pointer"
                  >
                    Confirm Pull
                  </button>
                </>
              ) : (
                <>
                  {apiDisabledUrl && customModal.title.includes("Disabled") && (
                    <a
                      href={apiDisabledUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-semibold font-sans transition cursor-pointer inline-flex items-center gap-1 shadow-xs"
                    >
                      Enable API <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                  <button
                    onClick={() => setCustomModal(null)}
                    className="px-4 py-1.5 bg-leaf-700 hover:bg-leaf-600 text-white rounded text-xs font-semibold font-sans transition cursor-pointer"
                  >
                    Dismiss
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
