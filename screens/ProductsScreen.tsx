import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { getProducts } from "../api/5simApi";

export default function ProductsScreen() {
  const [products, setProducts] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        // Example: Russia (ru) and "any" operator
        const data = await getProducts("england", "any");
        console.log("Products API Response:", data); // helpful for debugging
        setProducts(Object.keys(data)); // API returns an object, keys are product names
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
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
      {products.length === 0 ? (
        <Text style={styles.empty}>No products found</Text>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Text style={styles.item}>📱 {item}</Text>
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
