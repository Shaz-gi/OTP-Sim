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
import { reuseNumber } from "../api/5simApi";

export default function ReuseNumberScreen() {
  const [product, setProduct] = useState("telegram");
  const [number, setNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleReuse = async () => {
    if (!number) {
      Alert.alert("Error", "Please enter a number");
      return;
    }
    setLoading(true);
    try {
      const data = await reuseNumber(product, number);
      setResponse(data);
      Alert.alert("Success", `Re-bought number: ${data.phone}`);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to reuse number"
      );
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Product:</Text>
      <TextInput
        style={styles.input}
        value={product}
        onChangeText={setProduct}
        placeholder="e.g. telegram, whatsapp"
      />

      <Text style={styles.label}>Number:</Text>
      <TextInput
        style={styles.input}
        value={number}
        onChangeText={setNumber}
        placeholder="Enter previously used number (no +)"
        keyboardType="numeric"
      />

      <Button title="Re-buy Number" onPress={handleReuse} />

      {loading && <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />}

      {response && (
        <Text style={styles.result}>
          ✅ ID: {response.id}{"\n"}
          📱 Number: {response.phone}{"\n"}
          Product: {response.product}{"\n"}
          Country: {response.country}{"\n"}
          Operator: {response.operator}
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
    marginBottom: 10,
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
