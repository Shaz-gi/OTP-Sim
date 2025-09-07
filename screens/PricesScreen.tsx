import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { getPrices } from "../api/5simApi";

export default function PricesScreen() {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const data = await getPrices(); // 👈 no params now
        // Flatten nested response
        const flattened: any[] = [];
        Object.keys(data).forEach((country) => {
          Object.keys(data[country]).forEach((operator) => {
            Object.keys(data[country][operator]).forEach((product) => {
              flattened.push({
                country,
                operator,
                product,
                price: data[country][operator][product].cost,
              });
            });
          });
        });
        setPrices(flattened);
      } catch (error) {
        console.error("Error fetching prices:", error);
        setPrices([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {prices.length === 0 ? (
        <Text style={styles.empty}>No prices found</Text>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(item, index) => `${item.country}-${item.operator}-${item.product}-${index}`}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              🌍 {item.country} | 📶 {item.operator} | 📱 {item.product} → 💲{item.price}
            </Text>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 15, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { fontSize: 18, textAlign: "center", marginTop: 20 },
  item: { fontSize: 14, padding: 8, borderBottomWidth: 1, borderColor: "#eee" },
});
