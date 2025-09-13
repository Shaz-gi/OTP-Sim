import { View, Text, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { useNavigation } from "@react-navigation/native";

export default function Footer() {
  const navigation = useNavigation();

  return (
    <View style={styles.container}>
      {/* Privacy Policy Link */}
      <TouchableOpacity onPress={() => navigation.navigate("PrivacyPolicy" as never)}>
        <Text style={styles.privacyLink}>Privacy Policy</Text>
      </TouchableOpacity>

      {/* Social Media Links */}
      <View style={styles.socials}>
        <TouchableOpacity onPress={() => Linking.openURL("https://twitter.com/yourpage")}>
          <Text style={[styles.socialText, { color: "#1DA1F2" }]}>Twitter</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("https://facebook.com/yourpage")}>
          <Text style={[styles.socialText, { color: "#1877F2" }]}>Facebook</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => Linking.openURL("https://instagram.com/yourpage")}>
          <Text style={[styles.socialText, { color: "#E4405F" }]}>Instagram</Text>
        </TouchableOpacity>
      </View>

      {/* Copyright */}
      <Text style={styles.copyright}>
        © {new Date().getFullYear()} OTP Sim. All rights reserved.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#f3f4f6",
    paddingVertical: 16,
    borderTopWidth: 1,
    borderColor: "#d1d5db",
    alignItems: "center",
  },
  privacyLink: {
    color: "#2563eb",
    fontWeight: "500",
  },
  socials: {
    flexDirection: "row",
    marginTop: 8,
  },
  socialText: {
    marginHorizontal: 8,
    fontWeight: "500",
  },
  copyright: {
    marginTop: 12,
    fontSize: 12,
    color: "#6b7280",
  },
});
