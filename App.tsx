// import React, { useEffect, useState } from "react";
// import { SafeAreaView, Text, ActivityIndicator, StyleSheet } from "react-native";
// import { supabase } from "./lib/supabase";
// import { getBalance } from "./api/5simApi";

// // Screens
// import OrderHistoryScreen from "./screens/OrderHistoryScreen";
// import PaymentsHistoryScreen from "./screens/PaymentsHistoryScreen";
// import MaxPricesScreen from "./screens/MaxPricesScreen";
// import ProductsScreen from "./screens/ProductsScreen";
// import SetMaxPriceScreen from "./screens/SetMaxPriceScreen";
// import CountriesScreen from "./screens/CountriesScreen";
// import DeleteMaxPriceScreen from "./screens/DeleteMaxPriceScreen";
// import PricesScreen from "./screens/PricesScreen";
// import PricesByCountryScreen from "./screens/PricesByCountryScreen";
// import PricesByProductScreen from "./screens/PricesByProductScreen";
// import PricesByCountryAndProductScreen from "./screens/PricesByCountryAndProductScreen";
// import BuyActivationScreen from "./screens/BuyActivationScreen";
// import BuyHostingScreen from "./screens/BuyHostingScreen";
// import ReuseNumberScreen from "./screens/ReuseNumberScreen";
// import CheckOrderScreen from "./screens/CheckOrderScreen";
// import FinishOrderScreen from "./screens/FinishOrderScreen";
// import CancelOrderScreen from "./screens/CancelOrderScreen";
// import BanOrderScreen from "./screens/BanOrderScreen";
// import SmsInboxScreen from "./screens/SmsInboxScreen";
// import NotificationsScreen from "./screens/NotificationsScreen";
// import BalanceScreen from "./screens/BalanceScreen";
// import AuthScreen from "./screens/AuthScreen";

// export default function App() {
//   const [balance, setBalance] = useState<number | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [user, setUser] = useState<any>(null);

//   // 🔹 Auth state management
//   useEffect(() => {
//     supabase.auth.getSession().then(({ data }) => {
//       setUser(data.session?.user ?? null);
//     });

//     const { data: subscription } = supabase.auth.onAuthStateChange(
//       (_event, session) => {
//         setUser(session?.user ?? null);
//       }
//     );

//     return () => {
//       subscription.subscription.unsubscribe();
//     };
//   }, []);

//   // 🔹 Fetch balance only when logged in
//   useEffect(() => {
//     if (!user) return;

//     const fetchBalance = async () => {
//       try {
//         const data = await getBalance();
//         setBalance(data.balance);
//       } catch (error: any) {
//         console.log("API Error:", error.response?.data || error.message);
//         setBalance(null);
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchBalance();
//   }, [user]);

//   // 🔹 Loading state
//   if (loading && user) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <ActivityIndicator size="large" color="#007AFF" />
//       </SafeAreaView>
//     );
//   }

//   // 🔹 Before login → only show AuthScreen
//   if (!user) {
//     return (
//       <SafeAreaView style={styles.container}>
//         <AuthScreen />
//       </SafeAreaView>
//     );
//   }

//   // 🔹 After login → show app functionality
//   return (
//     <SafeAreaView style={styles.container}>
//       <Text style={styles.text}>
//         💰 {user.email}’s Balance: {balance !== null ? balance : "Error fetching balance"}
//       </Text>

//       {/* Uncomment the screens you want to use */}
//       {/* <OrderHistoryScreen /> */}
//       {/* <PaymentsHistoryScreen /> */}
//       {/* <MaxPricesScreen /> */}
//       {/* <ProductsScreen /> */}
//       {/* <SetMaxPriceScreen /> */}
//       {/* <CountriesScreen /> */}
//       {/* <DeleteMaxPriceScreen /> */}
//       {/* <PricesScreen /> */}
//       {/* <PricesByCountryScreen /> */}
//       {/* <PricesByProductScreen /> */}
//       {/* <PricesByCountryAndProductScreen /> */}
//       {/* <BuyActivationScreen /> */}
//       {/* <BuyHostingScreen /> */}
//       {/* <ReuseNumberScreen /> */}
//       {/* <CheckOrderScreen /> */}
//       <FinishOrderScreen />
//       <CancelOrderScreen />
//       {/* <BanOrderScreen /> */}
//       <SmsInboxScreen />
//       {/* <NotificationsScreen /> */}
//       <BalanceScreen />
//     </SafeAreaView>
//   );
// }

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     backgroundColor: "#fff",
//   },
//   text: {
//     fontSize: 20,
//     fontWeight: "bold",
//     marginBottom: 20,
//   },
// });
// App.tsx
// App.tsx
import React, { useEffect, useState } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { supabase } from "./lib/supabase";

// Screens
import AuthScreen from "./screens/AuthScreen";
import ServicesScreen, {
  CountriesScreen,
  PricesScreen,
  PurchaseScreen,
} from "./screens/ServicesScreen";
import BalanceScreen from "./screens/BalanceScreen";
import FinishOrderScreen from "./screens/FinishOrderScreen";
import CancelOrderScreen from "./screens/CancelOrderScreen";
import SmsInboxScreen from "./screens/SmsInboxScreen";

// Typed route params
export type RootStackParamList = {
  Auth: undefined;
  Services: undefined;
  Countries: { product: string };
  Prices: { product: string; country: string };
  Purchase: { product: string; country: string; operator: string; price?: number };
  Balance: undefined;
  FinishOrder: undefined;
  CancelOrder: undefined;
  Inbox: undefined;
};

// Create the stack navigator
const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Initial session check
    (async () => {
      try {
        const { data } = await supabase.auth.getSession();
        if (!mounted) return;
        setSession(data?.session ?? null);
      } catch (err) {
        console.error("getSession error:", err);
        if (mounted) setSession(null);
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    // Subscribe to auth state changes
    const listener: any = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });

    return () => {
      mounted = false;
      try {
        listener?.data?.subscription?.unsubscribe?.();
        listener?.subscription?.unsubscribe?.();
        listener?.unsubscribe?.();
      } catch (e) {
        console.warn("Failed to unsubscribe supabase listener:", e);
      }
    };
  }, []);

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      {session ? (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {/* Main app flow */}
          <Stack.Screen name="Services" component={ServicesScreen} />
          <Stack.Screen name="Countries" component={CountriesScreen} />
          <Stack.Screen name="Prices" component={PricesScreen} />
          <Stack.Screen name="Purchase" component={PurchaseScreen} />

          {/* Other app screens */}
          <Stack.Screen name="Balance" component={BalanceScreen} />
          <Stack.Screen name="FinishOrder" component={FinishOrderScreen} />
          <Stack.Screen name="CancelOrder" component={CancelOrderScreen} />
          <Stack.Screen name="Inbox" component={SmsInboxScreen} />
        </Stack.Navigator>
      ) : (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Auth" component={AuthScreen} />
        </Stack.Navigator>
      )}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#121212",
  },
});
