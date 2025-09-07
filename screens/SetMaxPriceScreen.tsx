import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { createOrUpdateMaxPrice } from "../api/5simApi";

export default function SetMaxPriceScreen() {
  const [product, setProduct] = useState("");
  const [price, setPrice] = useState("");

  const handleSubmit = async () => {
    if (!product || !price) {
      Alert.alert("Error", "Please enter product and price");
      return;
    }
    try {
      const data = await createOrUpdateMaxPrice(product, parseFloat(price));
      Alert.alert("Success", `Max price set: ${JSON.stringify(data)}`);
    } catch (error: any) {
      Alert.alert("Error", error.message || "Something went wrong");
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Product Name:</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. telegram"
        value={product}
        onChangeText={setProduct}
      />

      <TextInput
        style={styles.input}
        placeholder="e.g. 0.5"
        value={price}
        onChangeText={setPrice}
        keyboardType="numeric"
      />
      <Button title="Set Max Price" onPress={handleSubmit} />
      <Text style={styles.label}>Price:</Text>

      
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontSize: 16, marginTop: 10 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginTop: 0,
    marginBottom: 0,
  },
});
