import { useSyncExternalStore } from "react";
import type { TeacherSection } from "../services/teacher-sections";

interface TeacherState {
  selectedSection: TeacherSection | null;
  sections: TeacherSection[];
}

let state: TeacherState = { selectedSection: null, sections: [] };
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

export function setSelectedSection(section: TeacherSection) {
  state = { ...state, selectedSection: section };
  emit();
}

export function setSections(sections: TeacherSection[]) {
  state = { ...state, sections };
  emit();
}

export function useTeacherStore() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => ({ selectedSection: null, sections: [] }),
  );
}
