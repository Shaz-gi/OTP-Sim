import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from "react-native";
import { supabase } from "../lib/supabase";
import { signInWithGoogle, signOut } from "../services/auth";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<any>(null);

  // 🔹 Watch session changes
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      console.log("👉 Initial session:", data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        console.log("🔄 Auth state change:", session);
        setUser(session?.user ?? null);
      }
    );

    return () => listener.subscription.unsubscribe();
  }, []);

  // 🔹 Google login handler
  async function handleGoogleLogin() {
    try {
      const result = await signInWithGoogle();
      console.log("🔄 Google login result:", result);

      // 👇 force refresh session after redirect
      const {
        data: { session },
        error,
      } = await supabase.auth.getSession();

      if (error) {
        console.error("❌ Error fetching session after Google login:", error);
        Alert.alert("Login failed", error.message);
        return;
      }

      if (session?.user) {
        console.log("✅ User logged in:", session.user.email);
        setUser(session.user);
      } else {
        Alert.alert("Login failed", "No session returned.");
      }
    } catch (err: any) {
      console.error("❌ Google login error:", err.message);
      Alert.alert("Google Login Error", err.message);
    }
  }

  // 🔹 Email/password sign in
  async function signInWithEmail() {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) Alert.alert(error.message);
  }

  // 🔹 Email/password sign up
  async function signUpWithEmail() {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert(error.message);
  }

  return (
    <View style={styles.container}>
      {user ? (
        <>
          <Text style={styles.title}>👋 Hello, {user.email}</Text>
          <TouchableOpacity style={styles.signOutButton} onPress={signOut}>
            <Text style={styles.buttonText}>Sign Out</Text>
          </TouchableOpacity>
        </>
      ) : (
        <>
          <Text style={styles.title}>Welcome to VSim</Text>
          <Text style={styles.subtitle}>Sign in to continue</Text>

          {/* Email/password inputs */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor="#aaa"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
          />
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#aaa"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <TouchableOpacity style={styles.button} onPress={signInWithEmail}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.buttonOutline}
            onPress={signUpWithEmail}
          >
            <Text style={styles.buttonOutlineText}>Sign Up</Text>
          </TouchableOpacity>

          <Text style={styles.orText}>────────── OR ──────────</Text>

          {/* Google login */}
          <TouchableOpacity
            style={[styles.button, { backgroundColor: "#4285F4" }]}
            onPress={handleGoogleLogin}
          >
            <Text style={styles.buttonText}>Continue with Google</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: "#aaa",
    marginBottom: 20,
  },
  input: {
    width: "100%",
    backgroundColor: "#1E1E1E",
    color: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#333",
  },
  button: {
    width: "100%",
    backgroundColor: "#0A84FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  buttonOutline: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#0A84FF",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 20,
  },
  buttonOutlineText: {
    color: "#0A84FF",
    fontWeight: "bold",
    fontSize: 16,
  },
  orText: {
    color: "#aaa",
    marginVertical: 10,
  },
  signOutButton: {
    backgroundColor: "#DB4437",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    width: "100%",
  },
});
