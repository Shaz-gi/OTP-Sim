// react-native-5sim-workflow.tsx
// Updated: export plain screen components (no NavigationContainer) so App.tsx can register them.
// Fixed TypeScript typing errors (explicit any/array types and safe checks).

import React, { useEffect, useState } from "react";
import Header from "../components/header"
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  ScrollView,
  TextInput, // <- add this
} from "react-native";


// -----------------------------
// 5sim API helper (guest + user)
// -----------------------------
const API_BASE = "https://5sim.net/v1";
// If you need to call user endpoints (buy), provide a token. Keep it secure in env/secure store.
// Make the token possibly null and check it safely so TS won't infer never.
const USER_API_TOKEN = null; // <-- set this in runtime from secure store

async function fetchJSON(url: string, opts: RequestInit = {}): Promise<any> {
  console.log("fetching:", url);
  const res = await fetch(url, opts);
  const text = await res.text();
  // try to parse JSON even on non-OK so we can surface useful errors
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (e) {
    // not JSON
    parsed = text;
  }

  if (!res.ok) {
    // include parsed body in error if available
    const bodyPreview = typeof parsed === "string" ? parsed : JSON.stringify(parsed);
    throw new Error(`HTTP ${res.status}: ${bodyPreview}`);
  }
  return parsed;
}

export async function fetchProducts(country = "any", operator = "any"): Promise<any> {
  const url = `${API_BASE}/guest/products/${encodeURIComponent(country)}/${encodeURIComponent(operator)}`;
  return fetchJSON(url);
}

export async function fetchCountries(): Promise<any> {
  const url = `${API_BASE}/guest/countries`;
  return fetchJSON(url);
}

// Improve robustness: try multiple country formats and map via /guest/countries if needed
export async function fetchPrices(country: string, product: string): Promise<any> {
  const tried: string[] = [];

  async function attempt(withCountry: string) {
    if (withCountry == null) return null;
    tried.push(withCountry);
    const query = `country=${encodeURIComponent(withCountry)}&product=${encodeURIComponent(product)}`;
    const url = `${API_BASE}/guest/prices?${query}`;
    try {
      console.log(`[prices] trying country='${withCountry}' -> ${url}`);
      const data = await fetchJSON(url);
      console.log("[prices] response for", withCountry, ":", data);
      // treat literal string "null" and empty objects/arrays as no-data
      if (data === null || data === "null") return null;
      if (typeof data === "object") {
        if (Array.isArray(data) && data.length === 0) return null;
        if (!Array.isArray(data) && Object.keys(data).length === 0) return null;
      }
      return data;
    } catch (err) {
      // log and return null to try next candidate
      console.warn("[prices] error for", withCountry, err);
      return null;
    }
  }

  // candidates: original, uppercase, lowercase, first-2-letters uppercase, capitalized
  const candidates = [
    country,
    typeof country === "string" ? country.toUpperCase() : country,
    typeof country === "string" ? country.toLowerCase() : country,
    typeof country === "string" && country.length >= 2 ? country.slice(0, 2).toUpperCase() : null,
    typeof country === "string" ? country.charAt(0).toUpperCase() + country.slice(1).toLowerCase() : null,
  ].filter(Boolean) as string[];

  // try candidates first
  for (const c of candidates) {
    const res = await attempt(c);
    if (res) return res;
  }

  // If still null, try mapping via /guest/countries to find an ISO/code
  try {
    console.log("[prices] attempting to map country using /guest/countries");
    const countriesRaw: any = await fetchCountries();
    let countriesArr: any[] = [];

    if (Array.isArray(countriesRaw)) {
      countriesArr = countriesRaw;
    } else if (countriesRaw && typeof countriesRaw === "object") {
      const possible = countriesRaw.countries ?? countriesRaw.data ?? countriesRaw.items ?? countriesRaw.list ?? countriesRaw;
      if (Array.isArray(possible)) countriesArr = possible;
      else if (possible && typeof possible === "object") {
        countriesArr = Object.entries(possible).map(([k, v]) => {
          if (typeof v === "string") return { code: k, name: v };
          if (v && typeof v === "object") return { code: k, ...(v as Record<string, any>) };
          return { code: k };
        });
      } else {
        countriesArr = Object.entries(countriesRaw).map(([k, v]) => {
          if (typeof v === "string") return { code: k, name: v };
          if (v && typeof v === "object") return { code: k, ...(v as Record<string, any>) };
          return { code: k };
        });
      }
    }

    // find candidate by matching label/name/code (case-insensitive)
    const match = countriesArr.find((it) => {
      const names = [
        (it.name ?? it.label ?? it.country ?? it.title ?? "").toString(),
        (it.code ?? it.iso ?? it.id ?? "").toString(),
      ];
      return names.some((n) => n && n.toLowerCase() === country.toLowerCase());
    });

    if (match && (match.code || match.iso)) {
      const mapped = (match.code ?? match.iso).toString();
      console.log("[prices] mapped", country, "=>", mapped);
      const res = await attempt(mapped);
      if (res) return res;
    } else {
      // also try fuzzy match where name contains the country string
      const fuzzy = countriesArr.find((it) => {
        const name = (it.name ?? it.label ?? "").toString().toLowerCase();
        return country && name.includes(country.toLowerCase());
      });
      if (fuzzy && (fuzzy.code || fuzzy.iso)) {
        const mapped = (fuzzy.code ?? fuzzy.iso).toString();
        console.log("[prices] fuzzy-mapped", country, "=>", mapped);
        const res = await attempt(mapped);
        if (res) return res;
      } else {
        console.log("[prices] no mapping found for", country, "in countries list");
      }
    }
  } catch (err) {
    console.warn("[prices] mapping attempt failed:", err);
  }

  // final: return null so caller shows the raw response (or none)
  console.log("[prices] all attempts exhausted. tried:", tried);
  return null;
}

