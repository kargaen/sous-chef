import axios from "axios";

const client = axios.create({
  baseURL: process.env.EXPO_PUBLIC_API_BASE_URL ?? "",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

client.interceptors.request.use((config) => {
  const token = process.env.EXPO_PUBLIC_API_TOKEN;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default client;
