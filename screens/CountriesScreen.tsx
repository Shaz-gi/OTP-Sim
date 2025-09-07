import React, { useEffect, useState } from "react";
import {
  SafeAreaView,
  Text,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRoute, useNavigation } from "@react-navigation/native";
import { getCountries } from "../api/5simApi";

export default function CountriesScreen() {
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { product } = route.params; // 👈 product passed from ServicesScreen

  const [countries, setCountries] = useState<{ [key: string]: string }>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const data = await getCountries();
        console.log("🌍 Countries API Response:", data);
        setCountries(data); // API returns object { code: "Country Name" }
      } catch (error) {
        console.error("❌ Error fetching countries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCountries();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  const countryList = Object.entries(countries); // [["ru","Russia"],["us","USA"],...]

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>🌍 Select a country for {product}</Text>
      <FlatList
        data={countryList}
        keyExtractor={([code]) => code}
        renderItem={({ item }) => {
          const [code, name] = item;
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() =>
                navigation.navigate("OrderScreen", { product, country: code })
              }
            >
              <Text style={styles.text}>
                {name} ({code.toUpperCase()})
              </Text>
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  header: { fontSize: 18, fontWeight: "bold", marginBottom: 12 },
  item: {
    padding: 15,
    marginBottom: 8,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
  },
  text: { fontSize: 16, fontWeight: "500" },
});
