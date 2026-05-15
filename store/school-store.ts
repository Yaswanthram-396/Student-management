import { useSyncExternalStore } from 'react';
import { schoolApi, type SchoolConfiguration } from '../services/school';

// Safe defaults used until the API responds (or if it fails)
export const DEFAULT_SCHOOL_CONFIG: SchoolConfiguration = {
  attendance_frequency: 'TWICE',
  whatsapp_absent_automation_enabled: false,
  parent_query_enabled: true,
};

interface SchoolState {
  configuration: SchoolConfiguration | null;
  loaded: boolean;
}

let state: SchoolState = { configuration: null, loaded: false };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setSchoolConfiguration(config: SchoolConfiguration) {
  state = { configuration: config, loaded: true };
  emit();
}

export function clearSchoolConfiguration() {
  state = { configuration: null, loaded: false };
  emit();
}

/** Returns live config, falling back to safe defaults if not loaded yet. */
export function getSchoolConfig(): SchoolConfiguration {
  return state.configuration ?? DEFAULT_SCHOOL_CONFIG;
}

export function useSchoolStore() {
  return useSyncExternalStore(
    (l) => { listeners.add(l); return () => listeners.delete(l); },
    () => state,
    () => ({ configuration: null, loaded: false }),
  );
}

/** Fetches school config from the API and caches it in the store. */
export async function fetchAndStoreSchoolConfig(): Promise<void> {
  try {
    const data = await schoolApi.getSchool();
    setSchoolConfiguration(data.configuration);
  } catch {
    // Keep defaults — non-fatal
    setSchoolConfiguration(DEFAULT_SCHOOL_CONFIG);
  }
}
