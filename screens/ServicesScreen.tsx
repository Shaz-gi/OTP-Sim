// react-native-5sim-workflow.tsx
// Updated: show FINAL in-app currency price (credits) only (30% markup + conversion).
// Export plain screen components so App.tsx can register them.

import React, { useEffect, useState, useRef } from "react";
import Header from "../components/header";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
  ScrollView,
  TextInput,
  Platform
} from "react-native";
import { supabase } from "../lib/supabase";
import { getAccessToken } from "../services/auth";
import {
  reuseNumber as apiReuseNumber,
  checkOrder as apiCheckOrder,
  finishOrder as apiFinishOrder,
  cancelOrder as apiCancelOrder,
  banOrder as apiBanOrder,
  getSmsInbox as apiGetSmsInbox,
  getNotifications as apiGetNotifications,
} from "../api/5simApi";

// -----------------------------
// Config: markup + conversion
// -----------------------------
const APP_CREDITS_PER_UNIT = Number(process.env.EXPO_PUBLIC_PRICE_TO_CREDIT ?? "10"); // e.g. 10 credits per 1 unit
const MARKUP_PERCENT = Number(process.env.EXPO_PUBLIC_MARKUP_PERCENT ?? "30"); // default +30%
const MARKUP_MULTIPLIER = 1 + MARKUP_PERCENT / 100;

// -----------------------------
// 5sim API helper (guest + user)
// -----------------------------
const API_BASE = "https://5sim.net/v1";
// If you need to call user endpoints (buy), provide a token. Keep it secure in env/secure store.
const USER_API_TOKEN: string | null = null; // set at runtime from secure store if needed

async function fetchJSON(url: string, opts: RequestInit = {}): Promise<any> {
  console.log("fetching:", url);
  const res = await fetch(url, opts);
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch (e) {
    parsed = text;
  }

  if (!res.ok) {
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

// Robust price fetch (tries country variants and mapping)
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
      if (data === null || data === "null") return null;
      if (typeof data === "object") {
        if (Array.isArray(data) && data.length === 0) return null;
        if (!Array.isArray(data) && Object.keys(data).length === 0) return null;
      }
      return data;
    } catch (err) {
      console.warn("[prices] error for", withCountry, err);
      return null;
    }
  }

  const candidates = [
    country,
    typeof country === "string" ? country.toUpperCase() : country,
    typeof country === "string" ? country.toLowerCase() : country,
    typeof country === "string" && country.length >= 2 ? country.slice(0, 2).toUpperCase() : null,
    typeof country === "string" ? country.charAt(0).toUpperCase() + country.slice(1).toLowerCase() : null,
  ].filter(Boolean) as string[];

  for (const c of candidates) {
    const res = await attempt(c);
    if (res) return res;
  }

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
          Authorization: `Bearer ${process.env.EXPO_PUBLIC_5SIM_API_KEY}`,
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
      <Header navigation={navigation} />

      <Text style={styles.title}>Select a Service</Text>

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
            {services.length === 0 ? "No services found." : "No results for your search."}
          </Text>
        }
      />
    </View>
  );
}

// -----------------------------
// Countries screen
// -----------------------------
import countries from "i18n-iso-countries";
import enLocale from "i18n-iso-countries/langs/en.json";

countries.registerLocale(enLocale);

function nameToIso2(name: string): string | null {
  return countries.getAlpha2Code(name, "en") || null;
}

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
        item.name ?? item.fullname ?? item.country ?? item.label ?? item.title ?? item.code;
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
          <TouchableOpacity onPress={() => setQuery("")} style={styles.clearButton} accessibilityLabel="Clear search">
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
                  country: label,
                })
              }
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ fontSize: 22, marginRight: 8 }}>{iso2 ? countryCodeToFlag(iso2) : "🏳️"}</Text>
                <View>
                  <Text style={styles.itemText}>{label}</Text>
                  <Text style={styles.muted}>{label}</Text>
                </View>
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.muted}>{countriesList.length === 0 ? "No countries available." : "No results for your search."}</Text>}
      />
    </View>
  );
}

