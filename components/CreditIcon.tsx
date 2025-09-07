// components/CreditIcon.tsx
import React from "react";
import { Image, StyleSheet, ImageStyle } from "react-native";

type Props = {
  size?: number;
  style?: ImageStyle | ImageStyle[]; // ✅ Correct type for Image
};

export default function CreditIcon({ size = 16, style }: Props) {
  return (
    <Image
      source={require("../assets/credit.png")}
      style={[styles.icon, { width: size, height: size }, style]}
      resizeMode="contain"
    />
  );
}

const styles = StyleSheet.create({
  icon: {
    marginRight: 4,
  },
});
