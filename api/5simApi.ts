// server-side 5sim client (server/api/5sim.ts)
import axios from "axios";

const FIVE_SIM_API_KEY = process.env.FIVE_SIM_API_KEY!;
if (!FIVE_SIM_API_KEY) throw new Error("Missing FIVE_SIM_API_KEY env var");

export const API = axios.create({
  baseURL: "https://5sim.net/v1",
  headers: {
    Authorization: `Bearer ${FIVE_SIM_API_KEY}`,
    Accept: "application/json",
  },
  timeout: 20000,
});


export const getBalance = async () => {
  try {
    const response = await API.get("/user/profile");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching balance:", error.response?.data || error.message);
    throw error;
  }
};

export const getOrderHistory = async (params: {
  category: "hosting" | "activation";
  limit?: number;
  offset?: number;
  order?: string;
  reverse?: boolean;
}) => {
  try {
    const response = await API.get("/user/orders", { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching order history:", error.response?.data || error.message);
    throw error;
  }
};


export const getPaymentsHistory = async (params?: {
  limit?: number;
  offset?: number;
  order?: string;
  reverse?: boolean;
}) => {
  try {
    const response = await API.get("/user/payments", { params });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching payments history:", error.response?.data || error.message);
    throw error;
  }
};

export const getMaxPrices = async () => {
  try {
    const response = await API.get("/user/max-prices");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching max prices:", error.response?.data || error.message);
    throw error;
  }
};

export const createOrUpdateMaxPrice = async (productName: string, price: number) => {
  try {
    const response = await API.post("/user/max-prices", {
      product_name: productName,
      price: price,
    });
    return response.data;
  } catch (error: any) {
    console.error("Error creating/updating max price:", error.response?.data || error.message);
    throw error;
  }
};

export const getProducts = async (country: string, operator: string) => {
  try {
    const response = await API.get(`/guest/products/${country}/${operator}`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching products:", error.response?.data || error.message);
    throw error;
  }
};

export const getCountries = async () => {
  try {
    const response = await API.get("/guest/countries");
    return response.data;
  } catch (error: any) {
    console.error("Error fetching countries:", error.response?.data || error.message);
    throw error;
  }
};

export const deleteMaxPrice = async (productName: string) => {
  try {
    const response = await API.delete("/user/max-prices", {
      headers: { "Content-Type": "application/json" },
      data: { product_name: productName }, // 👈 JSON body
    });
    console.log("Delete Max Price Status:", response.status);
    return response.data;
  } catch (error: any) {
    if (error.response) {
      console.error("API Error:", error.response.status, error.response.data);
    } else {
      console.error("Error:", error.message);
    }
    throw error;
  }
};

export const getPrices = async () => {
  try {
    const response = await API.get(`/guest/prices`);
    return response.data;
  } catch (error: any) {
    console.error("Error fetching prices:", error.response?.data || error.message);
    throw error;
  }
};

export const getPricesByCountry = async (country: string) => {
  try {
    const response = await API.get(`/guest/prices`, {
      params: { country },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching prices by country:", error.response?.data || error.message);
    throw error;
  }
};

export const getPricesByProduct = async (product: string) => {
  try {
    const response = await API.get(`/guest/prices`, {
      params: { product },
    });
    return response.data;
  } catch (error: any) {
    console.error("Error fetching prices by product:", error.response?.data || error.message);
    throw error;
  }
};

export const getPricesByCountryAndProduct = async (country: string, product: string) => {
  try {
    const response = await API.get(`/guest/prices`, {
      params: { country, product },
    });
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching prices by country & product:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const buyActivationNumber = async (
  country: string,
  operator: string,
  product: string,
  options: {
    forwarding?: string; // "1" or "0"
    number?: string;     // 11 digits, no +
    reuse?: string;      // "1" or "0"
    voice?: string;      // "1" or "0"
    ref?: string;
    maxPrice?: string;
  } = {}
) => {
  try {
    const response = await API.get(
      `/user/buy/activation/${country}/${operator}/${product}`,
      { params: options }
    );
    console.log("Buy Activation Number Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error buying activation number:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const buyHostingNumber = async (
  country: string,
  operator: string,
  product: string
) => {
  try {
    const response = await API.get(
      `/user/buy/hosting/${country}/${operator}/${product}`
    );
    console.log("Buy Hosting Number Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error buying hosting number:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const reuseNumber = async (product: string, number: string) => {
  try {
    const response = await API.get(`/user/reuse/${product}/${number}`);
    console.log("Reuse Number Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error reusing number:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const checkOrder = async (id: string) => {
  try {
    const response = await API.get(`/user/check/${id}`);
    console.log("Check Order Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error checking order:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const finishOrder = async (id: string) => {
  try {
    const response = await API.get(`/user/finish/${id}`);
    console.log("Finish Order Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error finishing order:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const cancelOrder = async (id: string) => {
  try {
    const response = await API.get(`/user/cancel/${id}`);
    console.log("Cancel Order Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error canceling order:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const banOrder = async (id: string) => {
  try {
    const response = await API.get(`/user/ban/${id}`);
    console.log("Ban Order Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error banning order:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getSmsInbox = async (id: string) => {
  try {
    const response = await API.get(`/user/sms/inbox/${id}`);
    console.log("SMS Inbox Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching SMS inbox:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const getNotifications = async (lang: string = "en") => {
  try {
    const response = await API.get(`/guest/flash/${lang}`);
    console.log("Notifications Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error fetching notifications:",
      error.response?.data || error.message
    );
    throw error;
  }
};

export const togglePrices = async (disable: boolean, list?: number[]) => {
  try {
    const response = await API.post(`/vendor/prices/disable`, {
      disable,
      list,
    });
    console.log("Toggle Prices Status:", response.status);
    return response.data;
  } catch (error: any) {
    console.error(
      "Error toggling prices:",
      error.response?.data || error.message
    );
    throw error;
  }
};

