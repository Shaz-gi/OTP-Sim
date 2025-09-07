// services/wallet.ts
import { supabase } from "../lib/supabase";

/**
 * Get wallet balance for a user.
 */
export async function getBalance(userId: string) {
  const { data, error } = await supabase
    .from("wallets")
    .select("balance")
    .eq("user_id", userId)
    .single();

  if (error) {
    console.error("❌ Error fetching balance:", error);
    throw error;
  }

  return Number(data?.balance ?? 0);
}

/**
 * Purchase credits and add them to the user's wallet.
 * Returns the updated wallet balance (number).
 */
export async function purchaseCredits(userId: string, credits: number, amountPaid: number) {
  if (!userId) throw new Error("Missing userId");
  if (!Number.isFinite(credits) || credits <= 0) throw new Error("Invalid credits");
  if (!Number.isFinite(amountPaid) || amountPaid < 0) throw new Error("Invalid amountPaid");

  // 1) Try atomic server-side RPC (recommended). If RPC exists, use it.
  try {
    const rpcRes: any = await supabase.rpc("increment_wallet_balance", {
      p_user_id: userId,
      p_delta: credits,
    });

    if (rpcRes) {
      let newBalance: number | null = null;
      if (Array.isArray(rpcRes) && rpcRes.length > 0 && rpcRes[0].balance != null) {
        newBalance = Number(rpcRes[0].balance);
      } else if ((rpcRes as any).balance != null) {
        newBalance = Number((rpcRes as any).balance);
      } else if (typeof rpcRes === "number") {
        newBalance = Number(rpcRes);
      }

      if (newBalance != null && !Number.isNaN(newBalance)) {
        // log transaction (non-fatal)
        try {
          const { error: txErr } = await supabase.from("transactions").insert([
            {
              user_id: userId,
              amount: amountPaid,
              credits,
              type: "topup",
              meta: { source: "in-app", path: "rpc" },
            },
          ]);
          if (txErr) console.warn("transactions insert failed (rpc):", txErr);
        } catch (txErr) {
          console.warn("transactions insert exception (rpc):", txErr);
        }
        return newBalance;
      }
    }
  } catch (rpcErr: any) {
    // RPC missing or failed — fallback to client-side update
    // console.debug("RPC increment_wallet_balance not available or failed:", rpcErr);
  }

  // 2) Fallback: ensure wallet row exists, read, update, insert transaction
  try {
    // Ensure wallet row exists (upsert without unsupported options)
    const { error: upsertError } = await supabase
      .from("wallets")
      .upsert([{ user_id: userId, balance: 0 }]);
    if (upsertError) {
      // non-fatal; warn and continue
      console.warn("wallet upsert warning:", upsertError);
    }

    // Read current balance
    const { data: walletData, error: walletError } = await supabase
      .from("wallets")
      .select("balance")
      .eq("user_id", userId)
      .single();

    if (walletError) {
      // Attempt to insert a wallet row if reading failed (race / missing row).
      const { data: insertData, error: insertErr } = await supabase
        .from("wallets")
        .insert([{ user_id: userId, balance: credits }])
        .select("balance")
        .single();

      if (insertErr) {
        console.error("❌ Failed to create wallet row:", insertErr);
        throw insertErr;
      }

      // insert transaction row (best-effort)
      const { error: txErr2 } = await supabase.from("transactions").insert([
        {
          user_id: userId,
          amount: amountPaid,
          credits,
          type: "topup",
          meta: { source: "in-app", path: "insert-after-read-fail" },
        },
      ]);
      if (txErr2) console.warn("transactions insert failed after wallet create:", txErr2);

      return Number(insertData?.balance ?? credits);
    }

    const current = Number(walletData?.balance ?? 0);
    const newBalance = current + Number(credits);

    // Update balance and return the new balance (select the updated row)
    const { data: updateData, error: updateError } = await supabase
      .from("wallets")
      .update({ balance: newBalance, updated_at: new Date().toISOString() })
      .eq("user_id", userId)
      .select("balance")
      .single();

    if (updateError) {
      console.error("❌ Error updating wallet balance:", updateError);
      throw updateError;
    }

    // Insert transaction record (non-fatal if it fails)
    const { error: txError } = await supabase.from("transactions").insert([
      {
        user_id: userId,
        amount: amountPaid,
        credits,
        type: "topup",
        meta: { source: "in-app", path: "fallback-update" },
      },
    ]);
    if (txError) console.warn("transactions insert failed after update:", txError);

    return Number(updateData?.balance ?? newBalance);
  } catch (err) {
    console.error("❌ purchaseCredits failed:", err);
    throw err;
  }
}
