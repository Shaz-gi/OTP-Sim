import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";

export default function OrderScreen({ route }: any) {
  const { service, country } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Order {service.name} number ({country.name})
      </Text>
      <Text style={styles.subtitle}>Price: {country.price}</Text>

      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Place Order</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212" },
  title: { color: "#fff", fontSize: 20, marginBottom: 10 },
  subtitle: { color: "#aaa", fontSize: 16, marginBottom: 20 },
  button: { backgroundColor: "#0A84FF", padding: 14, borderRadius: 10 },
  buttonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
});
