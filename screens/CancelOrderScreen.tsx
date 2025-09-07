import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { cancelOrder } from "../api/5simApi";

export default function CancelOrderScreen() {
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleCancel = async () => {
    if (!orderId) {
      Alert.alert("Error", "Please enter an order ID");
      return;
    }
    setLoading(true);
    try {
      const data = await cancelOrder(orderId);
      setResponse(data);
      Alert.alert("Success", `Order ${orderId} canceled.`);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to cancel order"
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
      <Button title="Cancel Order" onPress={handleCancel} />

      {loading && (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      )}

      {response && (
        <Text style={styles.result}>
          ❌ Order Canceled{"\n"}
          ID: {response.id}{"\n"}
          Status: {response.status}
        </Text>
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
});
