import { useState } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Users, 
  Radio, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck, 
  Database,
  Coins,
  BarChart2,
  Download,
  History,
  TrendingUp
} from 'lucide-react';

export type ActiveTab = 'dashboard' | 'orders' | 'withdrawals' | 'users' | 'plans' | 'settings' | 'analytics' | 'export' | 'audit' | 'margins';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  pendingOrdersCount: number;
  pendingWithdrawalsCount: number;
  onLogout: () => void;
}

export default function Sidebar({ activeTab, setActiveTab, pendingOrdersCount, pendingWithdrawalsCount, onLogout }: SidebarProps) {
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);

  const menuItems = [
    { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
    { 
      id: 'orders' as ActiveTab, 
      label: 'Orders', 
      icon: ShoppingBag, 
      badge: pendingOrdersCount > 0 ? pendingOrdersCount : undefined 
    },
    { 
      id: 'withdrawals' as ActiveTab, 
      label: 'Withdrawals', 
      icon: Coins, 
      badge: pendingWithdrawalsCount > 0 ? pendingWithdrawalsCount : undefined,
      badgeColor: 'bg-red-500 text-white font-bold'
    },
    { id: 'users' as ActiveTab, label: 'Users', icon: Users },
    { id: 'analytics' as ActiveTab, label: 'Analytics', icon: BarChart2 },
    { id: 'margins' as ActiveTab, label: 'Plan Margins', icon: TrendingUp },
    { id: 'export' as ActiveTab, label: 'Export Users', icon: Download },
    { id: 'audit' as ActiveTab, label: 'Audit Logs', icon: History },
    { id: 'plans' as ActiveTab, label: 'Plans', icon: Radio },
    { id: 'settings' as ActiveTab, label: 'Settings', icon: Settings },
  ];

  const handleTabClick = (tabId: ActiveTab) => {
    setActiveTab(tabId);
    setIsOpen(false);
  };

  return (
    <>
      {/* MOBILE TOP NAVIGATION BAR */}
      <header className="lg:hidden h-16 bg-primary-dark w-full px-4 flex items-center justify-between z-30 fixed top-0 left-0 border-b border-white/5">
        <div className="flex items-center gap-2">
          <img 
            src="https://cdn-icons-png.flaticon.com/512/15106/15106527.png" 
            alt="Hummingbird Icon" 
            className="w-6 h-6 object-contain" 
            referrerPolicy="no-referrer" 
          />
          <span className="text-white font-bold tracking-tight text-lg">GigUp Nigeria Admin</span>
        </div>
        <button 
          onClick={toggleSidebar}
          aria-label="Toggle navigation menu"
          className="text-white p-1 hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </header>

      {/* BACKDROP FOR MOBILE DRAWER */}
      {isOpen && (
        <div 
          onClick={toggleSidebar}
          className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
        />
      )}

      {/* SIDEBAR WRAPPER */}
      <aside 
        id="sidebar"
        className={`fixed inset-y-0 left-0 w-64 bg-primary-dark text-white flex flex-col z-40 transition-transform duration-300 lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } lg:sticky lg:h-screen lg:top-0`}
      >
        {/* SIDEBAR HEADER */}
        <div className="h-20 flex items-center px-6 border-b border-white/5 gap-3 shrink-0">
          <div className="w-8 h-8 items-center justify-center flex rounded-md bg-transparent">
            <img 
              src="https://cdn-icons-png.flaticon.com/512/15106/15106527.png" 
              alt="Hummingbird Icon" 
              className="w-8 h-8 object-contain" 
              referrerPolicy="no-referrer" 
            />
          </div>
          <div>
            <h2 className="font-bold tracking-tight text-white font-sans text-base leading-none">
              GigUp Nigeria Admin
            </h2>
            <p className="text-[10px] text-text-muted mt-1 leading-none">
              Control Panel v2.0.4
            </p>
          </div>
        </div>

        {/* MAIN NAVIGATION ITEMS */}
        <nav className="flex-1 py-6 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleTabClick(item.id)}
                className={`w-full flex items-center justify-between px-6 py-3.5 text-sm font-medium transition-all group cursor-pointer border-l-4 ${
                  isActive 
                    ? 'bg-white/5 text-white border-primary-blue' 
                    : 'text-white/60 border-transparent hover:text-white hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge !== undefined && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center justify-center animate-pulse ${
                    item.badgeColor || 'bg-primary-blue text-white'
                  }`}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* LOGOUT BUTTON FOOTER */}
        <div className="p-4 border-t border-white/5 shrink-0">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-6 py-3 text-sm font-medium text-red-405 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-all group cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-red-400 group-hover:translate-x-[-2px] transition-transform" />
            <span>Logout Account</span>
          </button>
        </div>
      </aside>
    </>
  );
}
