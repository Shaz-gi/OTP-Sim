import React, { useEffect, useState } from "react";
import { View, Text, Button, StyleSheet, ActivityIndicator } from "react-native";
import { getBalance } from "../services/wallet";
import { signInWithGoogle, getCurrentUser } from "../services/auth";
import { ensureUserInDatabase } from "../services/user";

export default function BalanceScreen() {
  const [user, setUser] = useState<any>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      const currentUser = await getCurrentUser();
      if (currentUser) {
        setUser(currentUser);
        await ensureUserInDatabase(currentUser.id, currentUser.email!);
        const bal = await getBalance(currentUser.id);
        setBalance(bal);
      }
      setLoading(false);
    };
    init();
  }, []);

  const handleLogin = async () => {
    try {
      await signInWithGoogle();
      // after redirect back, session will be available in Supabase
    } catch (err) {
      console.error("Login error:", err);
    }
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : user ? (
        <Text style={styles.text}>
          💰 {user.email}'s Balance: {balance !== null ? balance : "Error"}
        </Text>
      ) : (
        <Button title="Sign in with Google" onPress={handleLogin} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" },
  text: { fontSize: 20, fontWeight: "bold" },
});
