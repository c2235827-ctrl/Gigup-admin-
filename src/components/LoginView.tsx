import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck, Cpu } from 'lucide-react';
import { checkSecret, getMockMode, setMockMode } from '../services/api';

interface LoginViewProps {
  onLoginSuccess: (secret: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function LoginView({ onLoginSuccess, addToast }: LoginViewProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [demoMode, setDemoMode] = useState(getMockMode());

  const handleToggleDemoMode = (val: boolean) => {
    setDemoMode(val);
    setMockMode(val);
    addToast('info', val ? 'Switched to Demo Simulation Mode' : 'Switched to Live Production API Mode');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter a password');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    try {
      const isValid = await checkSecret(password);
      if (isValid) {
        addToast('success', demoMode ? 'Logged in successfully (Demo Sandbox)' : 'Successfully verified production credentials!');
        onLoginSuccess(password);
      } else {
        setErrorMsg('Invalid admin password');
        addToast('error', 'Authentication failed. Please check the credential password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Server Connection Error');
      addToast('error', 'Network failure verifying credentials. Try using Demo Sandbox.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="login-screen" className="min-h-screen bg-primary-dark flex flex-col items-center justify-center p-4 selection:bg-primary-blue/30 relative overflow-hidden">
      {/* Visual glowing blobs in background */}
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary-blue/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-primary-blue/15 text-primary-blue mb-4 ring-1 ring-primary-blue/30">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white font-sans">
            GigUp Admin
          </h1>
          <p className="text-sm text-text-muted mt-2">
            Nigerian VTU Operations & Plan Configuration Portal
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-geometric border border-slate-105 p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Secret Access Key
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Enter admin password"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && (
                <div className="mt-2 text-xs font-medium text-danger flex items-center gap-1.5 p-2 bg-red-50 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-danger animate-pulse" />
                  {errorMsg}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary-blue hover:bg-blue-600 active:translate-y-[1px] disabled:opacity-75 disabled:active:translate-y-0 text-white font-semibold rounded-xl shadow-lg shadow-primary-blue/25 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <span>Enter Dashboard</span>
              )}
            </button>
          </form>

          {/* Fallback Sandbox Notice */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-slate-400" />
              <div>
                <span className="block text-xs font-semibold text-slate-700">Sandbox Simulation</span>
                <span className="text-[10px] text-slate-400">Offline / CORS-safe state</span>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={demoMode}
                onChange={(e) => handleToggleDemoMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:width-4 after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-blue"></div>
            </label>
          </div>
        </div>

        <p className="text-center text-xs text-slate-500 mt-8">
          Authorized personnel only. Password: <code className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px] font-mono select-all">gigup-admin-2026</code>
        </p>
      </div>
    </div>
  );
}
