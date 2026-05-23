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
  created_at: string;
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

export interface DashboardData {
  stats: Stats;
  recent_orders: Order[];
  recent_users: User[];
}