// -----------------------------
// Prices screen: show in-app credits only
// -----------------------------

// Helper that normalizes many possible shapes the /prices endpoint might return
function normalizePricesResponse(data: any, country: string, product: string): any[] {
  if (!data || typeof data !== "object") return [];

  function parsePrice(v: any): number | null {
    if (v == null) return null;
    const maybe = typeof v === "string" ? v.replace(/[^\d.\-]/g, "") : v;
    const n = Number(maybe);
    return Number.isFinite(n) ? n : null;
  }

  // Try common shape: data[country][product][operator] -> details
  const countryData = data[country] ?? data[country.toLowerCase()] ?? data[country.toUpperCase()];
  if (countryData && typeof countryData === "object") {
    const productData = countryData[product] ?? countryData[product.toLowerCase()] ?? countryData[product.toUpperCase()];
    if (productData && typeof productData === "object") {
      return Object.entries(productData).map(([operator, details]: [string, any]) => {
        const rawPrice = parsePrice(details?.cost ?? details?.price ?? details?.rate ?? details?.value ?? details?.price_usd ?? null);
        const providerPrice = rawPrice ?? null;
        const priceWithMarkup = providerPrice != null ? Number((providerPrice * MARKUP_MULTIPLIER).toFixed(6)) : null;
        const credits = priceWithMarkup != null ? Math.ceil(priceWithMarkup * APP_CREDITS_PER_UNIT) : null;

        return {
          operator,
          credits, // final in-app currency price (what user pays)
          priceWithMarkup,
          providerPrice,
          count: details?.count ?? null,
          rate: details?.rate ?? null,
          raw: details,
        };
      });
    }
  }

  // fallback: scan for nested price shapes
  try {
    const operators: any[] = [];
    for (const [k, v] of Object.entries(data)) {
      if (typeof v === "object") {
        for (const [op, det] of Object.entries(v as any)) {
          const rawPrice = parsePrice((det as any)?.cost ?? (det as any)?.price ?? (det as any)?.rate ?? null);
          if (rawPrice != null) {
            const priceWithMarkup = Number((rawPrice * MARKUP_MULTIPLIER).toFixed(6));
            const credits = Math.ceil(priceWithMarkup * APP_CREDITS_PER_UNIT);
            operators.push({
              operator: String(op),
              credits,
              priceWithMarkup,
              providerPrice: rawPrice,
              count: (det as any)?.count ?? null,
              rate: (det as any)?.rate ?? null,
              raw: det,
            });
          }
        }
      }
    }
    return operators;
  } catch (e) {
    return [];
  }
}

export function PricesScreen({ route, navigation }: any) {
  const { product, country } = route.params as { product: string; country: string };
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
                credits: item.credits, // pass final in-app credits to purchase screen
                count: item.count,
                rate: item.rate,
              })
            }
          >
            <View>
              <Text style={styles.itemText}>{item.operator}</Text>
              <Text style={styles.muted}>In-app price: {item.credits != null ? item.credits : "N/A"} credits</Text>
              <Text style={styles.muted}>Count: {item.count ?? "N/A"}</Text>
            </View>
            <Text style={styles.buyText}>Select</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No pricing information available.</Text>}
      />
    </View>
  );
}