async function buyActivation(country: string, operator: string, product: string) {
  try {
    console.log("🔎 Buying activation with:", { country, operator, product });

    const resp = await fetch(
      `https://5sim.net/v1/user/buy/activation/${country}/${operator}/${product}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_5SIM_API_KEY}`, // 👈 your API key from .env
          Accept: "application/json",
        },
      }
    );

    if (!resp.ok) {
      const errText = await resp.text();
      throw new Error(`Failed to buy activation: ${resp.status} ${errText}`);
    }

    const json = await resp.json();
    console.log("✅ Activation purchased:", json);
    return json;
  } catch (err) {
    console.error("❌ Error buying activation", err);
    throw err;
  }
}

// -----------------------------
// Services screen: list of services (products)
// -----------------------------
export default function ServicesScreen({ navigation }: any) {
  const [services, setServices] = useState<string[]>([]);
  const [filtered, setFiltered] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");

  const debounceRef = React.useRef<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data: any = await fetchProducts("any", "any");
        if (!mounted) return;

        let items: string[] = [];
        if (Array.isArray(data)) {
          items = data.map((d: any) =>
            typeof d === "string" ? d : d.product || d.name || JSON.stringify(d)
          );
        } else if (data && typeof data === "object") {
          items = Object.keys(data);
        }

        setServices(items);
        setFiltered(items);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Failed to fetch services");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = query.trim().toLowerCase();
      if (q.length === 0) {
        setFiltered(services);
      } else {
        setFiltered(
          services.filter((s) => (s ?? "").toString().toLowerCase().includes(q))
        );
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, services]);

  if (loading) return loader();
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      {/* ✅ Our custom header */}
      <Header navigation={navigation} />

      <Text style={styles.title}>Select a Service</Text>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search services..."
          placeholderTextColor="#6E6E6E"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 ? (
          <TouchableOpacity
            onPress={() => setQuery("")}
            style={styles.clearButton}
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() => navigation.navigate("Countries", { product: item })}
          >
            <Text style={styles.itemText}>{item}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.muted}>
            {services.length === 0
              ? "No services found."
              : "No results for your search."}
          </Text>
        }
      />
    </View>
  );
}


// -----------------------------
// Countries screen: select a country for the chosen product
// -----------------------------

import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";


countries.registerLocale(enLocale);

// ✅ Convert name → ISO2 (for flag only)
function nameToIso2(name: string): string | null {
  return countries.getAlpha2Code(name, "en") || null;
}

