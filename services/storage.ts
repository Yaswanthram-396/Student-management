import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const ACCESS_TOKEN_KEY = "auth_access_token";
const REFRESH_TOKEN_KEY = "auth_refresh_token";

async function setItem(key: string, value: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function getItem(key: string) {
  if (Platform.OS === "web") {
    return localStorage.getItem(key);
  }
  return await SecureStore.getItemAsync(key);
}

async function removeItem(key: string) {
  if (Platform.OS === "web") {
    localStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

export const storage = {
  async setAccessToken(token: string) {
    await setItem(ACCESS_TOKEN_KEY, token);
  },

  async getAccessToken() {
    return await getItem(ACCESS_TOKEN_KEY);
  },

  async setRefreshToken(token: string) {
    await setItem(REFRESH_TOKEN_KEY, token);
  },

  async getRefreshToken() {
    return await getItem(REFRESH_TOKEN_KEY);
  },

  async setTokens(accessToken: string, refreshToken: string) {
    await Promise.all([
      setItem(ACCESS_TOKEN_KEY, accessToken),
      setItem(REFRESH_TOKEN_KEY, refreshToken),
    ]);
  },

  async clearTokens() {
    await Promise.all([
      removeItem(ACCESS_TOKEN_KEY),
      removeItem(REFRESH_TOKEN_KEY),
    ]);
  },

  // Backward-compatible helpers while older code still calls token APIs.
  async setToken(token: string) {
    await setItem(ACCESS_TOKEN_KEY, token);
  },

  async getToken() {
    return await getItem(ACCESS_TOKEN_KEY);
  },

  async clearToken() {
    await this.clearTokens();
  },
};
