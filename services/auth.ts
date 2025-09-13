// services/auth.ts
import * as AuthSession from "expo-auth-session";
import { supabase } from "../lib/supabase"; // adjust path if needed

// ✅ Always use Expo proxy (needed in Expo Go)
const redirectUrl = AuthSession.makeRedirectUri({
  useProxy: true,
} as any);

console.log("👉 Using redirect URL:", redirectUrl);

/**
 * Start OAuth sign-in with Google (Expo flow).
 */
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      console.error("❌ Supabase signInWithOAuth error:", error.message ?? error);
      throw error;
    }

    console.log("✅ Supabase signInWithOAuth response:", data);
    return data;
  } catch (err: any) {
    console.error("❌ Google sign-in error:", err?.message ?? err);
    throw err;
  }
}

/**
 * Return the current user object (or null).
 * Uses getSession() to ensure we read the current client session.
 */
export async function getCurrentUser(): Promise<any | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("getCurrentUser: supabase.auth.getSession error:", error);
      return null;
    }
    return data?.session?.user ?? null;
  } catch (e) {
    console.warn("getCurrentUser: exception:", e);
    return null;
  }
}

/**
 * Return the current user access token (or null).
 * Use this from screens before calling your backend functions.
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn("getAccessToken: supabase.auth.getSession error:", error);
      return null;
    }
    return data?.session?.access_token ?? null;
  } catch (e) {
    console.warn("getAccessToken: exception:", e);
    return null;
  }
}

/**
 * Sign the user out.
 */
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error("❌ Error signing out:", error.message ?? error);
      throw error;
    }
  } catch (e) {
    console.error("❌ signOut exception:", e);
    throw e;
  }
}

/**
 * Small debug helper: decode JWT payload (inspect sub, exp).
 * Not for production use (only client-side debugging).
 */
export function decodeJwtPayload(token?: string | null): any | null {
  if (!token) return null;
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;
    const payload = parts[1];

    // Try atob() (available in many JS runtimes). Fallback to Buffer if available.
    let decoded = "";
    if (typeof atob === "function") {
      decoded = atob(payload);
    } else if (typeof Buffer !== "undefined") {
      decoded = Buffer.from(payload, "base64").toString("utf8");
    } else {
      // final fallback: decodeURIComponent trick (may fail on some inputs)
      decoded = decodeURIComponent(
        Array.prototype.map
          .call(payload.replace(/-/g, "+").replace(/_/g, "/"), function (c: any) {
            return "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2);
          })
          .join("")
      );
    }

    // try parse JSON
    try {
      return JSON.parse(decoded);
    } catch {
      // maybe already decoded string
      return decoded;
    }
  } catch (e) {
    console.warn("decodeJwtPayload failed:", e);
    return null;
  }
}

