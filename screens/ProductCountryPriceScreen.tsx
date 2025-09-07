// import React, { useEffect, useState } from "react";
// import { SafeAreaView, Text, StyleSheet, ActivityIndicator } from "react-native";
// import { Picker } from "@react-native-picker/picker"; // expo install @react-native-picker/picker
// import { getProducts, getCountries, getPrices } from "../api/5simApi";

// export default function ProductCountryPriceScreen() {
//   const [products, setProducts] = useState<any[]>([]);
//   const [countries, setCountries] = useState<any[]>([]);
//   const [selectedProduct, setSelectedProduct] = useState<string | null>(null);
//   const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
//   const [price, setPrice] = useState<number | null>(null);
//   const [loading, setLoading] = useState(false);

//   useEffect(() => {
//     // Fetch available products
//     const fetchProducts = async () => {
//       try {
//         const data = await getProducts("england", "any"); // default call
//         setProducts(Object.keys(data)); // service names
//       } catch (error) {
//         console.error("❌ Error fetching products:", error);
//       }
//     };

//     // Fetch countries
//     const fetchCountries = async () => {
//       try {
//         const data = await getCountries();
//         setCountries(data); // expect [{iso, text_en, ...}, ...]
//       } catch (error) {
//         console.error("❌ Error fetching countries:", error);
//       }
//     };

//     fetchProducts();
//     fetchCountries();
//   }, []);

//   // Fetch price when both are selected
//   useEffect(() => {
//     if (selectedProduct && selectedCountry) {
//       const fetchPrice = async () => {
//         setLoading(true);
//         try {
//           const data = await getPrice(selectedCountry, "any", selectedProduct);
//           setPrice(data[selectedProduct]?.cost || null);
//         } catch (error) {
//           console.error("❌ Error fetching price:", error);
//         } finally {
//           setLoading(false);
//         }
//       };
//       fetchPrice();
//     }
//   }, [selectedProduct, selectedCountry]);

//   return (
//     <SafeAreaView style={styles.container}>
//       <Text style={styles.title}>📱 Select Service</Text>
//       <Picker
//         selectedValue={selectedProduct}
//         onValueChange={(val) => setSelectedProduct(val)}
//       >
//         <Picker.Item label="Select a service" value={null} />
//         {products.map((prod) => (
//           <Picker.Item key={prod} label={prod} value={prod} />
//         ))}
//       </Picker>

//       <Text style={styles.title}>🌍 Select Country</Text>
//       <Picker
//         selectedValue={selectedCountry}
//         onValueChange={(val) => setSelectedCountry(val)}
//       >
//         <Picker.Item label="Select a country" value={null} />
//         {countries.map((c) => (
//           <Picker.Item key={c.iso} label={c.text_en} value={c.iso} />
//         ))}
//       </Picker>

//       {loading ? (
//         <ActivityIndicator size="large" color="#007AFF" />
//       ) : price !== null ? (
//         <Text style={styles.price}>💲 Price: {price}</Text>
//       ) : (
//         <Text style={styles.price}>Select service + country to see price</Text>
//       )}
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: "#fff" },
//   title: { fontSize: 18, fontWeight: "600", marginTop: 20 },
//   price: { fontSize: 20, fontWeight: "700", marginTop: 30, color: "#007AFF" },
// });
