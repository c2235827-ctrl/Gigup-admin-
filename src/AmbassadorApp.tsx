import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { LogOut, Copy, RefreshCw, Users, TrendingUp, CheckCircle, XCircle, DollarSign, LogIn, AlertCircle, Settings, X } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { loginAmbassador, fetchAmbassadorDashboard, changeAmbassadorPin } from './services/api';
import { Ambassador, AmbassadorDetail } from './types';
import { formatNaira, getInitials } from './utils/formatters';

export default function AmbassadorApp() {
  const [token, setToken] = useState<string | null>(localStorage.getItem('ambassador_token'));
  const [ambassador, setAmbassador] = useState<Partial<Ambassador> | null>(() => {
    const saved = localStorage.getItem('ambassador_data');
    return saved ? JSON.parse(saved) : null;
  });

  const [phone, setPhone] = useState('');
  const [pin, setPin] = useState('');
  const [authError, setAuthError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [detail, setDetail] = useState<AmbassadorDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const [showPinModal, setShowPinModal] = useState(false);
  const [currentPinForm, setCurrentPinForm] = useState('');
  const [newPinForm, setNewPinForm] = useState('');
  const [confirmPinForm, setConfirmPinForm] = useState('');
  const [pinChangeError, setPinChangeError] = useState('');
  const [isChangingPin, setIsChangingPin] = useState(false);

  const chartData = useMemo(() => {
    if (!detail?.recent_orders) return [];
    
    const successfulOrders = detail.recent_orders.filter(o => o.status === 'success');
    const monthlyCounts: Record<string, { sortKey: string; month: string; orders: number }> = {};
    
    successfulOrders.forEach(order => {
      const date = new Date(order.created_at);
      const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const month = date.toLocaleString('default', { month: 'short', year: '2-digit' });
      
      if (!monthlyCounts[sortKey]) {
        monthlyCounts[sortKey] = { sortKey, month, orders: 0 };
      }
      monthlyCounts[sortKey].orders += 1;
    });

    return Object.values(monthlyCounts).sort((a, b) => a.sortKey.localeCompare(b.sortKey));
  }, [detail?.recent_orders]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone || pin.length !== 4) {
      setAuthError('Enter phone and 4-digit PIN');
      return;
    }
    setIsLoggingIn(true);
    setAuthError('');
    try {
      const res = await loginAmbassador(phone, pin);
      if (res.success) {
        localStorage.setItem('ambassador_token', res.token);
        localStorage.setItem('ambassador_data', JSON.stringify(res.ambassador));
        setToken(res.token);
        setAmbassador(res.ambassador);
      } else {
        setAuthError(res.error || 'Invalid credentials');
      }
    } catch (err: any) {
      setAuthError('Connection error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('ambassador_token');
    localStorage.removeItem('ambassador_data');
    setToken(null);
    setAmbassador(null);
    setDetail(null);
    setPhone('');
    setPin('');
  };

  const loadDashboard = async () => {
    if (!token || !ambassador?.id) return;
    setIsLoading(true);
    try {
      const data = await fetchAmbassadorDashboard(token, ambassador.id);
      if (data) setDetail(data);
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        handleLogout();
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      loadDashboard();
    }
  }, [token]);

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    showToast(`Referral code ${code} copied!`);
  };

  const handleChangePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    setPinChangeError('');
    if (newPinForm !== confirmPinForm) {
      setPinChangeError('New PIN and Confirm PIN must match');
      return;
    }
    if (newPinForm.length !== 4 || currentPinForm.length !== 4) {
      setPinChangeError('PINs must be exactly 4 digits');
      return;
    }
    if (currentPinForm === newPinForm) {
      setPinChangeError('New PIN must differ from current PIN');
      return;
    }
    
    setIsChangingPin(true);
    try {
      const res = await changeAmbassadorPin(token, currentPinForm, newPinForm);
      if (res.success) {
        showToast(res.message || 'PIN updated successfully');
        setShowPinModal(false);
        setCurrentPinForm('');
        setNewPinForm('');
        setConfirmPinForm('');
      } else {
        setPinChangeError(res.error || 'Failed to change PIN');
      }
    } catch (err: any) {
      setPinChangeError('Connection error. Please try again.');
    } finally {
      setIsChangingPin(false);
    }
  };

  // ----------------------------------------------------
  // LOGIN SCREEN
  // ----------------------------------------------------
  if (!token || !ambassador) {
    return (
      <div className="min-h-screen bg-[#EEF1F8] flex items-center justify-center p-4">
        <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white rounded-3xl p-8 w-full max-w-sm shadow-xl border border-slate-100">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">GigUp</h1>
            <p className="text-sm font-bold text-slate-500 uppercase tracking-widest mt-1">Ambassador Portal</p>
          </div>

          {authError && (
            <div className="bg-red-50 text-danger text-sm p-3 rounded-xl mb-4 flex items-center gap-2 border border-red-100">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                placeholder="080..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">4-Digit PIN</label>
              <input
                type="password"
                maxLength={4}
                value={pin}
                onChange={e => setPin(e.target.value.replace(/\D/g, ''))}
                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono text-center tracking-[1em] text-lg focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                placeholder="••••"
                required
              />
            </div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3.5 bg-primary-blue hover:bg-blue-600 text-white font-bold rounded-xl mt-6 flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
            >
              {isLoggingIn ? <RefreshCw className="w-5 h-5 animate-spin" /> : <LogIn className="w-5 h-5" />}
              {isLoggingIn ? 'Verifying...' : 'Access Portal'}
            </button>
          </form>
        </motion.div>
      </div>
    );
  }

  // ----------------------------------------------------
  // DASHBOARD SCREEN
  // ----------------------------------------------------
  return (
    <div className="min-h-screen bg-[#EEF1F8] font-sans pb-20">
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: -20, x: '-50%' }}
            className="fixed top-4 left-1/2 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-full text-sm font-bold shadow-xl flex items-center gap-2"
          >
            <CheckCircle className="w-4 h-4 text-success" />
            {toastMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-105 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-blue to-primary-dark flex items-center justify-center text-white font-black text-lg">
               {getInitials(ambassador.full_name || '')}
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-slate-900">Welcome, {ambassador.full_name}</h1>
              <p className="text-sm text-slate-500 font-mono">{ambassador.phone}</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-4 border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-100">
            {ambassador.referral_code && (
              <div 
                onClick={() => copyCode(ambassador.referral_code!)}
                className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 cursor-pointer active:scale-95 transition-transform"
              >
                <span className="text-xs font-bold text-slate-500 uppercase">Code:</span>
                <span className="font-mono font-black text-primary-blue text-lg leading-none">{ambassador.referral_code}</span>
                <Copy className="w-4 h-4 text-primary-blue" />
              </div>
            )}
            <button 
              onClick={() => setShowPinModal(true)}
              className="w-10 h-10 bg-slate-50 text-slate-500 hover:text-primary-blue hover:bg-blue-50 rounded-full flex flex-col items-center justify-center border border-slate-200"
              title="Change PIN"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button 
              onClick={handleLogout}
              className="w-10 h-10 bg-slate-50 text-slate-500 hover:text-danger hover:bg-red-50 rounded-full flex flex-col items-center justify-center border border-slate-200"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {isLoading && !detail && (
          <div className="flex flex-col items-center justify-center py-20">
            <RefreshCw className="w-8 h-8 text-primary-blue animate-spin mb-4" />
            <p className="text-slate-500 font-medium">Loading your dashboard...</p>
          </div>
        )}

        {detail && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            
            {/* STATS GRID */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Signups', value: detail.stats.total_signups, icon: Users, color: 'text-primary-blue' },
                { label: 'Qualified', value: detail.stats.qualified_signups, icon: CheckCircle, color: 'text-success' },
                { label: 'Successful Orders', value: detail.stats.successful_orders, icon: TrendingUp, color: 'text-success' },
                { label: 'Failed Orders', value: detail.stats.failed_orders, icon: XCircle, color: 'text-danger' },
                { label: 'Order Volume', value: formatNaira(detail.stats.total_volume), icon: DollarSign, color: 'text-amber-500' },
                { label: 'Current Tier Pay', value: formatNaira(detail.stats.current_tier_pay), icon: DollarSign, color: 'text-success' },
                { label: 'Next Tier At', value: detail.stats.next_tier_at ? `${detail.stats.next_tier_at} signups` : 'Max tier', icon: TrendingUp, color: 'text-pending' },
                { label: 'Level-2 Referrals', value: detail.stats.level2_referrals, icon: Users, color: 'text-purple-500' },
              ].map(stat => (
                <div key={stat.label} className="bg-white rounded-xl border border-slate-105 shadow-sm p-4">
                  <stat.icon className={`w-4 h-4 mb-2 ${stat.color}`} />
                  <p className="text-xl font-black font-mono text-slate-900">{stat.value}</p>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">{stat.label}</p>
                </div>
              ))}
            </div>

            {/* TIER PROGRESS */}
            {detail.stats.next_tier_at && (
              <div className="bg-white rounded-2xl border border-slate-105 shadow-sm p-5 sm:p-6">
                <div className="flex justify-between text-sm font-bold text-slate-700 mb-2.5">
                  <span className="flex items-center gap-1.5"><CheckCircle className="w-4 h-4 text-success"/> {detail.stats.qualified_signups} qualified signups</span>
                  <span>Next: {detail.stats.next_tier_at} → {formatNaira(detail.stats.next_tier_pay ?? 0)}/mo</span>
                </div>
                <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-primary-blue to-success rounded-full transition-all duration-1000"
                    style={{ width: `${Math.min(100, (detail.stats.qualified_signups / detail.stats.next_tier_at) * 100)}%` }} />
                </div>
              </div>
            )}

            {/* MONTHLY ORDER TRENDS */}
            {chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-105 shadow-sm p-5 sm:p-6">
                <div className="flex items-center mb-6">
                  <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-primary-blue" /> Monthly Successful Orders
                  </h3>
                </div>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                    <BarChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis 
                        dataKey="month" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} 
                        dy={10} 
                      />
                      <YAxis 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fontSize: 12, fill: '#64748B', fontWeight: 600 }} 
                      />
                      <Tooltip 
                        cursor={{ fill: '#F1F5F9' }} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', fontWeight: 'bold' }} 
                      />
                      <Bar dataKey="orders" fill="#3B7EF8" radius={[4, 4, 0, 0]} maxBarSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* DIRECT REFERRALS */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider">
                  Your Referrals ({detail.direct_referrals.length})
                </h3>
                <button onClick={loadDashboard} disabled={isLoading} className="text-xs text-primary-blue font-bold flex items-center gap-1">
                  <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              <div className="bg-white rounded-2xl border border-slate-105 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                         <th className="px-5 py-4">User</th>
                         <th className="px-5 py-4">Status</th>
                         <th className="px-5 py-4">Wallet</th>
                         <th className="px-5 py-4">Cashback</th>
                         <th className="px-5 py-4">Joined</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EEF1F8]">
                      {detail.direct_referrals.map(u => (
                        <tr key={u.id}>
                          <td className="px-5 py-3">
                            <p className="font-bold text-slate-900">{u.full_name}</p>
                            <p className="text-slate-400 font-mono mt-0.5">{u.phone}</p>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${u.qualified ? 'bg-green-50 border-green-200 text-success' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                              {u.qualified ? 'Qualified' : 'Pending'}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-mono text-slate-700 font-medium">{formatNaira(u.wallet_balance)}</td>
                          <td className="px-5 py-3 font-mono text-slate-700 font-medium">{formatNaira(u.cashback_balance)}</td>
                          <td className="px-5 py-3 text-slate-400 font-medium">{new Date(u.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                      {detail.direct_referrals.length === 0 && (
                        <tr><td colSpan={5} className="px-5 py-12 text-center text-slate-400 font-medium">You haven't referred anyone yet. Share your code!</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* LEVEL 2 REFERRALS */}
            {detail.level2_referrals.length > 0 && (
              <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-2 px-1">
                  Network Referrals ({detail.level2_referrals.length})
                </h3>
                <p className="text-xs text-slate-500 mb-3 px-1">People who were referred by your direct referrals.</p>
                <div className="bg-white rounded-2xl border border-slate-105 shadow-sm overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                          <th className="px-5 py-4">User</th>
                          <th className="px-5 py-4">Referred By</th>
                          <th className="px-5 py-4">Status</th>
                          <th className="px-5 py-4">Joined</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#EEF1F8]">
                        {detail.level2_referrals.map(u => (
                          <tr key={u.id}>
                            <td className="px-5 py-3">
                              <p className="font-bold text-slate-900">{u.full_name}</p>
                              <p className="text-slate-400 font-mono mt-0.5">{u.phone}</p>
                            </td>
                            <td className="px-5 py-3 font-medium text-slate-600">{u.referred_by}</td>
                            <td className="px-5 py-3">
                              <span className={`inline-flex items-center px-2 py-1 rounded-md text-[10px] font-bold border ${u.first_topup_done ? 'bg-green-50 border-green-200 text-success' : 'bg-amber-50 border-amber-200 text-amber-600'}`}>
                                {u.first_topup_done ? 'Funded' : 'Pending'}
                              </span>
                            </td>
                            <td className="px-5 py-3 text-slate-400 font-medium">{new Date(u.created_at).toLocaleDateString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
            
          </motion.div>
        )}
      </div>

      {showPinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-white rounded-3xl p-6 w-full max-w-sm shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-slate-900 text-lg">Change PIN</h3>
              <button onClick={() => { setShowPinModal(false); setPinChangeError(''); }} className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200 flex items-center justify-center transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <p className="text-sm text-slate-500 mb-6 bg-slate-50 p-3 rounded-xl border border-slate-100">
              Choose a PIN only you know. The admin set your initial PIN — changing it here keeps your account private.
            </p>

            {pinChangeError && (
              <div className="bg-red-50 text-danger text-sm p-3 rounded-xl mb-4 flex items-center gap-2 border border-red-100">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{pinChangeError}</span>
              </div>
            )}

            <form onSubmit={handleChangePinSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Current PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={currentPinForm}
                  onChange={e => setCurrentPinForm(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                  placeholder="••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={newPinForm}
                  onChange={e => setNewPinForm(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                  placeholder="••••"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-wider mb-1">Confirm New PIN</label>
                <input
                  type="password"
                  maxLength={4}
                  value={confirmPinForm}
                  onChange={e => setConfirmPinForm(e.target.value.replace(/\D/g, ''))}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-primary-blue/20 focus:border-primary-blue transition-all"
                  placeholder="••••"
                  required
                />
              </div>
              
              <button
                type="submit"
                disabled={isChangingPin || !currentPinForm || !newPinForm || !confirmPinForm}
                className="w-full py-3.5 bg-primary-blue hover:bg-blue-600 text-white font-bold rounded-xl mt-6 flex items-center justify-center gap-2 transition-colors disabled:opacity-70"
              >
                {isChangingPin ? <RefreshCw className="w-5 h-5 animate-spin" /> : <Settings className="w-5 h-5" />}
                {isChangingPin ? 'Updating...' : 'Update PIN'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
}
