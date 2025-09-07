import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Modal,
  TouchableWithoutFeedback,
} from "react-native";
import { useIsFocused } from "@react-navigation/native";
import CreditIcon from "../components/CreditIcon";
import { getCurrentUser, signOut } from "../services/auth";
import { ensureUserInDatabase } from "../services/user";
import { getBalance, purchaseCredits } from "../services/wallet";
import * as RNIap from "react-native-iap";

type Props = {
  navigation?: any;
  onProfile?: () => void;
  onWallet?: () => void;
  showBalanceBadge?: boolean;
  style?: any;
};

/** Credit packs linked to App Store / Play Store product IDs */
const CREDIT_PACKS = [
  { credits: 30, productId: "credits_30" },
  { credits: 50, productId: "credits_50" },
  { credits: 100, productId: "credits_100" },
  { credits: 500, productId: "credits_500" },
];

export default function AppHeaderConnected({
  navigation,
  onProfile,
  onWallet,
  showBalanceBadge = true,
  style,
}: Props) {
  const [user, setUser] = useState<any | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // wallet modal
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [selectedPackIndex, setSelectedPackIndex] = useState<number | null>(0);
  const [buying, setBuying] = useState(false);

  // IAP products
  const [products, setProducts] = useState<RNIap.Product[]>([]);

  const isFocused = useIsFocused();

  /** Load user + balance */
  const loadHeader = useCallback(async () => {
    setLoading(true);
    try {
      const u = await getCurrentUser();
      setUser(u);

      if (u) {
        try {
          await ensureUserInDatabase(u.id, u.email ?? "");
        } catch (e) {
          console.warn("ensureUserInDatabase failed", e);
        }

        try {
          const b = await getBalance(u.id);
          setBalance(Number(b ?? 0));
        } catch (e) {
          console.warn("getBalance failed", e);
          setBalance(null);
        }
      } else {
        setBalance(null);
      }
    } catch (err) {
      console.warn("loadHeader error", err);
      setUser(null);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, []);

  /** Load IAP products */
  useEffect(() => {
    async function loadProducts() {
      try {
        await RNIap.initConnection();
        const result = await RNIap.getProducts(
          CREDIT_PACKS.map((p) => p.productId)
        );
        setProducts(result ?? []);
      } catch (err) {
        console.warn("IAP load error", err);
      }
    }
    loadProducts();

    return () => {
      RNIap.endConnection();
    };
  }, []);

  useEffect(() => {
    loadHeader();
  }, [loadHeader, isFocused]);

  async function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
          } catch (e) {
            console.warn("signOut failed", e);
          } finally {
            if (navigation && navigation.reset) {
              navigation.reset({ index: 0, routes: [{ name: "Login" }] });
            }
          }
        },
      },
    ]);
  }

  function handleProfilePress() {
    if (onProfile) return onProfile();
    if (navigation && navigation.navigate) return navigation.navigate("Profile");
  }

  function handleWalletPress() {
    setWalletModalVisible(true);
  }

  /** Buy selected pack via IAP */
  async function handleBuySelectedPack() {
    if (!user) {
      Alert.alert("Not signed in", "Please sign in to purchase credits.");
      return;
    }
    const idx = selectedPackIndex ?? 0;
    const pack = CREDIT_PACKS[idx];
    if (!pack) {
      Alert.alert("Select pack", "Please select a credits pack to buy.");
      return;
    }

    setBuying(true);
    try {
      // Request purchase (unified API call for v12+)
      const purchase = await RNIap.requestPurchase({
        sku: pack.productId, // iOS
        skus: [pack.productId], // Android
      });

      if (purchase) {
        try {
          await RNIap.finishTransaction(purchase);
        } catch (finishErr) {
          console.warn("finishTransaction failed", finishErr);
        }

        // Credit user on backend
        const newBalance = await purchaseCredits(user.id, pack.credits, 0);
        setBalance(newBalance);

        Alert.alert(
          "Success",
          `Purchased ${pack.credits} credits. New balance: ${newBalance}`
        );

        setWalletModalVisible(false);
      }
    } catch (err: any) {
      console.error("purchaseCredits error:", err);
      Alert.alert("Purchase failed", err?.message ?? "Failed to add credits");
    } finally {
      setBuying(false);
    }
  }

  const displayName =
    (user && (user.user_metadata?.full_name || user.user_metadata?.name)) ||
    user?.email ||
    "Guest";
  const avatarUri =
    user &&
    (user.user_metadata?.avatar_url || user.user_metadata?.avatar);

  return (
    <View style={[styles.header, style]}>
      {/* Profile */}
      <TouchableOpacity
        style={styles.profile}
        onPress={handleProfilePress}
        accessibilityRole="button"
      >
        {loading ? (
          <ActivityIndicator size="small" />
        ) : avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarFallback}>
            <Text style={styles.avatarText}>
              {displayName?.charAt(0)?.toUpperCase() ?? "U"}
            </Text>
          </View>
        )}

        <View style={styles.profileTextWrap}>
          <Text numberOfLines={1} style={styles.profileName}>
            {displayName}
          </Text>
        </View>
      </TouchableOpacity>

      {/* Right side actions */}
      <View style={styles.rightActions}>
        <TouchableOpacity
          style={styles.action}
          onPress={handleWalletPress}
          accessibilityRole="button"
        >
          <Text style={styles.actionIcon}>💰</Text>
          <Text style={styles.actionLabel}>Wallet</Text>
          {showBalanceBadge && balance != null ? (
            <View style={styles.balanceBadge}>
              <CreditIcon size={12} />
              <Text style={styles.balanceText}>
                {Number(balance).toFixed(0)}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
          accessibilityRole="button"
        >
          <Image
            source={require("../assets/logout.png")}
            style={styles.logoutIcon}
            resizeMode="contain"
          />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>
      </View>

      {/* Wallet modal */}
      <Modal
        visible={walletModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setWalletModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setWalletModalVisible(false)}>
          <View style={modalStyles.backdrop} />
        </TouchableWithoutFeedback>

        <View style={modalStyles.sheet}>
          <Text style={modalStyles.title}>Wallet</Text>

          <Text style={modalStyles.current}>
            Current balance:{" "}
            {balance != null ? (
              <Text style={{ flexDirection: "row" }}>
                <CreditIcon size={14} /> {Number(balance).toFixed(0)}
              </Text>
            ) : (
              "—"
            )}
          </Text>

          {/* Packs */}
          <View style={modalStyles.packs}>
            {CREDIT_PACKS.map((p, i) => {
              const selected = i === selectedPackIndex;
              const storeProd = products.find(
                (prod) => prod.productId === p.productId || prod.sku === p.productId
              );
              return (
                <TouchableOpacity
                  key={p.credits}
                  style={[
                    modalStyles.pack,
                    selected ? modalStyles.packSelected : null,
                  ]}
                  onPress={() => setSelectedPackIndex(i)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <CreditIcon size={16} />
                    <Text
                      style={[
                        modalStyles.packCredits,
                        selected ? modalStyles.packCreditsSelected : null,
                      ]}
                    >
                      {p.credits}
                    </Text>
                  </View>
                  <Text
                    style={[
                      modalStyles.packPrice,
                      selected ? modalStyles.packPriceSelected : null,
                    ]}
                  >
                    {storeProd?.localizedPrice ?? "—"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity
            style={[modalStyles.buyButton, buying ? { opacity: 0.7 } : null]}
            onPress={handleBuySelectedPack}
            disabled={buying}
          >
            {buying ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={modalStyles.buyText}>Buy</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={modalStyles.closeButton}
            onPress={() => setWalletModalVisible(false)}
          >
            <Text style={modalStyles.closeText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  profile: { flexDirection: "row", alignItems: "center", flex: 1 },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#ddd",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2A0000",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginLeft: 10,
    borderWidth: 1,
    borderColor: "#FF3B30",
  },
  avatarText: { fontWeight: "700", color: "#333" },
  profileTextWrap: { marginLeft: 8, maxWidth: 120 },
  profileName: { fontWeight: "600", fontSize: 14 },
  rightActions: { flexDirection: "row", alignItems: "center" },
  action: {
    marginLeft: 10,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  logoutIcon: {
    width: 16,
    height: 16,
    tintColor: "#FF3B30",
    marginRight: 6,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#FF3B30",
  },
  actionIcon: { fontSize: 18 },
  actionLabel: { fontSize: 11 },
  balanceBadge: {
    marginTop: 2,
    backgroundColor: "#f1f1f1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  balanceText: { fontSize: 11, fontWeight: "600" },
});

const modalStyles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
  sheet: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "#111",
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 30,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  title: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 8 },
  current: { color: "#ddd", marginBottom: 12 },
  packs: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    justifyContent: "space-between" as any,
  },
  pack: {
    width: "48%",
    backgroundColor: "#222",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: "center",
  },
  packSelected: {
    borderWidth: 2,
    borderColor: "#45A3FF",
    backgroundColor: "#0B2030",
  },
  packCredits: { fontSize: 20, fontWeight: "700", color: "#fff", marginLeft: 6 },
  packCreditsSelected: { color: "#45A3FF" },
  packPrice: { fontSize: 13, color: "#ddd", marginTop: 6 },
  packPriceSelected: { color: "#45A3FF" },
  buyButton: {
    marginTop: 10,
    backgroundColor: "#45A3FF",
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
  },
  buyText: { color: "#fff", fontWeight: "700" },
  closeButton: { marginTop: 8, alignItems: "center" },
  closeText: { color: "#ddd" },
});
