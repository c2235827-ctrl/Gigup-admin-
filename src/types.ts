export interface Stats {
  total_users: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  total_cashback_given: number;
  net_revenue: number;
  orders_by_network: Record<string, number>;
}

export interface Order {
  id: string;
  user_id: string;
  recipient_phone: string;
  network: string;
  plan_name: string;
  amount: number;
  status: 'success' | 'failed' | 'pending';
  cashback_amount: number;
  smedata_ref: string;
  created_at: string;
  users?: {
    full_name: string;
    phone: string;
  } | null;
}

export interface User {
  id: string;
  phone: string;
  full_name: string;
  wallet_balance: number;
  referral_code: string;
  signup_bonus_claimed: boolean;
  total_orders: number;
  successful_orders?: number;
  total_spent?: number;
  cashback_balance?: number;
  bonus_balance?: number;
  created_at: string;
}

export interface GatewayStatus {
  flw_mode: 'test' | 'live';
  flw_secret_key_preview: string;
  is_configured: boolean;
}

export interface Plan {
  id: string;
  network: string;
  plan_name: string;
  size_label: string;
  price: number;
  smedata_plan_id: string;
  validity: string;
  active: boolean;
}

export interface AppSetting {
  key: string;
  value: string;
  label: string;
  description: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: 'pending' | 'paid' | 'rejected';
  admin_note: string | null;
  created_at: string;
  processed_at: string | null;
  users?: {
    full_name: string;
    phone: string;
  } | null;
}

export interface DashboardData {
  stats: Stats;
  recent_orders: Order[];
  recent_users: User[];
}

export interface AnalyticsSummary {
  total_revenue: number;
  total_cashback_cost: number;
  net_revenue: number;
  total_topups: number;
  total_orders: number;
  total_failed: number;
  total_signups: number;
  failure_rate: string;
}

export interface AnalyticsData {
  success: boolean;
  range_days: number;
  summary: AnalyticsSummary;
  peaks: {
    busiest_day: string;
    busiest_hour: string;
    quietest_day: string;
    quietest_hour: string;
  };
  charts: {
    daily_revenue: Array<{ date: string; revenue: number; cashback: number; net_revenue: number; orders: number; failed: number }>;
    daily_signups: Array<{ date: string; count: number }>;
    daily_topups: Array<{ date: string; amount: number }>;
    by_day_of_week: Array<{ day: string; orders: number; revenue: number }>;
    by_hour: Array<{ hour: number; label: string; orders: number; revenue: number }>;
    by_network: Array<{ network: string; orders: number; revenue: number; failed: number }>;
    signups_by_day: Array<{ day: string; count: number }>;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  action: string;
  category: 'user' | 'order' | 'withdrawal' | 'plan' | 'setting' | 'gateway';
  details: string;
  status: 'success' | 'failed';
  ipAddress?: string;
}

export interface PlanMargin {
  id: string;
  network: string;
  plan_name: string;
  size_label: string;
  validity: string;
  active: boolean;
  // Per sale
  smedata_price: number;
  we_charge: number;
  gross_markup: number;
  cashback_given: number;
  net_profit: number;
  net_margin_pct: number;
  markup_pct: number;
  is_loss: boolean;
  // Totals
  units_sold: number;
  total_revenue: number;
  total_smedata_cost: number;
  total_gross_markup: number;
  total_cashback_given: number;
  total_net_profit: number;
}

export interface MarginsData {
  success: boolean;
  summary: {
    overall_total_revenue: number;
    overall_total_smedata_cost: number;
    overall_total_gross_markup: number;
    overall_total_cashback: number;
    overall_total_net_profit: number;
    total_plans: number;
    loss_plans_count: number;
    best_margin_plan: string;
    best_margin_pct: number;
    most_profitable_plan: string;
    most_profitable_amount: number;
  };
  by_network: Array<{
    network: string;
    total_revenue: number;
    total_smedata_cost: number;
    total_gross_markup: number;
    total_cashback_given: number;
    total_net_profit: number;
    units_sold: number;
    loss_plans: number;
  }>;
  plans: PlanMargin[];
  loss_plans: PlanMargin[];
}

export interface UserActivity {
  id: string;
  full_name: string;
  phone: string;
  is_online: boolean;
  last_seen_ago: string;
  last_seen_at: string | null;
  total_sessions: number;
  total_time_formatted: string;
  days_since_last_seen: number | null;
  is_inactive: boolean;
  joined: string;
}

export interface SessionRecord {
  id: string;
  started_at: string;
  ended_at: string | null;
  duration_formatted: string;
  started_ago: string;
  still_active: boolean;
}

export interface ActivitySummary {
  online_count: number;
  inactive_count: number;
  active_today: number;
  total_users: number;
}

export interface InactiveAccount {
  id: string;
  full_name: string;
  phone: string;
  wallet_balance: number;
  cashback_balance: number;
  bonus_balance: number;
  total_sessions: number;
  last_seen_at: string | null;
  created_at: string;
  days_inactive: number;
  days_since_joined: number;
  safe_to_delete: boolean;
}

export interface UserStreakAdmin {
  user_id: string;
  full_name: string;
  phone: string;
  current_streak: number;
  longest_streak: number;
  last_activity_date: string | null;
  streak_reward_7_claimed: boolean;
  streak_reward_14_claimed: boolean;
  streak_reward_21_claimed: boolean;
  streak_reward_30_claimed: boolean;
}