// ✅ Convert ISO2 → Emoji flag
function countryCodeToFlag(code: string): string {
  if (!code || code.length !== 2) return "🏳️";
  return code
    .toUpperCase()
    .split("")
    .map((char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
    .join("");
}

export function CountriesScreen({ route, navigation }: any) {
  const { product } = route.params as { product: string };
  const [countriesList, setCountriesList] = useState<any[]>([]);
  const [filtered, setFiltered] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState<string>("");

  const debounceRef = React.useRef<any>(null);

  function normalizeCountry(item: any): { label: string; code: string } {
    if (typeof item === "string") return { label: item, code: item };
    if (item && typeof item === "object") {
      const label =
        item.name ??
        item.fullname ??
        item.country ??
        item.label ??
        item.title ??
        item.code;
      const code = item.code ?? label;
      return { label, code };
    }
    return { label: String(item), code: String(item) };
  }

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data: any = await fetchCountries();
        if (!mounted) return;

        let resolved: any[] = [];

        if (Array.isArray(data)) {
          resolved = data;
        } else if (data && typeof data === "object") {
          resolved = Object.entries(data).map(([k, v]) => {
            if (typeof v === "string") return { code: k, name: v };
            if (v && typeof v === "object") return { code: k, ...(v as any) };
            return { code: k };
          });
        }

        setCountriesList(resolved);
        setFiltered(resolved);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Failed to fetch countries");
      } finally {
        setLoading(false);
      }
    })();
    return () => {
      mounted = false;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // ✅ Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      const q = (query ?? "").trim().toLowerCase();
      if (!q) {
        setFiltered(countriesList);
        return;
      }

      const results = countriesList.filter((item) => {
        const { label } = normalizeCountry(item);
        return label.toLowerCase().includes(q);
      });

      setFiltered(results);
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, countriesList]);

  if (loading) return loader();
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Header navigation={navigation} />

      <Text style={styles.title}>Select Country for: {product}</Text>

      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TextInput
          placeholder="Search countries..."
          placeholderTextColor="#6E6E6E"
          value={query}
          onChangeText={setQuery}
          returnKeyType="search"
          style={styles.searchInput}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            style={styles.clearButton}
            accessibilityLabel="Clear search"
          >
            <Text style={styles.clearText}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item: any, idx: number) => {
          const { label } = normalizeCountry(item);
          return label || String(idx);
        }}
        renderItem={({ item }) => {
          const { label } = normalizeCountry(item);
          const iso2 = nameToIso2(label);
          return (
            <TouchableOpacity
              style={styles.item}
              onPress={() =>
                navigation.navigate("Prices", {
                  product,
                  country: label, // ✅ Pass raw name for API
                })
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 22, marginRight: 8 }}>
                  {iso2 ? countryCodeToFlag(iso2) : "🏳️"}
                </Text>
                <View>
                  <Text style={styles.itemText}>{label}</Text>
                  <Text style={styles.muted}>{label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={
          <Text style={styles.muted}>
            {countriesList.length === 0
              ? "No countries available."
              : "No results for your search."}
          </Text>
        }
      />
    </View>
  );
}
// -----------------------------
// Prices screen: show prices per operator (or per offer) and let user pick operator
// -----------------------------

// Helper that normalizes many possible shapes the /prices endpoint might return
function normalizePricesResponse(
  data: any,
  country: string,
  product: string
): any[] {
  if (!data || typeof data !== "object") return [];

  // Example shape: { england: { facebook: { vodafone: { cost, count, rate }, ... } } }
  const countryData = data[country];
  if (countryData && typeof countryData === "object") {
    const productData = countryData[product];
    if (productData && typeof productData === "object") {
      return Object.entries(productData).map(
        ([operator, details]: [string, any]) => ({
          operator,
          price: details?.cost ?? details?.price ?? null,
          count: details?.count ?? null,
          rate: details?.rate ?? null,
          raw: details, // keep full details for debugging
        })
      );
    }
  }

  // fallback if API shape changes
  return [];
}


export function PricesScreen({ route, navigation }: any) {
  const { product, country } = route.params as {
    product: string;
    country: string;
  };
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [raw, setRaw] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const data: any = await fetchPrices(country, product);
        if (!mounted) return;
        setRaw(data);
        const normalized = normalizePricesResponse(data, country, product);
        setPrices(normalized);
      } catch (err: any) {
        console.error(err);
        setError(err?.message ?? "Failed to fetch prices");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [country, product]);

  if (loading) return loader();
  if (error)
    return (
      <View style={styles.center}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>
        Prices for {product} — {country}
      </Text>

      <FlatList
        data={prices}
        keyExtractor={(item: any, idx: number) => `${item.operator}-${idx}`}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.item}
            onPress={() =>
              navigation.navigate("Purchase", {
                product,
                country,
                operator: item.operator,
                price: item.price,
                count: item.count,
                rate: item.rate,
              })
            }
          >
            <View>
              <Text style={styles.itemText}>{item.operator}</Text>
              <Text style={styles.muted}>
                Price: {item.price ?? "N/A"}
              </Text>
              <Text style={styles.muted}>
                Count: {item.count ?? "N/A"}
              </Text>
              <Text style={styles.muted}>
                Rate: {item.rate ?? "N/A"}
              </Text>
            </View>
            <Text style={styles.buyText}>Select</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.muted}>No pricing information available.</Text>
        }
      />
    </View>
  );
}

