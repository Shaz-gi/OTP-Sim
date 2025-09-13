/// <reference lib="deno.ns" />
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.31.0";

/* ---------- config / secrets ---------- */
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("PROJECT_URL") ?? "";
const SERVICE_ROLE_KEY =
  Deno.env.get("SERVICE_ROLE") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const FIVE_SIM_API_KEY =
  Deno.env.get("FIVE_SIM_API_KEY") ?? Deno.env.get("FIVESIM_API_KEY") ?? "";
const PRICE_TO_CREDIT_RATE = Number(Deno.env.get("PRICE_TO_CREDIT_RATE") ?? "1"); // credits per 1 unit currency

if (!FIVE_SIM_API_KEY) console.error("WARN: FIVE_SIM_API_KEY is not set");
if (!SERVICE_ROLE_KEY) console.warn("WARN: SERVICE_ROLE_KEY not set");
if (!SUPABASE_URL) console.warn("WARN: SUPABASE_URL / PROJECT_URL not set");

const supabaseAdmin = SUPABASE_URL && SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

/* ---------- helper ---------- */
function priceToCredits(priceNumber: number) {
  // implement your app's conversion logic here:
  // e.g. 1 USD = 10 credits => PRICE_TO_CREDIT_RATE = 10
  const n = Number(priceNumber ?? 0) || 0;
  return Math.max(0, Math.ceil(n * PRICE_TO_CREDIT_RATE));
}

