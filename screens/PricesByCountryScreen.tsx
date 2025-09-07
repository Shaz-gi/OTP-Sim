import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, FlatList, ActivityIndicator, StyleSheet, TextInput, Button } from "react-native";
import { getPricesByCountry } from "../api/5simApi";

export default function PricesByCountryScreen() {
  const [country, setCountry] = useState("russia"); // 👈 default
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchPrices = async () => {
    setLoading(true);
    try {
      const data = await getPricesByCountry(country);
      // Flatten nested response
      const flattened: any[] = [];
      Object.keys(data).forEach((operator) => {
        Object.keys(data[operator]).forEach((product) => {
          flattened.push({
            operator,
            product,
            price: data[operator][product].cost,
          });
        });
      });
      setPrices(flattened);
    } catch (error) {
      console.error("Error fetching prices by country:", error);
      setPrices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices(); // fetch for default country
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Enter Country:</Text>
      <TextInput
        style={styles.input}
        value={country}
        onChangeText={setCountry}
        placeholder="e.g. russia, india, usa"
      />
      <Button title="Fetch Prices" onPress={fetchPrices} />

      {loading ? (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      ) : prices.length === 0 ? (
        <Text style={styles.empty}>No prices found</Text>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(item, index) => `${item.operator}-${item.product}-${index}`}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              📶 {item.operator} | 📱 {item.product} → 💲{item.price}
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
  input: { borderWidth: 1, borderColor: "#ccc", borderRadius: 8, padding: 10, marginBottom: 15 },
  empty: { fontSize: 18, textAlign: "center", marginTop: 20 },
  item: { fontSize: 14, padding: 8, borderBottomWidth: 1, borderColor: "#eee" },
});
