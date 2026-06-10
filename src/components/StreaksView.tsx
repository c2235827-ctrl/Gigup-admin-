import { useState } from 'react';
import { motion } from 'motion/react';
import { Flame, RefreshCw, Bell, Send } from 'lucide-react';
import { fetchUserStreaks, triggerScheduledNotification } from '../services/api';
import { UserStreakAdmin } from '../types';
import { getInitials } from '../utils/formatters';

interface StreaksViewProps {
  adminSecret: string;
  addToast: (type: 'success' | 'error' | 'warning' | 'info', message: string) => void;
}

const SCHEDULED_ACTIONS = [
  {
    type: 'weekly_report' as const,
    label: '📊 Weekly Cashback Report',
    description: 'Send every user their weekly cashback summary',
    color: 'bg-blue-50 border-blue-200 text-primary-blue',
    btnColor: 'bg-primary-blue',
  },
  {
    type: 'streak_reminder' as const,
    label: '🔥 Streak Reminder',
    description: 'Remind users who haven\'t opened the app today',
    color: 'bg-orange-50 border-orange-200 text-orange-700',
    btnColor: 'bg-orange-500',
  },
  {
    type: 'referral_nudge' as const,
    label: '🎁 Referral Nudge',
    description: 'Nudge users signed up 48hrs ago with no referrals',
    color: 'bg-green-50 border-green-200 text-green-700',
    btnColor: 'bg-success',
  },
  {
    type: 'monthly_statement' as const,
    label: '📋 Monthly Statement',
    description: 'Send all users their monthly cashback statement',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    btnColor: 'bg-pending',
  },
];

export default function StreaksView({ adminSecret, addToast }: StreaksViewProps) {
  const [streaks, setStreaks] = useState<UserStreakAdmin[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [sendingType, setSendingType] = useState<string | null>(null);

  const loadStreaks = async () => {
    setIsLoading(true);
    try {
      const result = await fetchUserStreaks(adminSecret);
      setStreaks(result);
      setIsLoaded(true);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to load streaks');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTrigger = async (type: typeof SCHEDULED_ACTIONS[0]['type'], label: string) => {
    setSendingType(type);
    try {
      const result = await triggerScheduledNotification(adminSecret, type);
      const count = result.sent ?? result.reminded ?? result.nudged ?? 0;
      addToast('success', `✅ ${label} sent to ${count} user${count !== 1 ? 's' : ''}`);
    } catch (err: any) {
      addToast('error', err.message || 'Failed to send notification');
    } finally {
      setSendingType(null);
    }
  };

  const getStreakEmoji = (streak: number) => {
    if (streak >= 30) return '👑';
    if (streak >= 21) return '🏆';
    if (streak >= 14) return '⭐';
    if (streak >= 7) return '🔥';
    if (streak >= 3) return '✨';
    return '💤';
  };

  const getStreakColor = (streak: number) => {
    if (streak >= 14) return 'text-amber-500';
    if (streak >= 7) return 'text-orange-500';
    if (streak >= 3) return 'text-primary-blue';
    return 'text-slate-400';
  };

  return (
    <div className="space-y-8">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Streaks & Notifications</h1>
          <p className="text-sm text-text-muted mt-1">
            Monitor user streaks and trigger scheduled notifications manually.
          </p>
        </div>
        <button
          onClick={loadStreaks}
          disabled={isLoading}
          className="px-4 py-2 text-xs font-bold rounded-lg border bg-white text-slate-600 border-slate-200 hover:bg-slate-50 flex items-center gap-2 cursor-pointer self-start"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-primary-blue' : ''}`} />
          {isLoaded ? 'Refresh' : 'Load Streaks'}
        </button>
      </div>

      {/* SCHEDULED NOTIFICATIONS */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
          📅 Scheduled Notifications — Send Manually
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {SCHEDULED_ACTIONS.map((action) => (
            <motion.div
              key={action.type}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`rounded-xl border p-4 ${action.color}`}
            >
              <h3 className="text-sm font-bold mb-1">{action.label}</h3>
              <p className="text-xs opacity-70 mb-4">{action.description}</p>
              <button
                onClick={() => handleTrigger(action.type, action.label)}
                disabled={sendingType === action.type}
                className={`w-full py-2.5 ${action.btnColor} text-white text-xs font-bold rounded-xl flex items-center justify-center gap-2 cursor-pointer transition-opacity ${sendingType === action.type ? 'opacity-60' : ''}`}
              >
                {sendingType === action.type ? (
                  <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : <Send className="w-3.5 h-3.5" />}
                {sendingType === action.type ? 'Sending...' : 'Send Now'}
              </button>
            </motion.div>
          ))}
        </div>

        {/* Cron job info */}
        <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Bell className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-700 mb-1">Automatic Schedule (via cron-job.org)</p>
              <div className="text-[11px] text-slate-500 space-y-0.5">
                <p>📊 Weekly Report → Every Monday 8AM</p>
                <p>🔥 Streak Reminder → Every day 7PM</p>
                <p>🎁 Referral Nudge → Every day 10AM</p>
                <p>📋 Monthly Statement → Every 1st of month 9AM</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STREAKS TABLE */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
          🔥 User Streaks
        </h2>

        {!isLoaded && !isLoading && (
          <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-12 text-center">
            <Flame className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 text-sm font-medium">Click "Load Streaks" to view</p>
          </div>
        )}

        {isLoading && (
          <div className="bg-white rounded-xl border border-slate-105 shadow-geometric p-12 text-center">
            <RefreshCw className="w-8 h-8 text-primary-blue mx-auto mb-3 animate-spin" />
            <p className="text-slate-500 text-sm">Loading streaks...</p>
          </div>
        )}

        {isLoaded && streaks.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-105 shadow-geometric overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#FAFBFF] border-b border-[#EEF1F8] text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                    <th className="px-5 py-4">User</th>
                    <th className="px-5 py-4 text-center">Current Streak</th>
                    <th className="px-5 py-4 text-center">Longest</th>
                    <th className="px-5 py-4 text-center">Day 7</th>
                    <th className="px-5 py-4 text-center">Day 14</th>
                    <th className="px-5 py-4 text-center">Day 21</th>
                    <th className="px-5 py-4 text-center">Day 30</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF1F8] text-xs">
                  {streaks
                    .sort((a, b) => b.current_streak - a.current_streak)
                    .map((user) => (
                    <tr key={user.user_id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600 shrink-0">
                            {getInitials(user.full_name)}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900">{user.full_name}</p>
                            <p className="text-slate-400 font-mono text-[10px]">{user.phone}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <span className="text-base">{getStreakEmoji(user.current_streak)}</span>
                          <span className={`font-black text-base font-mono ${getStreakColor(user.current_streak)}`}>
                            {user.current_streak}
                          </span>
                          <span className="text-slate-400 text-[10px]">days</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-center font-mono font-bold text-slate-500">
                        {user.longest_streak}
                      </td>
                      {[
                        user.streak_reward_7_claimed,
                        user.streak_reward_14_claimed,
                        user.streak_reward_21_claimed,
                        user.streak_reward_30_claimed,
                      ].map((claimed, i) => (
                        <td key={i} className="px-5 py-3 text-center">
                          <span className={`text-base ${claimed ? 'opacity-100' : 'opacity-20'}`}>
                            {claimed ? '✅' : '⬜'}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
