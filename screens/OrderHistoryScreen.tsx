import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { getOrderHistory } from "../api/5simApi";

export default function OrderHistoryScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchOrders = async () => {
    try {
      const data = await getOrderHistory({
        category: "activation", // required
        limit: 10,              // optional
        offset: 0,              // optional
        order: "id",            // optional
        reverse: true,          // optional
      });
      setOrders(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  fetchOrders();
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
      {orders.length === 0 ? (
        <Text style={styles.empty}>No orders found</Text>
      ) : (
        <FlatList
          data={orders}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              📦 ID: {item.id} | {item.product} | {item.status}
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
