// import React, { useEffect, useState } from "react";
// import { View, Text, Button, FlatList, StyleSheet, ActivityIndicator } from "react-native";
// import * as InAppPurchases from "expo-in-app-purchases";

// const productIds = ["credits_30", "credits_50", "credits_100"];

// export default function WalletScreen() {
//   const [items, setItems] = useState<InAppPurchases.IAPItem[]>([]);
//   const [balance, setBalance] = useState<number | null>(null);
//   const [loading, setLoading] = useState(true);

//   // Fetch balance from backend
//   const fetchBalance = async () => {
//     try {
//       const res = await fetch("https://your-backend.com/api/balance/USER_ID"); // replace USER_ID dynamically
//       const data = await res.json();
//       setBalance(data.balance);
//     } catch (err) {
//       console.error("❌ Error fetching balance:", err);
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchBalance();
//   }, []);

//   useEffect(() => {
//     const init = async () => {
//       await InAppPurchases.connectAsync();
//       const { results } = await InAppPurchases.getProductsAsync(productIds);
//       setItems(results ?? []);
//     };

//     init();
//     return () => {
//       InAppPurchases.disconnectAsync();
//     };
//   }, []);

//   // 🟢 Listen for purchases
//   useEffect(() => {
//     const subscription = InAppPurchases.setPurchaseListener(
//       async ({ responseCode, results }) => {
//         if (responseCode === InAppPurchases.IAPResponseCode.OK) {
//           results.forEach(async (purchase) => {
//             if (!purchase.acknowledged) {
//               console.log("✅ Purchase successful:", purchase);

//               // Send to backend for verification
//               await fetch("https://your-backend.com/api/verifyPurchase", {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify({
//                   productId: purchase.productId,
//                   purchaseToken: purchase.purchaseToken,
//                   transactionId: purchase.orderId,
//                   userId: "USER_ID" // replace with logged-in user
//                 }),
//               });

//               // ✅ Refresh balance after purchase
//               await fetchBalance();

//               // Acknowledge purchase
//               await InAppPurchases.finishTransactionAsync(purchase, true);
//             }
//           });
//         }
//       }
//     );
//     return () => subscription.remove();
//   }, []);

//   return (
//     <View style={styles.container}>
//       <Text style={styles.title}>💰 Wallet</Text>

//       {loading ? (
//         <ActivityIndicator size="large" color="#007AFF" />
//       ) : (
//         <Text style={styles.balance}>
//           Your Balance: {balance !== null ? balance : "Error fetching balance"}
//         </Text>
//       )}

//       <Text style={styles.subtitle}>Buy Credits</Text>
//       <FlatList
//         data={items}
//         keyExtractor={(item) => item.productId}
//         renderItem={({ item }) => (
//           <View style={styles.item}>
//             <Text>{item.title} - {item.price}</Text>
//             <Button title="Buy" onPress={() => InAppPurchases.purchaseItemAsync(item.productId)} />
//           </View>
//         )}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, padding: 20, backgroundColor: "#fff" },
//   title: { fontSize: 22, fontWeight: "bold", marginBottom: 20 },
//   subtitle: { fontSize: 18, fontWeight: "600", marginTop: 20, marginBottom: 10 },
//   balance: { fontSize: 20, marginBottom: 20 },
//   item: { marginBottom: 15, padding: 10, borderWidth: 1, borderRadius: 8 }
// });
