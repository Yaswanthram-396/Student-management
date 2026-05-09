import { Platform } from "react-native";

const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "http://10.122.118.34:8000"
    : "http://localhost:8000";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;
export const API_BASE = `${BASE_URL}/api/v1`;
