import React, { useState } from "react";
import { SafeAreaView, Text, TextInput, Button, StyleSheet, Alert } from "react-native";
import { deleteMaxPrice } from "../api/5simApi";

export default function DeleteMaxPriceScreen() {
  const [product, setProduct] = useState("");

  const handleDelete = async () => {
    if (!product) {
      Alert.alert("Error", "Please enter a product name");
      return;
    }
    try {
      const data = await deleteMaxPrice(product);
      Alert.alert("Success", `Deleted max price for ${product}`);
    } catch (error: any) {
      if (error.response) {
        Alert.alert(
          "API Error",
          `Status: ${error.response.status}\nMessage: ${JSON.stringify(error.response.data)}`
        );
      } else {
        Alert.alert("Error", error.message || "Something went wrong");
      }
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Enter Product Name:</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. telegram"
        value={product}
        onChangeText={setProduct}
      />
      <Button title="Delete Max Price" onPress={handleDelete} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontSize: 16, marginBottom: 5 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
});
