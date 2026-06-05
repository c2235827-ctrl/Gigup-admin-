import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { RefreshCw, Users, Wifi, WifiOff, Clock, Activity, History } from 'lucide-react';
import { fetchUserActivity, fetchUserSessions } from '../services/api';
import { UserActivity, SessionRecord, ActivitySummary } from '../types';

interface ActivityViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const cardVariants = {
  hidden: { opacity: 0, y: 15 },
  show: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 260, damping: 25 } },
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

export default function ActivityView({ adminSecret, addToast }: ActivityViewProps) {
  const [summary, setSummary] = useState<ActivitySummary | null>(null);
  const [users, setUsers] = useState<UserActivity[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'online' | 'inactive'>('all');
  const [selectedUser, setSelectedUser] = useState<UserActivity | null>(null);
  const [sessions, setSessions] = useState<SessionRecord[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const result = await fetchUserActivity(adminSecret);
      setSummary(result.summary);
      setUsers(result.users);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load activity');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSessions = async (user: UserActivity) => {
    setSelectedUser(user);
    setSessionsLoading(true);
    try {
      const result = await fetchUserSessions(adminSecret, user.id);
      setSessions(result.sessions);
    } catch (err: any) {
      addToast('error', 'Failed to load sessions');
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh online status every 30 seconds
  useEffect(() => {
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const filteredUsers = users.filter(u => {
    if (filter === 'online') return u.is_online;
    if (filter === 'inactive') return u.is_inactive;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">User Activity</h1>
          <p className="text-sm text-text-muted mt-1">
            Who is online, when they last opened the app, and how long they spend.
          </p>
        </div>
        <button
          onClick={loadData}
          disabled={isLoading}
          className="px-3 py-1.5 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-1.5 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-blue' : ''}`} />
          Refresh
        </button>
      </div>

      {/* SUMMARY CARDS */}
      {summary && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {[
            { label: 'Online Now', value: summary.online_count, icon: <Wifi className="w-5 h-5" />, color: 'text-success', bg: 'bg-green-50' },
            { label: 'Active Today', value: summary.active_today, icon: <Activity className="w-5 h-5" />, color: 'text-primary-blue', bg: 'bg-blue-50' },
            { label: 'Inactive 3+ Days', value: summary.inactive_count, icon: <WifiOff className="w-5 h-5" />, color: 'text-danger', bg: 'bg-red-50' },
            { label: 'Total Users', value: summary.total_users, icon: <Users className="w-5 h-5" />, color: 'text-pending', bg: 'bg-purple-50' },
          ].map(card => (
            <motion.div
              key={card.label}
              variants={cardVariants}
              className="bg-white p-5 rounded-xl border border-slate-105 shadow-geometric flex flex-col justify-between h-28"
            >
              <div className="flex justify-between items-start">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{card.label}</span>
                <div className={`w-9 h-9 rounded-lg ${card.bg} ${card.color} flex items-center justify-center shrink-0`}>
                  {card.icon}
                </div>
              </div>
              <span className="text-3xl font-bold font-mono text-slate-900">{card.value}</span>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* FILTER TABS */}
      <div className="flex gap-2">
        {(['all', 'online', 'inactive'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-1.5 text-xs font-bold rounded-lg border transition-all cursor-pointer capitalize ${
              filter === f
                ? 'bg-primary-blue text-white border-primary-blue shadow-sm'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
          >
            {f === 'online' ? '🟢 Online' : f === 'inactive' ? '🔴 Inactive' : 'All Users'}
          </button>
        ))}
      </div>

      {/* USERS TABLE */}
      <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">User</th>
                <th className="px-5 py-4">Last Seen</th>
                <th className="px-5 py-4 text-center">Sessions</th>
                <th className="px-5 py-4 text-center">Time Spent</th>
                <th className="px-5 py-4"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#EEF1F8] text-xs">
              {isLoading && users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    Loading activity list...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-400">
                    No users found matching this filter.
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr key={user.id} className="hover:bg-slate-50/30 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`w-2.5 h-2.5 rounded-full ${user.is_online ? 'bg-success animate-pulse' : 'bg-slate-300'}`} />
                        <span className={`text-[10px] font-bold ${user.is_online ? 'text-success' : 'text-slate-400'}`}>
                          {user.is_online ? 'Online' : 'Offline'}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <div className="font-semibold text-slate-900">{user.full_name}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{user.phone}</div>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`font-medium ${user.is_inactive ? 'text-danger font-bold' : 'text-slate-700'}`}>
                        {user.last_seen_ago}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-center font-mono font-bold text-slate-700">
                      {user.total_sessions}
                    </td>
                    <td className="px-5 py-3 text-center font-mono text-slate-600">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{user.total_time_formatted}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <button
                        onClick={() => loadSessions(user)}
                        className="text-[11px] font-bold text-primary-blue hover:underline cursor-pointer inline-flex items-center gap-1"
                      >
                        <History className="w-3 h-3" />
                        Sessions &rarr;
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SESSION HISTORY MODAL */}
      {selectedUser && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setSelectedUser(null)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-slate-900">{selectedUser.full_name}</h3>
                <p className="text-xs text-slate-500">
                  {selectedUser.total_sessions} sessions &middot; {selectedUser.total_time_formatted} total time
                </p>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold cursor-pointer"
              >
                &times;
              </button>
            </div>
            <div className="overflow-y-auto divide-y divide-slate-100">
              {sessionsLoading ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  Loading sessions...
                </div>
              ) : sessions.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  No sessions recorded yet.
                </div>
              ) : (
                sessions.map(s => (
                  <div key={s.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-slate-800">{s.started_ago}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(s.started_at).toLocaleString('en-NG')}
                      </div>
                    </div>
                    <div className="text-right">
                      {s.still_active ? (
                        <span className="text-xs font-bold text-success flex items-center gap-1">
                          <span className="w-1.5 h-1.5 bg-success rounded-full animate-pulse" />
                          Active now
                        </span>
                      ) : (
                        <span className="text-xs font-mono font-bold text-slate-600">
                          {s.duration_formatted}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
