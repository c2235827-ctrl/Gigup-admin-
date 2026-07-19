export interface Stats {
  total_users: number;
  total_orders: number;
  pending_orders: number;
  total_revenue: number;
  total_cashback_given: number;
  net_revenue: number;
  orders_by_network: Record<string, number>;
  top_spenders?: { id: string; full_name: string; phone: string; wallet_balance: number; total_spent: number; successful_orders?: number }[];
  utility_services?: {
    airtime: { total_orders: number; successful: number; pending: number; failed: number; total_volume: number };
    cable: { total_orders: number; successful: number; pending: number; failed: number; total_volume: number };
    electricity: { total_orders: number; successful: number; pending: number; failed: number; total_volume: number };
    total_pending: number;
    total_volume: number;
  };
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
  smedata_plan_id?: string | null;
  validity: string;
  active: boolean;
  primary_provider?: string | null;
  peyflex_plan_code?: string | null;
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
  top_spenders?: { id: string; full_name: string; phone: string; wallet_balance: number; total_spent: number; successful_orders?: number }[];
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
  provider_cost?: number;
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
  total_provider_cost?: number;
  total_gross_markup: number;
  total_cashback_given: number;
  total_net_profit: number;
  primary_provider?: string;
}

export interface MarginsData {
  success: boolean;
  summary: {
    overall_total_revenue: number;
    overall_total_smedata_cost: number;
    overall_total_provider_cost?: number;
    overall_total_gross_markup: number;
    overall_total_cashback: number;
    overall_total_net_profit: number;
    total_plans: number;
    active_plans?: number;
    inactive_plans?: number;
    zero_margin_plans_count?: number;
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
    total_provider_cost?: number;
    total_gross_markup: number;
    total_cashback_given: number;
    total_net_profit: number;
    units_sold: number;
    loss_plans: number;
  }>;
  by_provider?: Array<{
    provider: string;
    total_plans: number;
    active_plans: number;
    inactive_plans: number;
    total_revenue: number;
    total_provider_cost: number;
    total_gross_markup: number;
    total_cashback_given: number;
    total_net_profit: number;
    units_sold: number;
    loss_plans: number;
  }>;
  plans: PlanMargin[];
  loss_plans: PlanMargin[];
  zero_margin_plans?: PlanMargin[];
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

export interface Ambassador {
  id: string; full_name: string; phone: string; email: string | null;
  referral_code: string; tier_label: string; monthly_pay: number;
  status: 'active' | 'suspended'; notes: string | null; created_at: string;
  total_signups?: number; qualified_signups?: number;
  current_tier_pay?: number; next_tier_at?: number | null;
  bank_name?: string | null; account_number?: string | null; account_name?: string | null;
}
export interface AmbassadorStats {
  total_signups: number; qualified_signups: number; total_orders: number;
  successful_orders: number; failed_orders: number; total_volume: number;
  current_tier_pay: number; current_tier_min: number;
  next_tier_at: number | null; next_tier_pay: number | null; level2_referrals: number;
}
export interface AmbassadorDetail {
  ambassador: {
    id: string;
    full_name: string;
    phone: string;
    referral_code: string;
    status: string;
    email?: string | null;
    bank_name?: string | null;
    account_number?: string | null;
    account_name?: string | null;
  };
  stats: AmbassadorStats;
  direct_referrals: Array<{ id: string; full_name: string; phone: string; qualified: boolean; wallet_balance: number; cashback_balance: number; created_at: string }>;
  level2_referrals: Array<{ id: string; full_name: string; phone: string; first_topup_done: boolean; created_at: string; referred_by: string }>;
  recent_orders: Array<{ user_id: string; amount: number; status: string; plan_name: string; network: string; created_at: string }>;
}

export interface FinancialSummary {
  orders: {
    successful: { count: number; revenue: number; label: string };
    pending: { count: number; revenue: number };
    failed: { count: number; total_value: number; label: string };
    total: number;
  };
  recharge_cards?: {
    successful_orders: number;
    under_review_orders: number;
    processing_orders: number;
    revenue: number;
    peyflex_cost: number;
    card_markup_profit: number;
    subscription_revenue: number;
    total_profit: number;
  };
  cashback: { paid_on_successful_orders: number; owed_on_pending_orders: number };
  smedata: { cost_of_successful_orders: number; funding_needed_for_pending: number; recommendation: string };
  expenses: {
    cashback_paid: { total: number; count: number };
    referral_rewards: { total: number; count: number };
    streak_rewards: { total: number; count: number };
    recovery_bonuses: { total: number; count: number };
    welcome_vouchers_used: { total: number; count: number };
    total_real_expenses: number;
  };
  liabilities: { welcome_bonuses_issued: { total: number; count: number; note: string } };
  profit: {
    gross_revenue: number;
    smedata_cost: number;
    gross_profit: number;
    total_real_expenses: number;
    net_profit: number;
    net_profit_margin_pct: number;
    combined_gross_revenue?: number;
    combined_net_profit?: number;
    combined_net_profit_margin_pct?: number;
    summary: string;
  };
  pending_orders_detail: Array<{
    id: string;
    recipient_phone: string;
    network: string;
    plan_name: string;
    amount: number;
    created_at: string;
    failure_reason: string | null;
  }>;
}

export interface FinancialReport {
  success: boolean;
  period: { from: string; to: string };
  orders: {
    total: number;
    successful: {
      count: number;
      total_amount: number;
      total_cashback_paid: number;
      by_provider?: {
        smedata: { count: number; total_amount: number };
        peyflex: { count: number; total_amount: number };
      };
    };
    failed: { count: number; total_value: number; note: string };
    pending: { count: number; total_amount_reserved: number; estimated_cashback_owed_on_fulfillment: number; estimated_net_profit_if_fulfilled: number };
    queued_for_retry: { count: number; total_amount: number };
  };
  financials: {
    gross_revenue: number;
    cashback_paid_to_users: number;
    welcome_bonus_absorbed: number;
    total_expenses: number;
    net_profit: number;
  };
  welcome_bonus: {
    per_user_amount: number;
    total_users: number;
    total_committed: number;
    already_spent_on_orders: number;
    still_in_wallets: number;
    breakdown: { users_full_unused: number; users_partially_used: number; users_fully_spent: number };
  };
  smedata_funding: {
    queued_orders_total: number;
    recommended_topup: number;
    note: string;
  };
  provider_wallets: {
    smedata:  { balance: number | null; status: 'ok' | 'low' | 'unavailable' };
    peyflex:  { balance: number | null; status: 'ok' | 'low' | 'unavailable' };
    combined_balance: number;
    can_fulfill_queued_orders: boolean;
    note: string;
  };
}

export interface AppRating {
  stars: number;
  comment: string | null;
  cycle_week: string;
  created_at: string;
  users: { full_name: string; phone: string };
}

export interface SurveyResponseItem {
  answer_text: string;
  created_at: string;
  users: { full_name: string; phone: string };
  survey_questions: { question_text: string; question_type: string };
}

export interface SurveyQuestion {
  id: string;
  question_text: string;
  question_type: 'text' | 'multiple_choice' | 'rating';
  options: string[] | null;
  is_active: boolean;
  created_at: string;
}

export interface FeedbackOverview {
  ratings_summary: {
    average_rating: string | null;
    total_ratings: number;
    breakdown: { star: number; count: number }[];
  };
  recent_ratings: AppRating[];
  recent_survey_responses: SurveyResponseItem[];
  survey_stats: {
    total_responses: number;
    total_completed_surveys: number;
    total_dismissed: number;
  };
}

export interface RechargeCardStats {
  active_subscriptions: number;
  active_weekly: number;
  active_monthly: number;
  total_orders: number;
  success_orders: number;
  failed_or_review_orders: number;
  success_rate_pct: number;
  total_peyflex_spend: number;
  total_card_markup_profit: number;
  total_subscription_revenue: number;
  total_combined_profit: number;
  unresolved_reconciliation_amount: number;
  unresolved_reconciliation_count: number;
  pending_review_count: number;
  pending_review_total_amount: number;
}

export interface RechargeCardConfig {
  weekly_price: number;
  weekly_batches: number;
  monthly_price: number;
  monthly_batches: number;
  max_per_batch: number;
  markup_per_card: number;
  enabled: boolean;
  account_tier: 'api_user' | 'top_reseller';
  token_configured: boolean;
  pin_configured: boolean;
}

export interface RechargeCardSubscription {
  id: string;
  plan_type: 'weekly' | 'monthly';
  price_paid: number;
  status: string;
  starts_at: string;
  expires_at: string;
  users: { full_name: string; phone: string };
}

export interface RechargeCardOrder {
  id: string;
  network: string;
  face_value: number;
  quantity_ordered: number;
  quantity_delivered: number;
  total_charged: number;
  gigup_profit: number;
  status: string;
  created_at: string;
  users: { full_name: string; phone: string };
}

export interface ReconciliationItem {
  id: string;
  order_id: string;
  amount_charged_but_undelivered: number;
  status: string;
  notes: string | null;
  created_at: string;
}

export interface RechargeCardOverview {
  stats: RechargeCardStats;
  config: RechargeCardConfig;
  recent_subscriptions: RechargeCardSubscription[];
  recent_orders: RechargeCardOrder[];
  unresolved_reconciliation: ReconciliationItem[];
}

export interface PeyflexRate {
  id: string;
  network: string;
  face_value: number;
  api_user_cost: number;
  top_reseller_cost: number;
}

export interface DenominationBreakdownItem {
  network: string;
  face_value: number;
  orders_count: number;
  total_delivered: number;
  total_cost: number;
  total_revenue: number;
  profit: number;
}

export interface BusinessPartner {
  id: string;
  business_name: string;
  contact_name: string | null;
  phone: string;
  email: string | null;
  business_type: 'restaurant' | 'cybercafe' | 'pos_agent' | 'community_org' | 'other';
  referral_code: string;
  tier_label: string;
  monthly_pay: number;
  status: 'trial' | 'active' | 'suspended' | 'inactive';
  trial_ends_at: string | null;
  notes: string | null;
  total_earned: number;
  total_paid: number;
  balance_owed: number;
  total_referrals: number;
  qualified_referrals: number;
  created_at: string;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
}

export interface BusinessPartnerDetail {
  partner: BusinessPartner;
  referred_users: { id: string; full_name: string; phone: string; first_topup_done: boolean; created_at: string }[];
  total_referrals: number;
  qualified_referrals: number;
  current_tier: { tier_label: string; monthly_pay: number };
}

export interface BlacklistedIp {
  id: string;
  ip_address: string;
  reason: string | null;
  blacklisted_by: string;
  created_at: string;
}

export interface IpCluster {
  ip_address: string;
  account_count: number;
  accounts: { id: string; full_name: string; phone: string; signup_ip: string; created_at: string }[];
}

export interface UtilityServiceSummary {
  total_orders: number;
  successful: number;
  pending: number;
  failed: number;
  total_revenue: number;
  total_cost: number;
  profit: number;
}

export interface UtilityServicesSummary {
  airtime: UtilityServiceSummary;
  cable: UtilityServiceSummary;
  electricity: UtilityServiceSummary;
  combined: UtilityServiceSummary & { note: string };
}

export interface UtilityOrder {
  id: string;
  status: 'success' | 'pending' | 'failed';
  created_at: string;
  failure_reason: string | null;
  users: { full_name: string; phone: string } | null;
  recipient_phone?: string;
  network?: string;
  amount?: number;
  peyflex_cost?: number;
  provider?: string;
  plan_label?: string;
  iuc?: string;
  amount_charged?: number;
  disco_name?: string;
  meter_number?: string;
  token?: string;
}


