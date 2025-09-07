import React, { useEffect, useState } from "react";
import { SafeAreaView, Text, FlatList, ActivityIndicator, StyleSheet } from "react-native";
import { getPaymentsHistory } from "../api/5simApi";

export default function PaymentsHistoryScreen() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const fetchPayments = async () => {
    try {
      const data = await getPaymentsHistory({
        limit: 10,
        offset: 0,
        order: "id",
        reverse: true,
      });
      setPayments(data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  fetchPayments();
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
      {payments.length === 0 ? (
        <Text style={styles.empty}>No payments found</Text>
      ) : (
        <FlatList
          data={payments}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => (
            <Text style={styles.item}>
              💳 {item.amount} {item.currency} | {item.status}
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
