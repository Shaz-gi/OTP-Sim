import * as AuthSession from "expo-auth-session";

// Dynamically get redirect URL for Supabase
export const getRedirectUrl = () => {
  return AuthSession.makeRedirectUri({
      // @ts-expect-error - useProxy is supported but not in TS types
      useProxy: true,
    });
};
