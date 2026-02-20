import axios from "axios";
import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Standardize validation errors for Frontend Toasts
    if (error.response && error.response.status === 422 && error.response.data.errors) {
      // Backend sends errors as [{ "field": "message" }, ...]
      // We transform this into a single string: "field: message, ..."
      const errorMessages = error.response.data.errors.map(errObj => {
        const key = Object.keys(errObj)[0];
        return `${errObj[key]}`; // Or `${key}: ${errObj[key]}` if you want the field name
      }).join('\n');

      // Overwrite the message so generic catch blocks pick up the detailed list
      error.response.data.message = errorMessages;
    }

    if (error.response && error.response.status === 401) {
      // Handle unauthorized access
      Cookies.remove("token");
      // The application state will be updated by AuthProvider's check
    }
    return Promise.reject(error);
  }
);

// Helpers for non-axios consumers (e.g. fetch-based SSE streaming)
export const getAuthToken = () => Cookies.get("token");
export const getBaseURL = () => API_URL;

export default api;
