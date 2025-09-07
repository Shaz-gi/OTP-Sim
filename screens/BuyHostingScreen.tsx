import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  Alert,
  ScrollView,
} from "react-native";
import { buyHostingNumber } from "../api/5simApi";

export default function BuyHostingScreen() {
  const [country, setCountry] = useState("russia");
  const [operator, setOperator] = useState("any");
  const [product, setProduct] = useState("telegram");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleBuy = async () => {
    setLoading(true);
    try {
      const data = await buyHostingNumber(country, operator, product);
      setResponse(data);
      Alert.alert("Success", `Hosting number bought: ${data.phone}`);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message || error.message || "Failed to buy hosting number"
      );
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.label}>Country:</Text>
      <TextInput style={styles.input} value={country} onChangeText={setCountry} />

      <Text style={styles.label}>Operator:</Text>
      <TextInput style={styles.input} value={operator} onChangeText={setOperator} />

      <Text style={styles.label}>Product:</Text>
      <TextInput style={styles.input} value={product} onChangeText={setProduct} />

      <Button title="Buy Hosting Number" onPress={handleBuy} />

      {loading && (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      )}

      {response && (
        <Text style={styles.result}>
          ✅ ID: {response.id}{"\n"}
          📱 Number: {response.phone}{"\n"}
          Product: {response.product}{"\n"}
          Country: {response.country}{"\n"}
          Operator: {response.operator}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 20, backgroundColor: "#fff" },
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
