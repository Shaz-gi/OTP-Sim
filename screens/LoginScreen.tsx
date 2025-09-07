import React, { useEffect } from "react";
import { View, Button, StyleSheet, Text, Platform } from "react-native";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import * as AppleAuthentication from "expo-apple-authentication";

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  // 🔹 Google Auth setup
  const [request, response, promptAsync] = Google.useAuthRequest({
    // expoClientId: "YOUR_EXPO_CLIENT_ID.apps.googleusercontent.com",
    iosClientId: "228778482426-r2fh203iff1nmuhovn3k745dbd94sr86.apps.googleusercontent.com",
    androidClientId: "228778482426-6p0qj7u5n0g2otfqtq7s20jn2a8lr858.apps.googleusercontent.com",
    webClientId: "228778482426-n983camvsuocru8cutc9vh4eq1k1a3go.apps.googleusercontent.com",
  });

  useEffect(() => {
    if (response?.type === "success") {
      const { authentication } = response;
      console.log("✅ Google Token:", authentication?.accessToken);
    }
  }, [response]);

  // 🔹 Handle Apple Auth
  const handleAppleSignIn = async () => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      console.log("✅ Apple Credential:", credential);
    } catch (e: any) {
      if (e.code === "ERR_CANCELED") {
        console.log("🚫 User canceled Apple Sign-In");
      } else {
        console.error("❌ Apple Sign-In error:", e);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome 👋</Text>

      {/* Google Login Button */}
      <Button
        disabled={!request}
        title="Sign in with Google"
        onPress={() => promptAsync()}
      />

      {/* Apple Login Button (only shows on iOS) */}
      {Platform.OS === "ios" && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 30,
  },
  appleButton: {
    width: 200,
    height: 44,
    marginTop: 15,
  },
});
