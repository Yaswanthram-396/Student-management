
// const DEFAULT_BASE_URL =
//   Platform.OS === "android"
//     ? "http://192.168.0.102:8000"
//     : "http://localhost:8000";
const DEFAULT_BASE_URL = "https://schoolsbackend-production.up.railway.app";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;
export const API_BASE = `${BASE_URL}/api/v1`;
