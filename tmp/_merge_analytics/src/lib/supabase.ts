import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface User {
  id: string
  email: string
  created_at: string
  updated_at: string
  subscription_status: 'active' | 'inactive' | 'canceled'
  stripe_customer_id?: string
  subscription_id?: string
}

export interface PropertySnapshot {
  id: string
  user_id: string
  property_address: string
  property_data: {
    zillow_data?: Record<string, unknown>
    census_data?: Record<string, unknown>
    market_data?: Record<string, unknown>
  }
  calculation_inputs: Record<string, unknown>
  calculation_results: Record<string, unknown>
  created_at: string
  updated_at: string
}

export interface Subscription {
  id: string
  user_id: string
  stripe_subscription_id: string
  status: 'active' | 'inactive' | 'canceled'
  current_period_start: string
  current_period_end: string
  plan_id: string
  created_at: string
  updated_at: string
}
