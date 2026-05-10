import { useSyncExternalStore } from "react";
import { ApiError } from "../services/api";
import { teacherApi } from "../services/teacher";
import type { TeacherSection } from "../types/teacher";

type AttendanceDraftStatus = "PRESENT" | "ABSENT" | null;
type AttendanceDrafts = Record<string, Record<string, AttendanceDraftStatus>>;

interface TeacherState {
  selectedSection: TeacherSection | null;
  sections: TeacherSection[];
  sectionsLoading: boolean;
  sectionsError: string | null;
  attendanceDrafts: AttendanceDrafts;
}

const initialState: TeacherState = {
  selectedSection: null,
  sections: [],
  sectionsLoading: false,
  sectionsError: null,
  attendanceDrafts: {},
};

let state = initialState;
const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

export function useTeacherStore() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => initialState,
  );
}

export function setSelectedTeacherSection(section: TeacherSection) {
  state = { ...state, selectedSection: section };
  emit();
}

export function setSelectedTeacherSectionById(sectionId: string) {
  const section = state.sections.find((item) => item.id === sectionId);
  if (!section) return;
  state = { ...state, selectedSection: section };
  emit();
}

export function setTeacherSections(sections: TeacherSection[]) {
  const existingSelectedId = state.selectedSection?.id;
  const nextSelected =
    sections.find((item) => item.id === existingSelectedId) ?? sections[0] ?? null;

  state = {
    ...state,
    sections,
    selectedSection: nextSelected,
    sectionsError: null,
  };
  emit();
}

function getTeacherSectionsError(error: unknown) {
  if (error instanceof ApiError) return error.details;
  if (error instanceof Error) return error.message;
  return "Failed to load teacher sections.";
}

export async function loadTeacherSections() {
  state = { ...state, sectionsLoading: true, sectionsError: null };
  emit();

  try {
    const response = await teacherApi.getSections();
    setTeacherSections(response.results ?? []);
  } catch (error) {
    state = {
      ...state,
      sectionsLoading: false,
      sectionsError: getTeacherSectionsError(error),
    };
    emit();
    return;
  }

  state = { ...state, sectionsLoading: false, sectionsError: null };
  emit();
}

export function clearSelectedTeacherSection() {
  state = {
    ...state,
    selectedSection: null,
    sections: [],
    sectionsLoading: false,
    sectionsError: null,
    attendanceDrafts: {},
  };
  emit();
}

export function setAttendanceDraft(
  key: string,
  value: Record<string, AttendanceDraftStatus>,
) {
  state = {
    ...state,
    attendanceDrafts: {
      ...state.attendanceDrafts,
      [key]: value,
    },
  };
  emit();
}

export function clearAttendanceDraft(key: string) {
  if (!state.attendanceDrafts[key]) return;
  const nextDrafts = { ...state.attendanceDrafts };
  delete nextDrafts[key];
  state = {
    ...state,
    attendanceDrafts: nextDrafts,
  };
  emit();
}
