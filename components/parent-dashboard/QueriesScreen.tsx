import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { parentApi } from "../../services/parent";
import { formatQueryDate } from "../../src/lib/formatDate";
import {
  getQueries,
  getQueryById,
  Query,
  QueryDetail,
  QueryListResponse,
  QueryReply,
  QueryStatus,
  replyToQuery,
} from "../../src/lib/parentQueryApi";
import type { ParentProfile } from "../../types/parent";
import { BottomSheet, StatusPill } from "../shared";
import { QuerySheet } from "./QuerySheet";
import { useParentQuery } from "./hooks/useParentQuery";

// ─── Types ────────────────────────────────────────────────────────────────────

type TaggedQuery = Query & { studentId: string; studentName: string };
type StatusFilter = "ALL" | QueryStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "ANSWERED", label: "Answered" },
  { key: "CLOSED", label: "Closed" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function queryStatusVariant(s: QueryStatus): "warning" | "info" | "danger" {
  if (s === "OPEN") return "warning";
  if (s === "ANSWERED") return "info";
  return "danger";
}

function queryStatusLabel(s: QueryStatus): string {
  if (s === "OPEN") return "Open";
  if (s === "ANSWERED") return "Answered";
  return "Closed";
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Student dropdown ─────────────────────────────────────────────────────────

function StudentDropdown({
  students,
  selectedId,
  onChange,
}: {
  students: { id: string; name: string }[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options = [{ id: "ALL", name: "All Students" }, ...students];
  const selected = options.find((s) => s.id === selectedId);
  const displayName = selected ? selected.name.split(" ")[0] : "All";

  return (
    <>
      <Pressable style={styles.dropdownBtn} onPress={() => setOpen(true)}>
        <Ionicons name="person-outline" size={13} color={colors.parent} />
        <Text style={styles.dropdownBtnText} numberOfLines={1}>
          {displayName}
        </Text>
        <Ionicons name="chevron-down" size={13} color={colors.parent} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdownMenu}>
            {options.map((s) => (
              <Pressable
                key={s.id}
                style={[
                  styles.dropdownItem,
                  selectedId === s.id && styles.dropdownItemActive,
                ]}
                onPress={() => {
                  onChange(s.id);
                  setOpen(false);
                }}
              >
                <Text
                  style={[
                    styles.dropdownItemText,
                    selectedId === s.id && styles.dropdownItemTextActive,
                  ]}
                >
                  {s.name}
                </Text>
                {selectedId === s.id && (
                  <Ionicons name="checkmark" size={14} color={colors.parent} />
                )}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────

function SkeletonCard({ opacity }: { opacity: number }) {
  return (
    <View style={[styles.queryCard, { opacity }]}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonPill} />
      </View>
      <View
        style={[styles.skeletonLine, { marginTop: spacing.sm, width: "60%" }]}
      />
      <View
        style={[styles.skeletonLine, { marginTop: spacing.xs, width: "40%" }]}
      />
    </View>
  );
}

// ─── Query card ───────────────────────────────────────────────────────────────

function QueryCard({
  item,
  onPress,
  showStudent,
}: {
  item: TaggedQuery;
  onPress: () => void;
  showStudent: boolean;
}) {
  return (
    <Pressable style={styles.queryCard} onPress={onPress}>
      <View style={styles.queryCardTop}>
        <Text style={styles.querySubject} numberOfLines={1}>
          {item.subject}
        </Text>
        <StatusPill
          variant={queryStatusVariant(item.status)}
          label={queryStatusLabel(item.status)}
        />
      </View>

      <View style={styles.queryTeacherRow}>
        <View style={styles.teacherAvatar}>
          <Text style={styles.teacherAvatarText}>
            {getInitials(item.assigned_teacher.name)}
          </Text>
        </View>
        <View style={{ flex: 1, marginLeft: spacing.sm }}>
          <Text style={styles.queryTeacherText}>
            Sent to: {item.assigned_teacher.name}
          </Text>
          {showStudent && (
            <Text style={styles.queryStudentText}>{item.studentName}</Text>
          )}
        </View>
      </View>

      <View style={styles.queryCardBottom}>
        <View style={styles.queryDateRow}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.queryDate}>
            {formatQueryDate(item.created_at)}
          </Text>
        </View>
        {(item.status === "ANSWERED" || item.status === "CLOSED") && (
          <View style={styles.viewRepliesRow}>
            <Text style={styles.viewRepliesText}>View Replies</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.parent} />
          </View>
        )}
      </View>
    </Pressable>
  );
}

// ─── Reply bubble ─────────────────────────────────────────────────────────────

function ReplyBubble({
  reply,
  teacherName,
}: {
  reply: QueryReply;
  teacherName: string;
}) {
  const isTeacher = reply.sender_role === "TEACHER";
  return (
    <View
      style={[
        styles.replyBubbleWrap,
        isTeacher ? styles.replyLeft : styles.replyRight,
      ]}
    >
      {isTeacher && (
        <View style={styles.teacherAvatar}>
          <Text style={styles.teacherAvatarText}>
            {getInitials(teacherName)}
          </Text>
        </View>
      )}
      <View style={{ maxWidth: "75%" }}>
        <Text
          style={[
            styles.replyMeta,
            isTeacher ? { textAlign: "left" } : { textAlign: "right" },
          ]}
        >
          {isTeacher ? teacherName : "You"}
        </Text>
        <View
          style={[
            styles.bubble,
            isTeacher ? styles.bubbleTeacher : styles.bubbleParent,
          ]}
        >
          <Text
            style={[
              styles.bubbleText,
              isTeacher
                ? { color: colors.textPrimary }
                : { color: colors.surface },
            ]}
          >
            {reply.message}
          </Text>
        </View>
        <Text
          style={[
            styles.replyTime,
            isTeacher ? { textAlign: "left" } : { textAlign: "right" },
          ]}
        >
          {formatQueryDate(reply.created_at)}
        </Text>
      </View>
    </View>
  );
}

// ─── Query detail sheet ───────────────────────────────────────────────────────

function QueryDetailSheet({
  visible,
  queryId,
  onClose,
}: {
  visible: boolean;
  queryId: string | null;
  onClose: () => void;
}) {
  const [detail, setDetail] = useState<QueryDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [replyError, setReplyError] = useState<string | null>(null);
  const [replySent, setReplySent] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible || !queryId) return;
    setDetail(null);
    setReplyText("");
    setReplyError(null);
    setReplySent(false);
    setLoading(true);
    getQueryById(queryId)
      .then(setDetail)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [visible, queryId]);

  async function handleSendReply() {
    if (!detail || !replyText.trim()) return;
    setReplySending(true);
    setReplyError(null);
    try {
      const newReply = await replyToQuery(detail.id, replyText.trim());
      setDetail((prev) =>
        prev ? { ...prev, replies: [...prev.replies, newReply] } : prev,
      );
      setReplyText("");
      setReplySent(true);
      setTimeout(() => {
        setReplySent(false);
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 2000);
    } catch {
      setReplyError("Failed to send. Try again.");
    } finally {
      setReplySending(false);
    }
  }

  return (
    <BottomSheet visible={visible} onClose={onClose} height="90%">
      <View style={styles.detailSheetInner}>
        <Pressable style={styles.detailClose} onPress={onClose}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>

        {loading && (
          <View style={styles.detailCenter}>
            <ActivityIndicator color={colors.parent} />
          </View>
        )}

        {!loading && detail && (
          <>
            <View style={styles.detailHeader}>
              <Text style={styles.detailSubject} numberOfLines={2}>
                {detail.subject}
              </Text>
              <StatusPill
                variant={queryStatusVariant(detail.status)}
                label={queryStatusLabel(detail.status)}
              />
            </View>

            <View style={styles.detailMeta}>
              <View style={styles.teacherAvatar}>
                <Text style={styles.teacherAvatarText}>
                  {getInitials(detail.assigned_teacher.name)}
                </Text>
              </View>
              <View style={{ marginLeft: spacing.sm }}>
                <Text style={styles.detailMetaText}>
                  {detail.assigned_teacher.name}
                </Text>
                <Text style={styles.detailMetaTime}>
                  {formatQueryDate(detail.created_at)}
                </Text>
              </View>
            </View>

            <View style={styles.divider} />

            <ScrollView
              ref={scrollRef}
              style={{ flex: 1 }}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.sectionChip}>YOUR QUERY</Text>
              <View style={styles.originalMsgCard}>
                <Text style={styles.originalMsgText}>{detail.message}</Text>
              </View>

              <Text style={[styles.sectionChip, { marginTop: spacing.lg }]}>
                REPLIES
              </Text>
              {detail.replies.length === 0 ? (
                <Text style={styles.noRepliesText}>No replies yet</Text>
              ) : (
                detail.replies.map((reply) => (
                  <ReplyBubble
                    key={reply.id}
                    reply={reply}
                    teacherName={detail.assigned_teacher.name}
                  />
                ))
              )}
              <View style={{ height: spacing.xl }} />
            </ScrollView>

            {detail.status === "CLOSED" ? (
              <View style={styles.closedBanner}>
                <Text style={styles.closedBannerText}>
                  This query is closed. No further replies allowed.
                </Text>
              </View>
            ) : (
              <View style={styles.replyInputRow}>
                {replySent && (
                  <View style={styles.replySentBanner}>
                    <Ionicons
                      name="checkmark-circle"
                      size={14}
                      color={colors.parent}
                    />
                    <Text style={styles.replySentText}>Reply sent!</Text>
                  </View>
                )}
                {replyError && (
                  <Text style={styles.replyErrorText}>{replyError}</Text>
                )}
                <View style={styles.replyRow}>
                  <TextInput
                    style={styles.replyInput}
                    placeholder="Write a reply..."
                    placeholderTextColor={colors.textMuted}
                    value={replyText}
                    onChangeText={setReplyText}
                    multiline
                  />
                  <Pressable
                    style={[
                      styles.sendBtn,
                      (!replyText.trim() || replySending) &&
                        styles.sendBtnDisabled,
                    ]}
                    onPress={handleSendReply}
                    disabled={!replyText.trim() || replySending}
                  >
                    {replySending ? (
                      <ActivityIndicator color={colors.surface} size={16} />
                    ) : (
                      <Ionicons
                        name="arrow-up"
                        size={18}
                        color={colors.surface}
                      />
                    )}
                  </Pressable>
                </View>
              </View>
            )}
          </>
        )}
      </View>
    </BottomSheet>
  );
}

// ─── Date range helpers ───────────────────────────────────────────────────────

function toIsoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getPresetRange(preset: string): { from: string; to: string } | null {
  if (preset === "none") return null;
  const today = new Date();
  const to = toIsoDate(today);
  if (preset === "week") {
    const from = new Date(today);
    from.setDate(from.getDate() - 6);
    return { from: toIsoDate(from), to };
  }
  if (preset === "month") {
    const from = new Date(today.getFullYear(), today.getMonth(), 1);
    return { from: toIsoDate(from), to };
  }
  return { from: to, to };
}

type DatePreset = "none" | "today" | "week" | "month";
const DATE_PRESETS: { key: DatePreset; label: string }[] = [
  { key: "none", label: "All Time" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
];

// ─── Main screen ──────────────────────────────────────────────────────────────

export function QueriesScreen() {
  const [profile, setProfile] = useState<ParentProfile | null>(null);
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("ALL");
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("ALL");
  const [datePreset, setDatePreset] = useState<DatePreset>("none");
  const [queries, setQueries] = useState<TaggedQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [queriesError, setQueriesError] = useState<string | null>(null);

  const [skeletonOpacity, setSkeletonOpacity] = useState(1);
  const skeletonRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const fabScale = useRef(new Animated.Value(0)).current;

  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Load profile once
  useEffect(() => {
    parentApi
      .getProfile()
      .then((p) => {
        setProfile(p);
        setStudents(p.students.map((s) => ({ id: s.id, name: s.name })));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // FAB entry animation
  useEffect(() => {
    const t = setTimeout(() => {
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }, 300);
    return () => clearTimeout(t);
  }, [fabScale]);

  const memoProfile = React.useMemo(() => profile, [profile]);
  const [queryState, queryActions] = useParentQuery(
    memoProfile ?? {
      id: "",
      name: "",
      mobile_number: "",
      profile_pic_url: "",
      school: { id: "", name: "" },
      students: [],
    },
  );

  function startSkeleton() {
    let rising = false;
    skeletonRef.current = setInterval(() => {
      setSkeletonOpacity((prev) => {
        if (prev <= 0.3) rising = true;
        if (prev >= 1) rising = false;
        return rising ? prev + 0.05 : prev - 0.05;
      });
    }, 60);
  }

  function stopSkeleton() {
    if (skeletonRef.current) {
      clearInterval(skeletonRef.current);
      skeletonRef.current = null;
    }
  }

  const loadQueries = useCallback(
    async (
      status: StatusFilter,
      studentId: string,
      studentList: { id: string; name: string }[],
      preset: DatePreset,
    ) => {
      if (studentList.length === 0) return;
      setQueriesLoading(true);
      setQueriesError(null);
      startSkeleton();
      try {
        const statusParam = status === "ALL" ? undefined : status;
        const range = getPresetRange(preset);
        const filters = range
          ? { date_from: range.from, date_to: range.to }
          : undefined;

        if (studentId === "ALL") {
          const results = await Promise.all(
            studentList.map((s) =>
              getQueries(s.id, statusParam, filters)
                .then((res: QueryListResponse) =>
                  res.results.map((q) => ({
                    ...q,
                    studentId: s.id,
                    studentName: s.name,
                  })),
                )
                .catch(() => [] as TaggedQuery[]),
            ),
          );
          setQueries(results.flat());
        } else {
          const student = studentList.find((s) => s.id === studentId);
          if (!student) return;
          const res: QueryListResponse = await getQueries(
            studentId,
            statusParam,
            filters,
          );
          setQueries(
            res.results.map((q) => ({
              ...q,
              studentId: student.id,
              studentName: student.name,
            })),
          );
        }
      } catch {
        setQueriesError("Could not load queries");
      } finally {
        setQueriesLoading(false);
        stopSkeleton();
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      if (students.length > 0)
        loadQueries(activeStatus, selectedStudentId, students, datePreset);
      return () => stopSkeleton();
    }, [students, activeStatus, selectedStudentId, datePreset, loadQueries]),
  );

  // Reload after successful query submission
  useEffect(() => {
    if (!queryState.showSuccessToast) return;
    loadQueries(activeStatus, selectedStudentId, students, datePreset);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryState.showSuccessToast]);

  const showStudentName = selectedStudentId === "ALL" && students.length > 1;

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Queries</Text>
        </View>
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.parent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Queries</Text>
        {students.length > 0 && (
          <StudentDropdown
            students={students}
            selectedId={selectedStudentId}
            onChange={(id) => {
              setSelectedStudentId(id);
              loadQueries(activeStatus, id, students, datePreset);
            }}
          />
        )}
      </View>

      {/* Status + date filter pills */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContent}
        >
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.filterPill,
                activeStatus === f.key && styles.filterPillActive,
              ]}
              onPress={() => setActiveStatus(f.key)}
            >
              <Text
                style={[
                  styles.filterLabel,
                  activeStatus === f.key && styles.filterLabelActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.filterContent,
            { paddingTop: 0, paddingBottom: spacing.md },
          ]}
        >
          {DATE_PRESETS.map((p) => (
            <Pressable
              key={p.key}
              style={[
                styles.filterPill,
                datePreset === p.key && styles.filterPillActive,
              ]}
              onPress={() => setDatePreset(p.key)}
            >
              <Text
                style={[
                  styles.filterLabel,
                  datePreset === p.key && styles.filterLabelActive,
                ]}
              >
                {p.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Loading skeletons */}
      {queriesLoading && (
        <View style={styles.listContent}>
          <SkeletonCard opacity={skeletonOpacity} />
          <View style={{ height: spacing.sm + spacing.xs }} />
          <SkeletonCard opacity={skeletonOpacity} />
          <View style={{ height: spacing.sm + spacing.xs }} />
          <SkeletonCard opacity={skeletonOpacity} />
        </View>
      )}

      {/* Error */}
      {!queriesLoading && queriesError && (
        <View style={styles.centerWrap}>
          <Text style={styles.errorText}>{queriesError}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() =>
              loadQueries(activeStatus, selectedStudentId, students, datePreset)
            }
          >
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {/* Query list */}
      {!queriesLoading && !queriesError && (
        <FlatList
          data={queries}
          keyExtractor={(item) => `${item.id}-${item.studentId}`}
          renderItem={({ item }) => (
            <QueryCard
              item={item}
              showStudent={showStudentName}
              onPress={() => {
                setSelectedQueryId(item.id);
                setShowDetail(true);
              }}
            />
          )}
          contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
          ItemSeparatorComponent={() => (
            <View style={{ height: spacing.sm + spacing.xs }} />
          )}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.centerWrap}>
              <View style={styles.emptyCircle} />
              <Text style={styles.emptyTitle}>No queries yet</Text>
              <Text style={styles.emptyBody}>
                Tap the button below to raise your first query
              </Text>
            </View>
          }
        />
      )}

      {/* FAB */}
      <Animated.View style={[styles.fab, { transform: [{ scale: fabScale }] }]}>
        <Pressable
          style={styles.fabBtn}
          onPress={() => profile && queryActions.openQuerySheet()}
        >
          <Ionicons
            name="chatbubble-ellipses"
            size={20}
            color={colors.surface}
          />
          <Text style={styles.fabLabel}>Raise a Query</Text>
        </Pressable>
      </Animated.View>

      {/* Success toast */}
      {queryState.showSuccessToast && (
        <View style={styles.successToast} pointerEvents="none">
          <Text style={styles.successToastText}>Query sent successfully!</Text>
        </View>
      )}

      <QueryDetailSheet
        visible={showDetail}
        queryId={selectedQueryId}
        onClose={() => {
          setShowDetail(false);
          setSelectedQueryId(null);
        }}
      />

      {profile && (
        <QuerySheet
          visible={queryState.showQuerySheet}
          onClose={() => queryActions.setShowQuerySheet(false)}
          profile={profile}
          state={queryState}
          actions={queryActions}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },

  header: {
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
  },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },

  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.parent,
    paddingVertical: 9,
    paddingHorizontal: spacing.md,
    minWidth: 132,
    shadowColor: colors.parent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 2,
  },
  dropdownBtnText: {
    ...(typography.caption as object),
    fontWeight: "600",
    color: colors.parent,
    maxWidth: 90,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingTop: 86,
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    minWidth: 220,
    borderWidth: 0.5,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 8,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  dropdownItemActive: { backgroundColor: colors.primaryLight },
  dropdownItemText: {
    ...(typography.body as object),
    color: colors.textSecondary,
  },
  dropdownItemTextActive: { color: colors.parent, fontWeight: "600" },

  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  filterPillActive: { backgroundColor: colors.parent },
  filterLabel: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: "#6B7280",
  },
  filterLabelActive: { color: colors.surface },

  listContent: { padding: spacing.lg },
  centerWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingTop: spacing.xxxl,
  },
  errorText: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: "center",
    marginBottom: spacing.md,
  },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.parent,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryBtnText: { fontSize: 13, color: colors.parent, fontWeight: "500" },
  emptyCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#E5E7EB",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111111",
    marginBottom: spacing.xs,
  },
  emptyBody: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
    maxWidth: 240,
  },

  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  skeletonTitle: {
    height: 14,
    width: "55%",
    backgroundColor: "#E5E7EB",
    borderRadius: 6,
  },
  skeletonPill: {
    height: 14,
    width: "22%",
    backgroundColor: "#E5E7EB",
    borderRadius: 999,
  },
  skeletonLine: { height: 10, backgroundColor: "#E5E7EB", borderRadius: 6 },

  queryCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: "#EEEEEE",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
  },
  queryCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm - 2,
  },
  querySubject: {
    fontSize: 14,
    fontWeight: "500",
    color: "#111111",
    flex: 1,
    marginRight: spacing.sm,
  },
  queryTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    marginBottom: spacing.sm,
  },
  queryTeacherText: { fontSize: 12, color: colors.textMuted },
  queryStudentText: {
    fontSize: 11,
    color: colors.parent,
    fontWeight: "500",
    marginTop: 2,
  },
  queryCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    borderTopColor: "#EEEEEE",
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  queryDateRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  queryDate: { fontSize: 12, color: colors.textMuted },
  viewRepliesRow: { flexDirection: "row", alignItems: "center", gap: 2 },
  viewRepliesText: { fontSize: 12, color: colors.parent },

  teacherAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.principal,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherAvatarText: { fontSize: 10, fontWeight: "700", color: colors.surface },

  detailSheetInner: { flex: 1 },
  detailClose: {
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
    padding: spacing.xs,
  },
  detailCenter: { flex: 1, alignItems: "center", justifyContent: "center" },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingRight: spacing.xl,
    marginBottom: spacing.sm,
  },
  detailSubject: {
    ...(typography.h3 as object),
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  detailMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.md,
  },
  detailMetaText: {
    ...(typography.caption as object),
    color: colors.textSecondary,
  },
  detailMetaTime: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 0.5,
    backgroundColor: colors.border,
    marginBottom: spacing.md,
  },
  sectionChip: {
    ...(typography.label as object),
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  originalMsgCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  originalMsgText: { fontSize: 14, color: "#444444", lineHeight: 22 },
  noRepliesText: {
    ...(typography.caption as object),
    color: colors.textMuted,
    textAlign: "center",
    marginVertical: spacing.lg,
  },

  replyBubbleWrap: {
    flexDirection: "row",
    marginBottom: spacing.md,
    alignItems: "flex-end",
  },
  replyLeft: { justifyContent: "flex-start" },
  replyRight: { justifyContent: "flex-end" },
  replyMeta: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  bubble: {
    borderRadius: 14,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bubbleTeacher: { backgroundColor: "#F3F4F6" },
  bubbleParent: { backgroundColor: colors.parent },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  replyTime: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },

  replyInputRow: { paddingTop: spacing.sm },
  replyErrorText: {
    fontSize: 12,
    color: colors.danger,
    marginBottom: spacing.xs,
  },
  replyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  replyInput: {
    flex: 1,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: 14,
    ...(typography.body as object),
    color: colors.textPrimary,
    maxHeight: 96,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.parent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: { backgroundColor: colors.border },
  closedBanner: {
    backgroundColor: colors.background,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginTop: spacing.sm,
    alignItems: "center",
  },
  closedBannerText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },

  replySentBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.primaryLight,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.sm,
  },
  replySentText: {
    fontSize: 13,
    color: colors.parent,
    fontWeight: "500",
  },

  fab: {
    position: "absolute",
    bottom: 24,
    left: spacing.lg,
    right: spacing.lg,
  },
  fabBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    backgroundColor: colors.parent,
    borderRadius: 14,
    paddingVertical: 14,
    shadowColor: colors.parent,
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 6,
  },
  fabLabel: { fontSize: 15, fontWeight: "600", color: colors.surface },

  successToast: {
    position: "absolute",
    bottom: 88,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
  },
  successToastText: { fontSize: 14, color: colors.surface, fontWeight: "500" },
});
