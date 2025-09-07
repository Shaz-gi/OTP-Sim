import React, { useState } from "react";
import {
  SafeAreaView,
  Text,
  TextInput,
  Button,
  StyleSheet,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { getNotifications } from "../api/5simApi";

export default function NotificationsScreen() {
  const [lang, setLang] = useState("en");
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);

  const handleFetchNotifications = async () => {
    setLoading(true);
    try {
      const data = await getNotifications(lang);
      setNotifications(data);
    } catch (error: any) {
      Alert.alert(
        "Error",
        error.response?.data?.message ||
          error.message ||
          "Failed to fetch notifications"
      );
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.label}>Language Code:</Text>
      <TextInput
        style={styles.input}
        value={lang}
        onChangeText={setLang}
        placeholder="e.g. en, ru, es"
      />
      <Button title="Get Notifications" onPress={handleFetchNotifications} />

      {loading && (
        <ActivityIndicator size="large" color="#007AFF" style={{ marginTop: 20 }} />
      )}

      <FlatList
        data={notifications}
        keyExtractor={(item, index) => index.toString()}
        renderItem={({ item }) => (
          <Text style={styles.notification}>
            🔔 {item}
          </Text>
        )}
        ListEmptyComponent={
          loading ? null : <Text style={styles.empty}>No notifications found</Text>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, backgroundColor: "#fff" },
  label: { fontSize: 16, fontWeight: "600", marginTop: 15 },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  notification: {
    fontSize: 14,
    padding: 10,
    borderBottomWidth: 1,
    borderColor: "#eee",
  },
  empty: { fontSize: 16, marginTop: 20, textAlign: "center", color: "#555" },
});
