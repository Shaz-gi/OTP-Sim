import * as AuthSession from "expo-auth-session";
import { supabase } from "../lib/supabase";

// ✅ Always use Expo proxy (needed in Expo Go)
const redirectUrl = AuthSession.makeRedirectUri({
  useProxy: true,
}as any);

console.log("👉 Using redirect URL:", redirectUrl);

export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: redirectUrl, // 👈 force correct redirect
      },
    });

    if (error) {
      console.error("❌ Supabase signInWithOAuth error:", error.message);
      throw error;
    }

    console.log("✅ Supabase signInWithOAuth response:", data);
    return data;
  } catch (err: any) {
    console.error("❌ Google sign-in error:", err.message);
    throw err;
  }
}

export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error("❌ Error getting user:", error);
    return null;
  }

  return user;
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();
  if (error) {
    console.error("❌ Error signing out:", error.message);
    throw error;
  }
}
