import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { fetchStats, fetchUsers, fetchOrders, fetchWithdrawals, getMockMode, setMockMode } from './services/api';
import { Stats, Order, User, DashboardData } from './types';

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

export default function App() {
  // Session Authentication State
  const [adminSecret, setAdminSecret] = useState<string | null>(() => {
    return sessionStorage.getItem('gigup_admin_secret');
  });

  // Global Toast Lists
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Navigation and screen tab trackers
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [initialPendingFilterActive, setInitialPendingFilterActive] = useState(false);

  // Core administrative states
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentUsers, setRecentUsers] = useState<User[]>([]);

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
  const handleLoginSuccess = (secretToken: string) => {
    sessionStorage.setItem('gigup_admin_secret', secretToken);
    setAdminSecret(secretToken);
    setActiveTab('dashboard');
  };

  // Logout handler
  const handleLogout = () => {
    sessionStorage.removeItem('gigup_admin_secret');
    setAdminSecret(null);
    setStats(null);
    setRecentOrders([]);
    setRecentUsers([]);
    addToast('info', 'Logged out successfully');
  };

  // Core Stats & Metrics Fetch Wrapper
  const fetchDashboardStats = async (isSilent = false) => {
    if (!adminSecret) return;
    
    if (!isSilent) setIsLoadingStats(true);
    else setIsRefreshingStats(true);

    try {
      const [dashboardData, withdrawalsRes] = await Promise.all([
        fetchStats(adminSecret),
        fetchWithdrawals(adminSecret, 'pending')
      ]);
      setStats(dashboardData.stats);
      setRecentOrders(dashboardData.recent_orders);
      setRecentUsers(dashboardData.recent_users);
      if (withdrawalsRes.success) {
        setPendingWithdrawalsCount(withdrawalsRes.withdrawals.length);
        const sum = withdrawalsRes.withdrawals.reduce((acc, curr) => acc + curr.amount, 0);
        setPendingWithdrawalsSum(sum);
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
    if (adminSecret) {
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
  }, [adminSecret]);

  // Handle routing commands between metrics cards and sheets
  const handleNavigateToOrders = (filterPending: boolean) => {
    setInitialPendingFilterActive(filterPending);
    setActiveTab('orders');
  };

  const handleNavigateToUsers = () => {
    setActiveTab('users');
  };

  // If no session exists, render the stylized auth portal
  if (!adminSecret) {
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
          }
        }}
        pendingOrdersCount={stats?.pending_orders || 0}
        pendingWithdrawalsCount={pendingWithdrawalsCount}
        onLogout={handleLogout}
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

              {activeTab === 'orders' && (
                <OrdersView
                  adminSecret={adminSecret}
                  initialPendingFilter={initialPendingFilterActive}
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
