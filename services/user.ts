import { supabase } from "../lib/supabase";

export async function ensureUserInDatabase(userId: string, email: string) {
  // Insert if not exists
  const { error } = await supabase
    .from("users")
    .upsert({ id: userId, email })
    .eq("id", userId);

  if (error) throw error;

  // Create wallet if not exists
  const { error: walletError } = await supabase
    .from("wallets")
    .insert({ user_id: userId, balance: 0 })
    .eq("user_id", userId);

  if (walletError && walletError.code !== "23505") { // ignore "duplicate key" error
    throw walletError;
  }
}
