import React, { useState } from 'react';
import { ShieldCheck, Chrome, AlertTriangle, X } from 'lucide-react';
import { googleSignIn } from '../utils/firebaseAuth';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthSuccess: (email: string, token: string | null) => void;
}

export default function AuthModal({ isOpen, onClose, onAuthSuccess }: AuthModalProps) {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await googleSignIn();
      if (res?.user?.email) {
        onAuthSuccess(res.user.email, res.accessToken);
        onClose();
      } else {
        throw new Error('Authorized email not resolved.');
      }
    } catch (err: any) {
      console.warn("Google login failed", err);
      setErrorMsg(err?.message || "An unexpected credentials issue occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Dark backdrop */}
      <div 
        className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Box */}
      <div className="relative bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-10 transition-all transform scale-100">
        {/* Header decoration */}
        <div className="bg-leaf-900 p-6 text-white relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 text-leaf-200 hover:text-white p-1 rounded-full hover:bg-leaf-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2 mb-2">
            <span className="p-2 bg-emerald-500/20 text-emerald-300 rounded-lg">
              <ShieldCheck className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-sm font-bold tracking-wider font-sans uppercase">Estate Administrator</h3>
              <p className="text-[10px] text-leaf-300">Valley Moss Ledger Identity Gate</p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6">
          {errorMsg && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-150 rounded-xl text-[11px] text-rose-700 flex gap-2 leading-relaxed animate-in shrink-0">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold uppercase tracking-wider text-[9px] mb-0.5">Authentication Issue Detected</p>
                <p>{errorMsg}</p>
              </div>
            </div>
          )}

          <div className="space-y-4 py-2">
            <div className="text-center">
              <p className="text-xs text-slate-600 leading-relaxed font-sans">
                Use your corporate Google Account credentials linked with Google Workspace permissions.
              </p>
            </div>

            <button
              disabled={loading}
              onClick={handleGoogleLogin}
              className={`w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-600 active:bg-emerald-800 text-white rounded-xl text-xs font-bold font-sans flex items-center justify-center gap-2 transition shadow-3xs cursor-pointer ${
                loading ? 'opacity-70 cursor-wait' : ''
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Executing Auth Popup...
                </>
              ) : (
                <>
                  <Chrome className="w-4 h-4" /> Continue with Google Sign In
                </>
              )}
            </button>
          </div>

          {/* Footnotes */}
          <div className="mt-6 pt-4 border-t border-gray-100 text-center">
            <p className="text-[10px] text-gray-400 font-sans">
              Authorized operators can log plucking yields, manage employee wages and sync to Google Sheets.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
