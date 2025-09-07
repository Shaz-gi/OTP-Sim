// navigation/AppNavigator.tsx
import React from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { NavigationContainer } from "@react-navigation/native";
import ServiceScreen from "../screens/ServicesScreen";
import CountryScreen from "../screens/CountriesScreen";
import OrderScreen from "../screens/OrderScreen";

const Stack = createStackNavigator();

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          cardStyle: { backgroundColor: "#121212" },
        }}
      >
        <Stack.Screen name="ServiceScreen" component={ServiceScreen} />
        <Stack.Screen name="CountryScreen" component={CountryScreen} />
        <Stack.Screen name="OrderScreen" component={OrderScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
