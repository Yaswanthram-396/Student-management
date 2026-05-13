import { Platform } from "react-native";

const DEFAULT_BASE_URL =
  Platform.OS === "android"
    ? "https://schoolsbackend-production.up.railway.app"
    : "https://schoolsbackend-production.up.railway.app";

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_BASE_URL;
export const API_BASE = `${BASE_URL}/api/v1`;
