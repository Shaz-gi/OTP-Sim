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
import { checkOrder } from "../api/5simApi";

export default function CheckOrderScreen() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleCheck = async () => {
    if (!orderId) {
      Alert.alert("Error", "Please enter an order ID");
      return;
    }
    setLoading(true);
    try {
      const data = await checkOrder(orderId);
      setResponse(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to check order"
      );
      setResponse(null);
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
      <Button title="Check Order" onPress={handleCheck} />

      {loading && (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      )}

      {response && (
        <>
          <Text style={styles.result}>
            📱 Number: {response.phone}{"\n"}
            Product: {response.product}{"\n"}
            Status: {response.status}
          </Text>

          <Text style={styles.label}>SMS Messages:</Text>
          {response.sms?.length > 0 ? (
            <FlatList
              data={response.sms}
              keyExtractor={(item, index) => index.toString()}
              renderItem={({ item }) => (
                <Text style={styles.sms}>
                  ✉️ From: {item.sender} → {item.text}
                </Text>
              )}
            />
          ) : (
            <Text style={styles.empty}>No SMS received yet</Text>
          )}
        </>
      )}
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
  result: {
    marginTop: 20,
    fontSize: 16,
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  sms: {
    fontSize: 14,
    padding: 8,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  empty: { fontSize: 16, marginTop: 10, textAlign: "center" },
});
