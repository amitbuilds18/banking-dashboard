import axios from "axios";

// Intelligently determine API baseURL:
// 1. If import.meta.env.VITE_API_URL is set, use it.
// 2. If running in production browser (not localhost), use the live Vercel backend URL.
// 3. Otherwise default to localhost:5000 for local development.
const defaultApiUrl =
  typeof window !== "undefined" &&
  window.location.hostname !== "localhost" &&
  window.location.hostname !== "127.0.0.1"
    ? "https://banking-dashboard-anuc.vercel.app/api"
    : "http://localhost:5000/api";

const API = axios.create({
  baseURL: import.meta.env.VITE_API_URL || defaultApiUrl,
  headers: {
    "Content-Type": "application/json",
  },
});

API.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

API.interceptors.response.use(
  (response) => response,
  (error) => {
    // Only redirect to /login on 401 if it's NOT an auth endpoint (/login, /register, /demo)
    const requestUrl = error?.config?.url || "";
    const isAuthRoute =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/demo");

    if (error?.response?.status === 401 && !isAuthRoute) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");

      // Prevent continuous reload loops if already on the /login page
      if (typeof window !== "undefined" && window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export const getAuthHeaders = () => {
  const token = localStorage.getItem("token");

  return {
    headers: token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {},
  };
};

export default API;