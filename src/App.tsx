import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchStats, fetchUsers, fetchOrders, fetchWithdrawals } from './services/api';
import { Stats, Order, User, DashboardData } from './types';
import { AlertCircle, RefreshCw } from 'lucide-react';

// Importing Views & Overlays
import LoginView from './components/LoginView';
import Sidebar, { ActiveTab } from './components/Sidebar';
import ToastContainer, { ToastMessage } from './components/ToastContainer';
import DashboardHome from './components/DashboardHome';
import OrdersView from './components/OrdersView';
import UsersView from './components/UsersView';
import PlansView from './components/PlansView';
import SettingsView from './components/SettingsView';
import WithdrawalsView from './components/WithdrawalsView';
import OrderDetailModal from './components/OrderDetailModal';
import AnalyticsView from './components/AnalyticsView';
import ExportView from './components/ExportView';
import AuditView from './components/AuditView';
import MarginsView from './components/MarginsView';
import ActivityView from './components/ActivityView';
import PushView from './components/PushView';
import InactiveAccountsView from './components/InactiveAccountsView';
import StreaksView from './components/StreaksView';
import AmbassadorsView from './components/AmbassadorsView';
import FinancialReportView from './components/FinancialReportView';
import FeedbackView from './components/FeedbackView';
import RechargeCardsView from './components/RechargeCardsView';

