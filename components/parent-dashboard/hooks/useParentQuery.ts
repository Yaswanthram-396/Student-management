import { useCallback, useState } from "react";
import { createQuery } from "../../../src/lib/parentQueryApi";
import type { ParentProfile } from "../../../types/parent";

export interface UseParentQueryState {
  showQuerySheet: boolean;
  queryStudent: string;
  querySubject: string;
  queryMessage: string;
  queryLoading: boolean;
  queryError: string | null;
  subjectError: boolean;
  messageError: boolean;
  showSuccessToast: boolean;
}

export interface UseParentQueryActions {
  setShowQuerySheet: (val: boolean) => void;
  setQueryStudent: (val: string) => void;
  setQuerySubject: (val: string) => void;
  setQueryMessage: (val: string) => void;
  setShowSuccessToast: (val: boolean) => void;
  openQuerySheet: () => void;
  handleSendQuery: () => Promise<void>;
}

export function useParentQuery(
  profile: ParentProfile,
): [UseParentQueryState, UseParentQueryActions] {
  const [showQuerySheet, setShowQuerySheet] = useState(false);
  const [queryStudent, setQueryStudent] = useState(
    profile.students[0]?.id ?? "",
  );
  const [querySubject, setQuerySubject] = useState("");
  const [queryMessage, setQueryMessage] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const resolveQueryError = (err: unknown): string => {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("UNLINKED_STUDENT"))
      return "This student is not linked to your account.";
    if (msg.includes("queries") && msg.includes("disabled"))
      return "Queries are currently disabled by the school.";
    if (msg.includes("class teacher"))
      return "No class teacher assigned to this section yet.";
    return "Something went wrong. Please try again.";
  };

  const openQuerySheet = useCallback(() => {
    setQueryStudent(profile.students[0]?.id ?? "");
    setQuerySubject("");
    setQueryMessage("");
    setQueryError(null);
    setSubjectError(false);
    setMessageError(false);
    setShowQuerySheet(true);
  }, [profile]);

  const handleSendQuery = useCallback(async () => {
    const subEmpty = !querySubject.trim();
    const msgEmpty = !queryMessage.trim();
    setSubjectError(subEmpty);
    setMessageError(msgEmpty);
    if (subEmpty || msgEmpty) return;

    setQueryLoading(true);
    setQueryError(null);
    try {
      await createQuery({
        student_id: queryStudent,
        subject: querySubject.trim(),
        message: queryMessage.trim(),
      });
      setShowQuerySheet(false);
      setQuerySubject("");
      setQueryMessage("");
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 3000);
    } catch (err) {
      setQueryError(resolveQueryError(err));
    } finally {
      setQueryLoading(false);
    }
  }, [queryStudent, querySubject, queryMessage]);

  return [
    {
      showQuerySheet,
      queryStudent,
      querySubject,
      queryMessage,
      queryLoading,
      queryError,
      subjectError,
      messageError,
      showSuccessToast,
    },
    {
      setShowQuerySheet,
      setQueryStudent,
      setQuerySubject,
      setQueryMessage,
      setShowSuccessToast,
      openQuerySheet,
      handleSendQuery,
    },
  ];
}
