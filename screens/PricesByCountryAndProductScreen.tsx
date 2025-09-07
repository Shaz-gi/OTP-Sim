import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  TextInput,
  Button,
} from "react-native";
import { getPricesByCountryAndProduct } from "../api/5simApi";

export default function PricesByCountryAndProductScreen() {
  const [country, setCountry] = useState("russia"); // default
  const [product, setProduct] = useState("telegram"); // default
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const data = await getPricesByCountryAndProduct(country, product);
      // Flatten nested response
      const flattened: any[] = [];
      Object.keys(data).forEach((operator) => {
        flattened.push({
          operator,
          price: data[operator].cost,
        });
      });
      setPrices(flattened);
    } catch (error) {
      console.error("Error fetching prices by country & product:", error);
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Enter Country:</Text>
      <TextInput
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        placeholder="e.g. russia, india, usa"
      />

      <Text style={styles.label}>Enter Product:</Text>
      <TextInput
        style={styles.input}
        value={product}
        onChangeText={setProduct}
        placeholder="e.g. telegram, whatsapp, facebook"
      />

      <Button title="Fetch Prices" onPress={fetchPrices} />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : prices.length === 0 ? (
        <Text style={styles.empty}>No prices found</Text>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(item, index) => `${item.operator}-${index}`}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              📶 {item.operator} → 💲{item.price}
            </Text>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "600", marginVertical: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  empty: { fontSize: 18, textAlign: "center", marginTop: 20 },
  item: { fontSize: 14, padding: 8, borderBottomWidth: 1, borderColor: "#eee" },
});