// -----------------------------
// Purchase screen: summary + call buyActivation
// -----------------------------

export function PurchaseScreen({ route, navigation }: any) {
  const { product, country, operator, price, count, rate } = route.params as {
    product: string;
    country: string;
    operator: string;
    price?: number;
    count?: number;
    rate?: number;
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBuy = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await buyActivation(country, operator, product);
      setResult(res);
      Alert.alert("✅ Order placed", "Check console for full order response.");
      console.log("📦 Order Response:", res);
    } catch (err: any) {
      setError(err?.message ?? "Failed to buy activation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Confirm Purchase</Text>

      <View style={styles.card}>
        <Text style={styles.field}>
          Product: <Text style={styles.fieldValue}>{product}</Text>
        </Text>
        <Text style={styles.field}>
          Country: <Text style={styles.fieldValue}>{country}</Text>
        </Text>
        <Text style={styles.field}>
          Operator: <Text style={styles.fieldValue}>{operator}</Text>
        </Text>
        <Text style={styles.field}>
          Price: <Text style={styles.fieldValue}>{price ?? "N/A"}</Text>
        </Text>
        <Text style={styles.field}>
          Count: <Text style={styles.fieldValue}>{count ?? "N/A"}</Text>
        </Text>
        <Text style={styles.field}>
          Rate: <Text style={styles.fieldValue}>{rate ?? "N/A"}</Text>
        </Text>
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      {result ? (
        <View style={styles.card}>
          <Text style={styles.muted}>
            Order result (see console for full object):
          </Text>
          <Text selectable style={styles.small}>
            {JSON.stringify(result, null, 2)}
          </Text>
          <TouchableOpacity
            style={[styles.button, { marginTop: 12 }]}
            onPress={() => navigation.popToTop()}
          >
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.button}
          onPress={handleBuy}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Buy Activation</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}
// -----------------------------
// Loader helper
// -----------------------------
function loader() {
  return (
    <View style={styles.center}>
      <ActivityIndicator size="large" />
    </View>
  );
}

// -----------------------------
// Styles
// -----------------------------
const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: "#121212" },
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#121212" },
  title: { fontSize: 18, fontWeight: "700", color: "#fff", marginBottom: 12 },
  item: { padding: 12, backgroundColor: "#1E1E1E", marginBottom: 8, borderRadius: 8, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  itemText: { color: "#fff", fontSize: 16 },
  buyText: { color: "#0A84FF", fontWeight: "700" },
  muted: { color: "#9AA0A6" },
  error: { color: "#ff6b6b" },
  button: { backgroundColor: "#0A84FF", padding: 12, borderRadius: 8, alignItems: "center", marginTop: 8 },
  buttonText: { color: "#fff", fontWeight: "700" },
  card: { backgroundColor: "#1A1A1A", padding: 12, borderRadius: 8, marginVertical: 8 },
  field: { color: "#fff", marginBottom: 6 },
  fieldValue: { fontWeight: "700", color: "#fff" },
  small: { color: "#ddd", fontSize: 12, marginTop: 8 },
    searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B1B1B",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    padding: 6,
  },
  clearButton: {
    marginLeft: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  clearText: {
    color: "#9AA0A6",
    fontWeight: "700",
    fontSize: 14,
  }
});

