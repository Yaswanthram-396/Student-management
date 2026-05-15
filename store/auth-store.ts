import { useSyncExternalStore } from "react";
import { ApiError } from "../services/api";
import { meApi } from "../services/me";
import { storage } from "../services/storage";
import { clearSelectedTeacherSection } from "./teacher-store";
import { clearSchoolConfiguration, fetchAndStoreSchoolConfig } from "./school-store";
import type { MeResponse } from "../types/auth";

export interface AuthState {
  token: string | null;
  currentUser: MeResponse | null;
  loadingMe: boolean;
  bootstrapped: boolean;
  error: string | null;
}

const initialState: AuthState = {
  token: null,
  currentUser: null,
  loadingMe: false,
  bootstrapped: false,
  error: null,
};

let state = initialState;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(nextState: Partial<AuthState>) {
  state = { ...state, ...nextState };
  emit();
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiError) return error.details;
  if (error instanceof Error) return error.message;
  return "Unable to load the current user.";
}

async function loadCurrentUser() {
  setState({ loadingMe: true, error: null });

  try {
    const currentUser = await meApi.getCurrentUser();
    setState({ currentUser, loadingMe: false, bootstrapped: true });
    // Fetch school config in parallel — non-blocking, uses safe defaults on failure
    void fetchAndStoreSchoolConfig();
    return currentUser;
  } catch (error) {
    const details = getErrorMessage(error);
    setState({
      currentUser: null,
      loadingMe: false,
      bootstrapped: true,
      error: details,
    });

    if (error instanceof ApiError && error.code === "UNAUTHORIZED") {
      setState({ token: null });
    }

    return null;
  }
}

export function useAuthStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => initialState,
  );
}

export async function bootstrapAuthSession() {
  const [accessToken, refreshToken] = await Promise.all([
    storage.getAccessToken(),
    storage.getRefreshToken(),
  ]);

  if (!accessToken && !refreshToken) {
    setState({
      token: null,
      currentUser: null,
      loadingMe: false,
      bootstrapped: true,
      error: null,
    });
    return null;
  }

  setState({ token: accessToken, loadingMe: true, error: null });
  return await loadCurrentUser();
}

export async function signInWithTokens(
  accessToken: string,
  refreshToken: string,
) {
  await storage.setTokens(accessToken, refreshToken);
  setState({ token: accessToken, error: null });
  return await loadCurrentUser();
}

export async function refreshCurrentUser() {
  return await loadCurrentUser();
}

export async function signOut() {
  await storage.clearTokens();
  clearSelectedTeacherSection();
  clearSchoolConfiguration();
  state = {
    token: null,
    currentUser: null,
    loadingMe: false,
    bootstrapped: true,
    error: null,
  };
  emit();
}