async function call5sim(path: string, opts: RequestInit = {}) {
  const url = `https://5sim.net/v1${path}`;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${FIVE_SIM_API_KEY}`,
    Accept: "application/json",
    ...((opts.headers as Record<string, string>) ?? {}),
  };

  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let parsed: any = null;
  try { parsed = text ? JSON.parse(text) : null; } catch { parsed = text; }
  return { ok: res.ok, status: res.status, body: parsed, rawText: text };
}

async function getUserFromToken(token: string | null) {
  if (!token) return null;
  if (!supabaseAdmin) return null;
  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) {
    console.warn("getUserFromToken error:", error);
    return null;
  }
  return data?.user ?? null;
}

function jsonResponse(obj: any, status = 200) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json" } });
}

/* ---------- serve ---------- */
serve(async (req) => {
  try {
    if (req.method !== "POST") return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });

    const authHeader = req.headers.get("authorization") ?? req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      // For some guest actions (notifications) auth is not required; we will check per-action below.
      // For summary, we still allow a service role token for testing
    }
    const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

    // parse body safely
    const body = await req.json().catch(() => ({}));
    const action: string = (body.action ?? body.type ?? "buy").toString().toLowerCase();

    // Actions that require a user token:
    const needsUserAuth = ["buy", "check", "finish", "cancel", "ban", "reuse", "inbox"];

    // Resolve user id (or allow service-role for dev)
    let userId: string | null = null;
    if (needsUserAuth.includes(action)) {
      // if service role used, accept it for admin testing (but don't treat as real user)
      if (SERVICE_ROLE_KEY && token === SERVICE_ROLE_KEY) {
        userId = "service_role_test";
        console.warn("Service role token used - admin/testing mode.");
      } else {
        const user = await getUserFromToken(token);
        if (!user || !user.id) return jsonResponse({ code: 401, message: "Invalid or expired token" }, 401);
        userId = user.id;
      }
    }

    // ---------- ACTION: buy (reserve-first) ----------
    if (action === "buy") {
      if (!body.country || !body.product) return jsonResponse({ error: "Missing country or product" }, 400);
      const country = String(body.country).trim();
      const operator = String(body.operator ?? "any").trim();
      const product = String(body.product).trim();
      const clientRequestId = body.clientRequestId ?? null;
      const options = body.options ?? {};

      // idempotency: return existing sims row when clientRequestId present
      if (clientRequestId && supabaseAdmin) {
        try {
          const { data: existing, error: exErr } = await supabaseAdmin
            .from("sims")
            .select("*")
            .eq("client_request_id", clientRequestId)
            .limit(1)
            .maybeSingle();
          if (exErr) console.warn("sims lookup error:", exErr);
          if (existing) return jsonResponse({ success: true, order: existing }, 200);
        } catch (e) {
          console.warn("idempotency check failed:", e);
        }
      }

      // Build 5sim buy URL
      const qs = new URLSearchParams();
      for (const [k, v] of Object.entries(options ?? {})) {
        if (v !== undefined && v !== null && String(v).length > 0) qs.append(k, String(v));
      }
      if (clientRequestId) qs.append("ref", String(clientRequestId));
      const path = `/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(product)}${qs.toString() ? "?" + qs.toString() : ""}`;

      // Call 5sim (server-side)
      const simResp = await call5sim(path, { method: "GET" });
      if (!simResp.ok || !simResp.body) {
        // provider failure e.g. no free phones
        return jsonResponse({ success: false, providerError: simResp.body ?? simResp.rawText }, 409);
      }

      const order = simResp.body;
      const price = Number(order.price ?? order.cost ?? 0);
      const creditsToCharge = priceToCredits(price);

      if (!supabaseAdmin) {
        // cannot manipulate DB/wallet; we should try to cancel provider order to avoid waste
        try {
          // attempt cancel provider order (best-effort)
          const cancelPath = `/user/cancel/${encodeURIComponent(String(order.id ?? order.order_id ?? ""))}`;
          await call5sim(cancelPath, { method: "GET" });
        } catch (e) {
          console.warn("failed to cancel provider order after missing supabaseAdmin:", e);
        }
        return jsonResponse({ error: "server_not_configured" }, 500);
      }

      // Attempt to decrement wallet using RPC
      try {
        const { data: rpcData, error: rpcErr } = await supabaseAdmin.rpc("decrement_wallet_balance", { p_user_id: userId, p_delta: creditsToCharge });
        if (rpcErr) throw rpcErr;

        // normalize rpc response
        let rpcOut: any = rpcData;
        if (Array.isArray(rpcData) && rpcData.length > 0) rpcOut = rpcData[0];

        const newBalance = (rpcOut && (rpcOut.balance ?? rpcOut.new_balance ?? rpcOut[0]?.balance)) ?? null;
        // If rpc didn't return a valid balance -> treat as failure
        if (newBalance == null) {
          throw new Error("RPC returned unexpected result");
        }

        // Persist sims row (best-effort)
        let insertedSim: any = null;
        try {
          const { data: simInsertData, error: simInsertErr } = await supabaseAdmin.from("sims")
            .insert([{
              user_id: userId,
              client_request_id: clientRequestId,
              provider: "5sim",
              provider_order_id: String(order.id ?? order.order_id ?? order.id ?? ""),
              phone: order.phone ?? order.number ?? null,
              product,
              operator,
              country,
              price: price,
              price_credits: creditsToCharge,
              meta: order,
              status: order.status ?? "RECEIVED",
            }])
            .select("*")
            .maybeSingle();
          if (simInsertErr) console.warn("sims insert failed:", simInsertErr);
          insertedSim = simInsertData ?? null;
        } catch (e) {
          console.warn("sims insert exception:", e);
        }

        // Persist transaction record (best-effort)
        try {
          const { error: txErr } = await supabaseAdmin.from("transactions").insert([{
            user_id: userId,
            amount: price,
            credits: -Math.abs(creditsToCharge),
            type: "buy",
            meta: { provider: "5sim", provider_order: order },
          }]);
          if (txErr) console.warn("transactions insert failed:", txErr);
        } catch (e) {
          console.warn("transactions insert exception:", e);
        }

        return jsonResponse({ success: true, order, newBalance: Number(newBalance) }, 200);
      } catch (rpcErr: any) {
        console.error("decrement_wallet_balance failed:", rpcErr);

        // Attempt to cancel the provider order (best-effort) to avoid leaving paid-for order
        try {
          const cancelPath = `/user/cancel/${encodeURIComponent(String(order.id ?? order.order_id ?? ""))}`;
          await call5sim(cancelPath, { method: "GET" });
        } catch (e) {
          console.warn("failed to cancel provider order after rpc failure:", e);
        }

        // record failure transaction
        try {
          await supabaseAdmin.from("transactions").insert([{
            user_id: userId,
            amount: price,
            credits: 0,
            type: "buy_failed",
            meta: { provider: "5sim", provider_order: order, rpc_error: String(rpcErr) },
          }]);
        } catch (e) {
          console.warn("failed to record buy_failed transaction:", e);
        }

        return jsonResponse({ success: false, error: "insufficient_balance_or_rpc_failed", details: String(rpcErr) }, 402);
      }
    }

    // ---------- ACTION: check (get SMS) ----------
    if (action === "check") {
      const idParam = body.id ?? body.orderId;
      if (!idParam) return jsonResponse({ error: "Missing id" }, 400);
      const simResp = await call5sim(`/user/check/${encodeURIComponent(String(idParam))}`, { method: "GET" });
      return new Response(JSON.stringify(simResp.body ?? simResp.rawText), { status: simResp.status, headers: { "Content-Type": "application/json" } });
    }

    // ---------- ACTION: finish ----------
    if (action === "finish") {
      const idParam = body.id;
      if (!idParam) return jsonResponse({ error: "Missing id" }, 400);
      const simResp = await call5sim(`/user/finish/${encodeURIComponent(String(idParam))}`, { method: "GET" });
      return new Response(JSON.stringify(simResp.body ?? simResp.rawText), { status: simResp.status, headers: { "Content-Type": "application/json" } });
    }

    // ---------- ACTION: cancel ----------
    if (action === "cancel") {
      const idParam = body.id;
      if (!idParam) return jsonResponse({ error: "Missing id" }, 400);
      const simResp = await call5sim(`/user/cancel/${encodeURIComponent(String(idParam))}`, { method: "GET" });
      return new Response(JSON.stringify(simResp.body ?? simResp.rawText), { status: simResp.status, headers: { "Content-Type": "application/json" } });
    }

    // ---------- ACTION: ban ----------
    if (action === "ban") {
      const idParam = body.id;
      if (!idParam) return jsonResponse({ error: "Missing id" }, 400);
      const simResp = await call5sim(`/user/ban/${encodeURIComponent(String(idParam))}`, { method: "GET" });
      return new Response(JSON.stringify(simResp.body ?? simResp.rawText), { status: simResp.status, headers: { "Content-Type": "application/json" } });
    }

    // ---------- ACTION: reuse ----------
    if (action === "reuse") {
      const product = body.product;
      const number = body.number;
      if (!product || !number) return jsonResponse({ error: "Missing product/number" }, 400);
      const simResp = await call5sim(`/user/reuse/${encodeURIComponent(product)}/${encodeURIComponent(number)}`, { method: "GET" });
      return new Response(JSON.stringify(simResp.body ?? simResp.rawText), { status: simResp.status, headers: { "Content-Type": "application/json" } });
    }

    // ---------- ACTION: inbox (SMS inbox) ----------
    if (action === "inbox") {
      const idParam = body.id;
      if (!idParam) return jsonResponse({ error: "Missing id" }, 400);
      const simResp = await call5sim(`/user/sms/inbox/${encodeURIComponent(String(idParam))}`, { method: "GET" });
      return new Response(JSON.stringify(simResp.body ?? simResp.rawText), { status: simResp.status, headers: { "Content-Type": "application/json" } });
    }

    // ---------- ACTION: notifications (guest) ----------
    if (action === "notifications") {
      const lang = body.lang ?? "en";
      const simResp = await call5sim(`/guest/flash/${encodeURIComponent(String(lang))}`, { method: "GET" });
      return new Response(JSON.stringify(simResp.body ?? simResp.rawText), { status: simResp.status, headers: { "Content-Type": "application/json" } });
    }

    return jsonResponse({ error: "Unknown action" }, 400);
  } catch (err: any) {
    console.error("buy-sim unexpected error:", err);
    return jsonResponse({ error: "internal_error", details: String(err) }, 500);
  }
});
