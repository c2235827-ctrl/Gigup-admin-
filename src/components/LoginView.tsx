import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { checkSecret } from '../services/api';

interface LoginViewProps {
  onLoginSuccess: (secret: string) => void;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

export default function LoginView({ onLoginSuccess, addToast }: LoginViewProps) {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('Please enter the admin password');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');
    try {
      const isValid = await checkSecret(password);
      if (isValid) {
        addToast('success', 'Welcome back! Logged in successfully.');
        onLoginSuccess(password);
      } else {
        setErrorMsg('Incorrect admin password. Please try again.');
        addToast('error', 'Authentication failed. Wrong password.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Connection error. Check your internet and try again.');
      addToast('error', err.message || 'Server connection error.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary-dark flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[50vw] h-[50vw] bg-primary-blue/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-purple-500/10 rounded-full blur-[120px]" />

      <div className="w-full max-w-md z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-white mb-4 shadow-sm ring-1 ring-slate-205 p-2">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/15106/15106527.png" 
              alt="Hummingbird Icon" 
              className="w-12 h-12 object-contain" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white">GigUp Nigeria Admin</h1>
          <p className="text-sm text-slate-400 mt-2">Operations & Management Dashboard</p>
        </div>

        <div className="bg-white rounded-xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Admin Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrorMsg(''); }}
                  placeholder="Enter admin password"
                  className="w-full pl-10 pr-10 py-3 bg-slate-50 border border-slate-200 text-slate-900 placeholder:text-slate-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errorMsg && (
                <div className="mt-2 text-xs font-medium text-red-600 flex items-center gap-1.5 p-2 bg-red-50 rounded-lg">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  {errorMsg}
                </div>
              )}
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 bg-primary-blue hover:bg-blue-600 disabled:opacity-60 text-white font-semibold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Verifying...</span>
                </>
              ) : (
                <span>Enter Dashboard</span>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
