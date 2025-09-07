import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { getMaxPrices } from "../api/5simApi";

export default function MaxPricesScreen() {
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMaxPrices = async () => {
      try {
        const data = await getMaxPrices();
        console.log("Max Prices API Response:", data); // 👈 helpful for debugging
        setPrices(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchMaxPrices();
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
        <Text style={styles.empty}>No max prices found</Text>
      ) : (
        <FlatList
          data={prices}
          keyExtractor={(item, index) => index.toString()}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              📦 Product: {item.product} | Limit: {item.price}
            </Text>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  empty: { fontSize: 18, textAlign: "center", marginTop: 20 },
  item: { fontSize: 16, padding: 10, borderBottomWidth: 1, borderColor: "#eee" },
});
