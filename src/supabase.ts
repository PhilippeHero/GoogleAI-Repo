/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { createClient } from '@supabase/supabase-js';

// TODO: Replace with your project's URL and anon key
const supabaseUrl = 'https://vfkdunbfkrvbwdueejcj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZma2R1bmJma3J2YndkdWVlamNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNDQyNTQsImV4cCI6MjA3MjkyMDI1NH0.vhm-IUPErmFof0695Seff0RcgLzuhjNj27rpn-EczsQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.localStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  global: {
    // This header helps to ensure the client always fetches the latest schema
    // from the server, preventing errors caused by a stale schema cache.
    headers: { 'Cache-Control': 'no-cache' },
  },
});