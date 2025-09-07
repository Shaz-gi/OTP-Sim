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
import { togglePrices } from "../api/5simApi";

export default function TogglePricesScreen() {
  const [ids, setIds] = useState(""); // comma separated IDs
  const [disable, setDisable] = useState(true);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleToggle = async () => {
    setLoading(true);
    try {
      const list = ids
        ? ids.split(",").map((id) => parseInt(id.trim(), 10))
        : undefined;

      const data = await togglePrices(disable, list);
      setResponse(data);

      Alert.alert(
        "Success",
        `${disable ? "Disabled" : "Enabled"} ${
          list ? `prices: ${list.join(", ")}` : "all prices"
        }`
      );
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to toggle prices"
      );
      setResponse(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Price IDs (comma separated, optional):</Text>
      <TextInput
        style={styles.input}
        value={ids}
        onChangeText={setIds}
        placeholder="e.g. 101, 102, 103"
      />

      <Button
        title={disable ? "Disable Prices" : "Enable Prices"}
        onPress={() => {
          setDisable(!disable);
          handleToggle();
        }}
      />

      {loading && (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      )}

      {response && (
        <Text style={styles.result}>
          ✅ API Response: {JSON.stringify(response, null, 2)}
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
    fontSize: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: "#eee",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
});