export default function App() {
  // Session Authentication State
  const [adminSecret, setAdminSecret] = useState<string | null>(() => {
    return sessionStorage.getItem('gigup_admin_secret');
  });
  const [role, setRole] = useState<'admin' | 'sub_admin'>(() => {
    return (sessionStorage.getItem('gigup_admin_role') as 'admin' | 'sub_admin') || 'admin';
  });
  const [subAdminSecret, setSubAdminSecret] = useState<string | null>(() => {
    return sessionStorage.getItem('gigup_sub_admin_secret');
  });

  // Global Toast Lists
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Navigation and screen tab trackers
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [initialPendingFilterActive, setInitialPendingFilterActive] = useState(false);
  const [initialBonusPendingFilterActive, setInitialBonusPendingFilterActive] = useState(false);

  // Core administrative states
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);
  const [pendingBonuses, setPendingBonuses] = useState<Order[]>([]);

  // Withdrawals states
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState<number>(0);
  const [pendingWithdrawalsSum, setPendingWithdrawalsSum] = useState<number>(0);
  
  // Loader trackers
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [isRefreshingStats, setIsRefreshingStats] = useState(false);

  // Selected Order details focus
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Auto-refresh interval ref
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Global toast injector helper
  const addToast = (type: 'success' | 'error' | 'warning' | 'info', message: string) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, type, message }]);
  };

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Login handler
  const handleLoginSuccess = (secretToken: string, newRole: 'admin' | 'sub_admin') => {
    sessionStorage.setItem('gigup_admin_role', newRole);
    setRole(newRole);
    if (newRole === 'sub_admin') {
      sessionStorage.setItem('gigup_sub_admin_secret', secretToken);
      setSubAdminSecret(secretToken);
      setActiveTab('ambassadors');
    } else {
      sessionStorage.setItem('gigup_admin_secret', secretToken);
      setAdminSecret(secretToken);
      setActiveTab('dashboard');
    }
  };

  // Logout handler
  const handleLogout = () => {
    sessionStorage.removeItem('gigup_admin_secret');
    sessionStorage.removeItem('gigup_sub_admin_secret');
    sessionStorage.removeItem('gigup_admin_role');
    setAdminSecret(null);
    setSubAdminSecret(null);
    setRole('admin');
    setStats(null);
    setRecentOrders([]);
    setRecentUsers([]);
    setActiveTab('dashboard');
    addToast('info', 'Logged out successfully');
  };

  // Core Stats & Metrics Fetch Wrapper
  const fetchDashboardStats = async (isSilent = false) => {
    if (!adminSecret) return;
    
    if (!isSilent) setIsLoadingStats(true);
    else setIsRefreshingStats(true);

    try {
      const [dashboardData, withdrawalsRes, pendingBonusesRes] = await Promise.all([
        fetchStats(adminSecret, role),
        fetchWithdrawals(adminSecret, 'pending', role).catch(err => {
          console.warn('Graceful fallback for pending withdrawals load failure:', err);
          return { success: false, withdrawals: [] };
        }),
        fetchOrders(adminSecret, 1, 50, 'pending', 'all', '', true, '', role).catch(err => {
          console.warn('Graceful fallback for pending bonus orders load failure:', err);
          return { success: false, orders: [] };
        })
      ]);
      setStats(dashboardData.stats);
      setRecentOrders(dashboardData.recent_orders);
      setRecentUsers(dashboardData.recent_users);
      
      if (pendingBonusesRes && pendingBonusesRes.orders) {
        setPendingBonuses(pendingBonusesRes.orders);
      } else {
        setPendingBonuses([]);
      }

      if (withdrawalsRes && withdrawalsRes.success && withdrawalsRes.withdrawals) {
        setPendingWithdrawalsCount(withdrawalsRes.withdrawals.length);
        let sum = 0;
        for (const w of withdrawalsRes.withdrawals) {
          sum += w.amount;
        }
        setPendingWithdrawalsSum(sum);
      } else {
        setPendingWithdrawalsCount(0);
        setPendingWithdrawalsSum(0);
      }
    } catch (err: any) {
      if (err.message === 'Unauthorized') {
        // Clear stale session
        handleLogout();
        addToast('error', 'Session authentication expired. Please login again.');
      } else {
        addToast('error', err.message || 'Connection lost reloading admin metrics.');
      }
    } finally {
      setIsLoadingStats(false);
      setIsRefreshingStats(false);
    }
  };

  // Load metrics when identity secret is verified or toggled
  useEffect(() => {
    if (adminSecret && role === 'admin') {
      fetchDashboardStats(false);

      // Auto-refresh Stats every 60 seconds as commanded by UX instructions
      refreshIntervalRef.current = setInterval(() => {
        fetchDashboardStats(true);
      }, 60000);
    } else {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    }

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [adminSecret, role]);

  // Handle routing commands between metrics cards and sheets
  const handleNavigateToOrders = (filterPending: boolean, filterBonusPending = false) => {
    setInitialPendingFilterActive(filterPending);
    setInitialBonusPendingFilterActive(filterBonusPending);
    setActiveTab('orders');
  };

  const handleNavigateToUsers = () => {
    setActiveTab('users');
  };

  const isAuthorized = role === 'admin' ? !!adminSecret : !!subAdminSecret;

  // If no session exists, render the stylized auth portal
  if (!isAuthorized) {
    return (
      <main id="auth-flow" className="min-h-screen font-sans bg-primary-dark">
        <LoginView onLoginSuccess={handleLoginSuccess} addToast={addToast} />
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </main>
    );
  }

  // Render main core workspace
  return (
    <div id="admin-workspace" className="min-h-screen bg-bg flex flex-col lg:flex-row font-sans max-w-[100vw] overflow-x-hidden selection:bg-primary-blue/30 text-text">
      {/* SIDEBAR NAVIGATION UNIT */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tab) => {
          setActiveTab(tab);
          // If moving to orders, make sure to reset initial filters
          if (tab !== 'orders') {
            setInitialPendingFilterActive(false);
            setInitialBonusPendingFilterActive(false);
          }
        }}
        pendingOrdersCount={stats?.pending_orders || 0}
        pendingWithdrawalsCount={pendingWithdrawalsCount}
        onLogout={handleLogout}
        role={role}
      />

      {/* CORE SCREEN CONTENT SHELF */}
      <main className="flex-1 p-4 lg:p-8 mt-16 lg:mt-0 max-w-full overflow-x-hidden">
        {isLoadingStats && !stats ? (
          // FULL PAGE BOOT SKELETON
          <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <svg className="animate-spin h-10 w-10 text-primary-blue" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
            <p className="text-sm text-text-muted font-medium animate-pulse">
              Authenticating console states & feeds...
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.15 }}
              className="max-w-7xl mx-auto"
            >
              {activeTab === 'dashboard' && stats && (
                <DashboardHome
                  stats={stats}
                  recentOrders={recentOrders}
                  recentUsers={recentUsers}
                  pendingBonuses={pendingBonuses}
                  pendingWithdrawalsCount={pendingWithdrawalsCount}
                  pendingWithdrawalsSum={pendingWithdrawalsSum}
                  onNavigateToOrders={handleNavigateToOrders}
                  onNavigateToUsers={handleNavigateToUsers}
                  onNavigateToWithdrawals={() => setActiveTab('withdrawals')}
                  onSelectOrder={setSelectedOrder}
                  onRefresh={() => fetchDashboardStats(true)}
                  isRefreshing={isRefreshingStats}
                />
              )}

              {activeTab === 'dashboard' && !stats && (
                <div className="flex flex-col items-center justify-center min-h-[50vh] p-6 text-center max-w-md mx-auto space-y-5">
                  <div className="w-14 h-14 bg-red-105 text-red-600 rounded-xl flex items-center justify-center shadow-sm">
                    <AlertCircle className="w-7 h-7" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 tracking-tight">Console Sync Standby</h2>
                    <p className="text-slate-500 mt-2 text-sm leading-relaxed">
                      We couldn't reach the live operational API database to sync real-time administrator metrics.
                    </p>
                  </div>
                  <div className="flex justify-center pt-2 w-full">
                    <button
                      onClick={() => fetchDashboardStats(false)}
                      className="inline-flex items-center justify-center px-5 py-2.5 bg-primary-blue hover:bg-blue-600 text-white font-semibold rounded-xl text-sm shadow-md transition-all focus:outline-none cursor-pointer"
                    >
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin-hover" /> Retry Connection
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'orders' && (
                <OrdersView
                  adminSecret={adminSecret}
                  role={role}
                  initialPendingFilter={initialPendingFilterActive}
                  initialBonusPendingFilter={initialBonusPendingFilterActive}
                  addToast={addToast}
                  onRefreshStats={() => fetchDashboardStats(true)}
                  onSelectOrder={setSelectedOrder}
                />
              )}

              {activeTab === 'withdrawals' && (
                <WithdrawalsView
                  adminSecret={adminSecret}
                  addToast={addToast}
                  onProcessed={() => fetchDashboardStats(true)}
                />
              )}

              {activeTab === 'users' && (
                <UsersView
                  adminSecret={adminSecret}
                  addToast={addToast}
                />
              )}

              {activeTab === 'plans' && (
                <PlansView
                  adminSecret={adminSecret}
                  addToast={addToast}
                />
              )}

              {activeTab === 'settings' && (
                <SettingsView
                  adminSecret={adminSecret}
                  addToast={addToast}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  adminSecret={adminSecret}
                  addToast={addToast}
                />
              )}

              {activeTab === 'margins' && (
                <MarginsView adminSecret={adminSecret} addToast={addToast} />
              )}

              {activeTab === 'activity' && (
                <ActivityView adminSecret={adminSecret} addToast={addToast} />
              )}

              {activeTab === 'push' && (
                <PushView adminSecret={adminSecret} addToast={addToast} />
              )}

              {activeTab === 'export' && (
                <ExportView
                  adminSecret={adminSecret}
                  addToast={addToast}
                />
              )}
              
              {activeTab === 'inactive' && (
                <InactiveAccountsView adminSecret={adminSecret} addToast={addToast} />
              )}

              {activeTab === 'streaks' && (
                <StreaksView adminSecret={adminSecret} addToast={addToast} />
              )}

              {activeTab === 'ambassadors' && (
                <AmbassadorsView adminSecret={role === 'sub_admin' ? (subAdminSecret || '') : (adminSecret || '')} addToast={addToast} role={role} />
              )}

              {activeTab === 'financial' && (
                <FinancialReportView adminSecret={adminSecret} addToast={addToast} />
              )}

              {activeTab === 'feedback' && (
                <FeedbackView adminSecret={adminSecret || ''} addToast={addToast} />
              )}

              {activeTab === 'recharge_cards' && (
                <RechargeCardsView adminSecret={adminSecret || ''} addToast={addToast} />
              )}

              {activeTab === 'audit' && (
                <AuditView
                  adminSecret={adminSecret}
                  addToast={addToast}
                />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </main>

      {/* REUSABLE GLOBAL INVOICE OVERLAY */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          adminSecret={adminSecret}
          addToast={addToast}
          onRefreshAll={() => fetchDashboardStats(true)}
        />
      )}

      {/* TOAST ALERTS OVERLAY */}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}
