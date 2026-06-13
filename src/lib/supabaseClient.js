import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export function isCloudMode() {
  return Boolean(url && anonKey);
}

let client = null;

export function getSupabase() {
  if (!client && isCloudMode()) {
    client = createClient(url, anonKey);
  }
  return client;
}
