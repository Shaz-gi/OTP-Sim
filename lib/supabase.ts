import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://jkzaolzsmhiisvhhvlgh.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpremFvbHpzbWhpaXN2aGh2bGdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTY5NzQ2NTUsImV4cCI6MjA3MjU1MDY1NX0.W6oPnlonH8TMJY8Hq7VIVmkvoPW1_7Pqslao5jefRzE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
