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
import { buyActivationNumber, getBalance, getPricesByCountryAndProduct } from "../api/5simApi";

export default function BuyActivationScreen() {
  const [country, setCountry] = useState("russia");
  const [operator, setOperator] = useState("any");
  const [product, setProduct] = useState("telegram");
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<any>(null);

  const handleBuy = async () => {
    setLoading(true);
    try {
      // Step 1: Check balance
      const balanceData = await getBalance();
      const balance = balanceData.balance;

      // Step 2: Check price for country + product
      const priceData = await getPricesByCountryAndProduct(country, product);
      let price = 0;
      if (operator in priceData) {
        price = priceData[operator].cost;
      } else if ("any" in priceData) {
        price = priceData["any"].cost; // fallback
      }

      // Step 3: Compare balance vs price
      if (balance < price) {
        Alert.alert(
          "Insufficient Balance",
          `Your balance is $${balance}, but ${product} in ${country} costs $${price}`
        );
        setLoading(false);
        return;
      }

      // Step 4: Confirm purchase
      Alert.alert(
        "Confirm Purchase",
        `This will cost $${price}. Continue?`,
        [
          { text: "Cancel", style: "cancel", onPress: () => setLoading(false) },
          {
            text: "Buy",
            onPress: async () => {
              try {
                const data = await buyActivationNumber(country, operator, product);
                setResponse(data);
                Alert.alert("Success", `Number bought: ${data.phone}`);
              } catch (error: any) {
                Alert.alert(
                  "Error",
                  error.response?.data?.message ||
                    error.message ||
                    "Failed to buy number"
                );
              } finally {
                setLoading(false);
              }
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
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

      <Button title="Buy Number" onPress={handleBuy} />

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
