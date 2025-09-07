import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { getSmsInbox } from "../api/5simApi";

export default function SmsInboxScreen() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<any[]>([]);

  const handleFetchInbox = async () => {
    if (!orderId) {
      Alert.alert("Error", "Please enter an order ID");
      return;
    }
    setLoading(true);
    try {
      const data = await getSmsInbox(orderId);
      setMessages(data); // API returns an array of messages
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch SMS inbox"
      );
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Enter Order ID:</Text>
      <TextInput
        style={styles.input}
        value={orderId}
        onChangeText={setOrderId}
        placeholder="e.g. 123456789"
        keyboardType="numeric"
      />
      <Button title="Fetch Inbox" onPress={handleFetchInbox} />

      {loading && (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      )}

      <FlatList
        data={messages}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={styles.sms}>
            ✉️ From: {item.sender} → {item.text}
          </Text>
        )}
        ListEmptyComponent={
          loading ? null : <Text style={styles.empty}>No messages found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "600", marginTop: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  sms: {
    fontSize: 14,
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  empty: { fontSize: 16, marginTop: 20, textAlign: "center", color: "#555" },
});
