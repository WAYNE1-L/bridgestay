import { createClient } from '@supabase/supabase-js';

// Supabase configuration (MVP demo - direct credentials)
const SUPABASE_URL = 'https://ycqsetfjypgkwbhvyslc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljcXNldGZqeXBna3diaHZ5c2xjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwNTEzOTAsImV4cCI6MjA4MzYyNzM5MH0.LCUQotOZgIDyEKFJzZCnl2rCxElFtsLfYOX659OnCHQ';

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Supabase listing schema type
export interface SupabaseListing {
  id: string;
  title: string;
  price: number;
  location_json: {
    neighborhood?: string;
    city?: string;
    state?: string;
    address?: string;
  } | null;
  luxury_score: number;
  contact_info: {
    wechat?: string;
    email?: string;
    phone?: string;
  } | null;
  description?: string;
  image_url?: string;
  source_link?: string; // Original listing source URL (admin only)
  property_type?: string;
  tags?: string[];
  created_at?: string;
}

// Fetch all listings from Supabase, sorted by luxury_score descending
export async function fetchSupabaseListings(): Promise<SupabaseListing[]> {
  try {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .order('luxury_score', { ascending: false });

    if (error) {
      // Properly format the error for logging
      const errorMessage = error.message || JSON.stringify(error);
      console.error('Error fetching listings from Supabase:', errorMessage);
      // Return empty array instead of throwing - graceful degradation
      return [];
    }

    return data || [];
  } catch (err) {
    // Handle network errors or other exceptions
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Supabase connection error:', errorMessage);
    return [];
  }
}

// Delete a listing from Supabase by ID
export async function deleteSupabaseListing(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('listings')
      .delete()
      .eq('id', id);

    if (error) {
      const errorMessage = error.message || JSON.stringify(error);
      console.error('Error deleting listing from Supabase:', errorMessage);
      return false;
    }

    return true;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    console.error('Supabase delete error:', errorMessage);
    return false;
  }
}