// -----------------------------
// Purchase screen: summary + call buyActivation
// -----------------------------
export function PurchaseScreen({ route, navigation }: any) {
  const { product, country, operator, credits, count, rate } = route.params as {
    product: string;
    country: string;
    operator: string;
    credits?: number | null;
    count?: number | null;
    rate?: number | null;
  };

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  // helper: build buy endpoint respecting USE_EDGE_PROXY + FUNCTION_BASE
  function getBuyFunctionUrl() {
    // FUNCTION_BASE is defined in your file; default is the functions domain
    return `https://jkzaolzsmhiisvhhvlgh.supabase.co/functions/v1/buy-sim`
  }

  const handleBuy = async () => {
    setLoading(true);
    setError(null);

    try {
      // 1) get user token (RN supabase client)
      const sessionRes = await supabase.auth.getSession();
      const userToken = sessionRes?.data?.session?.access_token;
      if (!userToken) {
        throw new Error("Not signed in — please sign in to continue.");
      }

      // tiny uuid for idempotency
      function makeClientRequestId() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
          const r = (Math.random() * 16) | 0;
          const v = c === 'x' ? r : (r & 0x3) | 0x8;
          return v.toString(16);
        });
      }

      // 2) Build body: pass estimateCredits so backend can reserve-first
      const clientRequestId = makeClientRequestId();
      const body = {
        country,
        operator,
        product,
        clientRequestId,
        estimateCredits: credits ?? null,
      };

      // 3) Call Edge Function buy endpoint (or fallback)
      let resp: Response;
      if (USE_EDGE_PROXY) {
        const FUNCTION_URL = getBuyFunctionUrl();
        resp = await fetch(FUNCTION_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify(body),
        });
      } else {
        // in-case you want to call 5sim directly from app (not recommended)
        // NOTE: direct call will need a provider key; keep secure server-side normally
        const directUrl = `https://5sim.net/v1/user/buy/activation/${encodeURIComponent(country)}/${encodeURIComponent(operator)}/${encodeURIComponent(product)}`;
        resp = await fetch(directUrl, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.EXPO_PUBLIC_5SIM_API_KEY}`,
            Accept: "application/json",
          },
        });
      }

      const json = await resp.json().catch(() => ({}));

      if (!resp.ok) {
        // parse server error shape if possible
        const msg = json?.message ?? json?.error ?? JSON.stringify(json) ?? `HTTP ${resp.status}`;
        throw new Error(msg);
      }

      // Success path: backend contract (our function) returns { success: true, order, newBalance } in many cases.
      // Normalize to an `order` object so we can pass it to the Order screen.
      const order = json?.order ?? json ?? null;
      setResult(json);

      // Navigate to Order screen and pass order + id + phone for immediate control
      const orderId =
        order?.id ??
        order?.order_id ??
        order?.provider_order_id ??
        json?.id ??
        json?.order_id ??
        null;
      const orderPhone = order?.phone ?? order?.number ?? json?.phone ?? null;

      // Give a small delay to let Alert show (optional), or navigate immediately
      Alert.alert("✅ Order placed", "Opening order details...");
      // Navigate: ensure you have 'Order' registered in your navigator
      navigation.navigate("Order", {
        order,
        id: orderId,
        phone: orderPhone,
      });

      console.log("📦 buy-sim response:", json);
    } catch (err: any) {
      console.error("Purchase failed:", err);
      setError(err?.message ?? "Failed to place order");
      Alert.alert("Purchase failed", err?.message ?? String(err));
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
          Price (in-app): <Text style={styles.fieldValue}>{credits != null ? `${credits} credits` : "N/A"}</Text>
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
          <Text style={styles.muted}>Order result (see console for full object):</Text>
          <Text selectable style={styles.small}>
            {JSON.stringify(result, null, 2)}
          </Text>
          <TouchableOpacity style={[styles.button, { marginTop: 12 }]} onPress={() => navigation.popToTop()}>
            <Text style={styles.buttonText}>Done</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity style={styles.button} onPress={handleBuy} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Buy Activation</Text>}
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

const FUNCTION_BASE = process.env.EXPO_PUBLIC_FUNCTIONS_URL ?? "https://jkzaolzsmhiisvhhvlgh.functions.supabase.co";
// If you want the screen to use Edge Function proxy endpoints, set USE_EDGE_PROXY = true
const USE_EDGE_PROXY = true; // set false to call direct api.* helpers above (not recommended for prod)

// Props: either pass full order object from purchase result OR pass id and phone
// Example navigation: navigation.navigate('Order', { order: orderObj }) or navigation.navigate('Order', { id: 860953857 })
export function OrderScreen({ route, navigation }: any) {
  const { order, id }: { order?: any; id?: string | number } = route.params || {};

  // If order object was passed, extract core fields
  const initialId = id ?? order?.id ?? order?.order_id ?? order?.id_str ?? null;
  const initialPhone = order?.phone ?? order?.number ?? null;

  const [orderData, setOrderData] = useState<any | null>(order ?? null);
  const [loading, setLoading] = useState<boolean>(false);
  const [smsList, setSmsList] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // polling support for SMS inbox
  const pollingRef = useRef<number | null>(null);
  const [polling, setPolling] = useState<boolean>(false);
  const [pollIntervalMs, setPollIntervalMs] = useState<number>(5000);

  useEffect(() => {
    // load initial order if we only have id
    (async () => {
      if (!orderData && initialId) {
        await handleCheckOrder(initialId);
      }
    })();

    return () => {
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- Helper: call Edge Function proxy (POST) ----------
  async function callEdge(action: string, payload: any = {}) {
    const token = await getAccessToken();
    if (!token) throw new Error("Not signed in");

// hardcoded function URL (dashboard-provided canonical endpoint)
const BUY_SIM_FUNCTION_URL =
  "https://jkzaolzsmhiisvhhvlgh.supabase.co/functions/v1/buy-sim";


    const res = await fetch(BUY_SIM_FUNCTION_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = json?.message ?? json?.error ?? `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json;
  }

  // ---------- Fallback helper: call local api helper functions directly ----------
  async function callDirectHelper(name: string, ...args: any[]) {
    switch (name) {
      case "reuse":
        return apiReuseNumber(args[0], args[1]);
      case "check":
        return apiCheckOrder(args[0]);
      case "finish":
        return apiFinishOrder(args[0]);
      case "cancel":
        return apiCancelOrder(args[0]);
      case "ban":
        return apiBanOrder(args[0]);
      case "inbox":
        return apiGetSmsInbox(args[0]);
      case "notifications":
        return apiGetNotifications(args[0] ?? "en");
      default:
        throw new Error("Unknown direct helper: " + name);
    }
  }

  // ---------- High-level action functions ----------
  async function handleReuseNumber(product: string, number: string) {
    setBusyAction("reuse");
    setError(null);
    try {
      let result;
      if (USE_EDGE_PROXY) {
        // call your server function; adapt payload to what your Edge Function expects
        // If you use single function 'buy-sim', send action in body: { action:'reuse', product, number }
        result = await callEdge("reuse-number", { product, number });
      } else {
        result = await callDirectHelper("reuse", product, number);
      }
      Alert.alert("Re-use result", JSON.stringify(result));
      console.log("reuse ->", result);
    } catch (e: any) {
      console.error("reuse error", e);
      setError(String(e?.message ?? e));
      Alert.alert("Re-use failed", String(e?.message ?? e));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCheckOrder(orderId?: string | number) {
    setBusyAction("check");
    setError(null);
    try {
      const oid = orderId ?? initialId;
      if (!oid) throw new Error("Missing order id");
      let result;
      if (USE_EDGE_PROXY) {
        result = await callEdge("check-order", { id: oid });
      } else {
        result = await callDirectHelper("check", String(oid));
      }
      // normalize: some API return { sms: null, ... } while others return nested data
      setOrderData(result);
      console.log("check ->", result);
      return result;
    } catch (e: any) {
      console.error("check error", e);
      setError(String(e?.message ?? e));
      Alert.alert("Check failed", String(e?.message ?? e));
      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function handleFinishOrder(orderId?: string | number) {
    setBusyAction("finish");
    setError(null);
    try {
      const oid = orderId ?? initialId;
      if (!oid) throw new Error("Missing order id");
      let result;
      if (USE_EDGE_PROXY) {
        result = await callEdge("finish-order", { id: oid });
      } else {
        result = await callDirectHelper("finish", String(oid));
      }
      Alert.alert("Finish result", JSON.stringify(result));
      // update orderData if needed
      await handleCheckOrder(oid);
      return result;
    } catch (e: any) {
      console.error("finish error", e);
      setError(String(e?.message ?? e));
      Alert.alert("Finish failed", String(e?.message ?? e));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleCancelOrder(orderId?: string | number) {
    setBusyAction("cancel");
    setError(null);
    try {
      const oid = orderId ?? initialId;
      if (!oid) throw new Error("Missing order id");
      let result;
      if (USE_EDGE_PROXY) {
        result = await callEdge("cancel-order", { id: oid });
      } else {
        result = await callDirectHelper("cancel", String(oid));
      }
      Alert.alert("Cancel result", JSON.stringify(result));
      await handleCheckOrder(oid);
      return result;
    } catch (e: any) {
      console.error("cancel error", e);
      setError(String(e?.message ?? e));
      Alert.alert("Cancel failed", String(e?.message ?? e));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleBanOrder(orderId?: string | number) {
    setBusyAction("ban");
    setError(null);
    try {
      const oid = orderId ?? initialId;
      if (!oid) throw new Error("Missing order id");
      let result;
      if (USE_EDGE_PROXY) {
        result = await callEdge("ban-order", { id: oid });
      } else {
        result = await callDirectHelper("ban", String(oid));
      }
      Alert.alert("Ban result", JSON.stringify(result));
      await handleCheckOrder(oid);
      return result;
    } catch (e: any) {
      console.error("ban error", e);
      setError(String(e?.message ?? e));
      Alert.alert("Ban failed", String(e?.message ?? e));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGetSmsInbox(orderId?: string | number) {
    setBusyAction("inbox");
    setError(null);
    try {
      const oid = orderId ?? initialId;
      if (!oid) throw new Error("Missing order id");
      let result;
      if (USE_EDGE_PROXY) {
        result = await callEdge("sms-inbox", { id: oid });
      } else {
        result = await callDirectHelper("inbox", String(oid));
        // note: direct helper likely returns array or { sms: [...] }
      }

      // normalize to array
      const messages = Array.isArray(result) ? result : result?.sms ?? result?.items ?? [];
      setSmsList(Array.isArray(messages) ? messages : [messages]);
      console.log("inbox ->", result);
      return result;
    } catch (e: any) {
      console.error("inbox error", e);
      setError(String(e?.message ?? e));
      Alert.alert("Inbox failed", String(e?.message ?? e));
    } finally {
      setBusyAction(null);
    }
  }

  async function handleGetNotifications(lang = "en") {
    setBusyAction("notifications");
    setError(null);
    try {
      let result;
      if (USE_EDGE_PROXY) {
        result = await callEdge("notifications", { lang });
      } else {
        result = await callDirectHelper("notifications", lang);
      }
      // normalize
      const list = Array.isArray(result) ? result : result?.flash ?? result?.items ?? [];
      setNotifications(list);
      console.log("notifications ->", result);
      return result;
    } catch (e: any) {
      console.error("notifications error", e);
      setError(String(e?.message ?? e));
      Alert.alert("Notifications failed", String(e?.message ?? e));
    } finally {
      setBusyAction(null);
    }
  }

  // ---------- Polling control ----------
  function startPolling() {
    if (pollingRef.current) return;
    setPolling(true);
    pollingRef.current = setInterval(async () => {
      if (!initialId && !orderData?.id) return;
      await handleGetSmsInbox(initialId ?? orderData?.id);
    }, pollIntervalMs) as unknown as number;
  }
  function stopPolling() {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPolling(false);
  }

  // ---------- UI Helpers ----------
  function renderOrderSummary() {
    if (!orderData) {
      return <Text style={styles.muted}>No order loaded.</Text>;
    }

    const displayFields = [
      ["id", orderData?.id ?? orderData?.order_id ?? "—"],
      ["phone", orderData?.phone ?? orderData?.number ?? "—"],
      ["operator", orderData?.operator ?? "—"],
      ["product", orderData?.product ?? orderData?.service ?? "—"],
      ["price", orderData?.price ?? orderData?.cost ?? "—"],
      ["status", orderData?.status ?? "—"],
      ["expires", orderData?.expires ?? orderData?.expiration ?? "—"],
    ];

    return (
      <View style={styles.card}>
        {displayFields.map(([k, v]) => (
          <Text style={styles.field} key={String(k)}>
            {k}: <Text style={styles.fieldValue}>{String(v)}</Text>
          </Text>
        ))}
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Order Details</Text>

      {renderOrderSummary()}

      <View style={{ marginVertical: 10 }}>
        <Text style={styles.muted}>Actions</Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
          <ActionButton
            title="Check order (Get SMS)"
            onPress={() => handleCheckOrder(initialId)}
            loading={busyAction === "check"}
          />
          <ActionButton
            title="Finish order"
            onPress={() => handleFinishOrder(initialId)}
            loading={busyAction === "finish"}
          />
          <ActionButton
            title="Cancel order"
            onPress={() => handleCancelOrder(initialId)}
            loading={busyAction === "cancel"}
          />
          <ActionButton
            title="Ban order"
            onPress={() => handleBanOrder(initialId)}
            loading={busyAction === "ban"}
          />
          <ActionButton
            title="SMS inbox"
            onPress={() => handleGetSmsInbox(initialId)}
            loading={busyAction === "inbox"}
          />
          <ActionButton
            title={polling ? "Stop auto-poll" : "Start auto-poll SMS"}
            onPress={() => (polling ? stopPolling() : startPolling())}
            loading={false}
          />
          <ActionButton
            title="Notifications"
            onPress={() => handleGetNotifications("en")}
            loading={busyAction === "notifications"}
          />
          {/* Reuse number requires product & number; show only if we have them */}
          {((orderData?.product ?? order?.product) && (orderData?.phone ?? initialPhone)) && (
            <ActionButton
              title="Re-use number"
              onPress={() =>
                handleReuseNumber(orderData?.product ?? order?.product, (orderData?.phone ?? initialPhone) as string)
              }
              loading={busyAction === "reuse"}
            />
          )}
        </View>
      </View>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={{ height: 16 }} />

      <Text style={styles.title}>SMS Inbox</Text>
      {busyAction === "inbox" && <ActivityIndicator />}
      <FlatList
        data={smsList}
        keyExtractor={(item: any, idx) => `${item?.id ?? item?.from ?? idx}`}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.field}>From: <Text style={styles.fieldValue}>{item?.from ?? item?.sender ?? "—"}</Text></Text>
            <Text style={styles.field}>Text: <Text style={styles.fieldValue}>{item?.text ?? item?.message ?? JSON.stringify(item)}</Text></Text>
            <Text style={styles.mutedSmall}>{item?.received_at ?? item?.date ?? ""}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No SMS messages yet.</Text>}
      />

      <View style={{ height: 16 }} />

      <Text style={styles.title}>Notifications</Text>
      <FlatList
        data={notifications}
        keyExtractor={(item: any, idx) => item?.id ?? item?.title ?? idx}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.field}>{item?.title ?? item?.message ?? JSON.stringify(item)}</Text>
            <Text style={styles.mutedSmall}>{item?.created_at ?? ""}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No notifications.</Text>}
      />
    </ScrollView>
  );
}

// ---------- small action button ----------
function ActionButton({ title, onPress, loading }: { title: string; onPress: () => void; loading?: boolean }) {
  return (
    <TouchableOpacity style={styles.smallButton} onPress={onPress} disabled={loading}>
      {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.smallButtonText}>{title}</Text>}
    </TouchableOpacity>
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
  error: { color: "#ff6b6b" },
  muted: { color: "#9AA0A6", marginBottom: 8 },
  mutedSmall: { color: "#8f99a4", fontSize: 12 },
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
  },
  smallButtonText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  smallButton: {
    backgroundColor: "#0A84FF",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginRight: 8,
    marginTop: 8,
  },
});

export { buyActivation };
