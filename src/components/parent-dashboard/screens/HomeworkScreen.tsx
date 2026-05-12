import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import { colors } from "../../../constants/colors";
import { spacing } from "../../../constants/spacing";
import { typography } from "../../../constants/typography";
import { parentApi } from "../../../../services/parent";
import { formatQueryDate } from "../../../lib/formatDate";
import {
  getQueries,
  getQueryById,
  Query,
  QueryDetail,
  QueryListResponse,
  QueryReply,
  QueryStatus,
  replyToQuery,
} from "../../../lib/parentQueryApi";
import type { HomeworkItem } from "../../../../types/parent";
import {
  BottomSheet,
  HeaderBar,
  LoadingScreen,
  SegmentedControl,
  StatusPill,
} from "../../shared";

// ─── Homework types ──────────────────────────────────────────────────────────

type FilterKey = "All" | "Today" | "This Week" | "Overdue";
const FILTERS: FilterKey[] = ["All", "Today", "This Week", "Overdue"];

type TaggedHW = HomeworkItem & { studentId: string; studentName: string };

type HWItem = {
  id: string;
  subject: string;
  subjectBg: string;
  subjectText: string;
  desc: string;
  due: string;
  status: "Pending" | "Overdue";
  studentName: string;
};

const SUBJECT_COLORS: Record<string, { bg: string; text: string }> = {
  Mathematics: { bg: "#DBEAFE", text: colors.teacher },
  Math: { bg: "#DBEAFE", text: colors.teacher },
  Science: { bg: colors.successBg, text: colors.success },
  English: { bg: "#F3E8FF", text: "#7C3AED" },
  Hindi: { bg: "#FEF9C3", text: "#A16207" },
};
const DEFAULT_SUBJECT_COLOR = { bg: "#F3F4F6", text: colors.textSecondary };

function subjectStyle(name: string) {
  return SUBJECT_COLORS[name] ?? DEFAULT_SUBJECT_COLOR;
}

function mapHomework(hw: TaggedHW): HWItem {
  const deadline = new Date(hw.deadline);
  const isPast = deadline < new Date();
  const style = subjectStyle(hw.subject.name);
  return {
    id: hw.id,
    subject: hw.subject.name,
    subjectBg: style.bg,
    subjectText: style.text,
    desc: hw.description,
    due: deadline.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
    status: isPast ? "Overdue" : "Pending",
    studentName: hw.studentName,
  };
}

function applyFilter(items: TaggedHW[], filter: FilterKey): TaggedHW[] {
  if (filter === "All") return items;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86400000);
  const weekEnd = new Date(todayStart.getTime() + 7 * 86400000);
  return items.filter((hw) => {
    const d = new Date(hw.deadline);
    if (filter === "Today") return d >= todayStart && d < todayEnd;
    if (filter === "This Week") return d >= todayStart && d < weekEnd;
    if (filter === "Overdue") return d < todayStart;
    return true;
  });
}

// ─── Homework sub-components ─────────────────────────────────────────────────

function SubjectPill({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <View style={[styles.subjectPill, { backgroundColor: bg }]}>
      <Text style={[styles.subjectLabel, { color: text }]}>{label}</Text>
    </View>
  );
}

function HWCard({ item, showStudent }: { item: HWItem; showStudent: boolean }) {
  return (
    <View style={styles.hwCard}>
      <View style={styles.hwCardTop}>
        <SubjectPill label={item.subject} bg={item.subjectBg} text={item.subjectText} />
        <StatusPill
          variant={item.status === "Overdue" ? "danger" : "warning"}
          label={item.status}
        />
      </View>
      <Text style={styles.hwDesc}>{item.desc}</Text>
      <View style={styles.hwCardFooter}>
        <View style={styles.hwDueRow}>
          <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
          <Text style={styles.hwDue}>Due: {item.due}</Text>
        </View>
        {showStudent && (
          <View style={styles.hwStudentRow}>
            <Ionicons name="person-outline" size={11} color={colors.textMuted} />
            <Text style={styles.hwDue}>{item.studentName}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// ─── Student dropdown ─────────────────────────────────────────────────────────

function StudentDropdown({
  students,
  selectedId,
  onChange,
  showAllOption = true,
}: {
  students: { id: string; name: string }[];
  selectedId: string;
  onChange: (id: string) => void;
  showAllOption?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options = showAllOption
    ? [{ id: "ALL", name: "All Students" }, ...students]
    : students;
  const selectedName = options.find((s) => s.id === selectedId)?.name ?? "All Students";

  return (
    <View style={styles.dropdownWrap}>
      <Pressable style={styles.dropdownBtn} onPress={() => setOpen(true)}>
        <Ionicons name="person-outline" size={14} color={colors.textSecondary} />
        <Text style={styles.dropdownBtnText} numberOfLines={1}>
          {selectedName}
        </Text>
        <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
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
    </View>
  );
}

// ─── Queries helpers ─────────────────────────────────────────────────────────

type StatusFilter = "ALL" | QueryStatus;
const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "ALL", label: "All" },
  { key: "OPEN", label: "Open" },
  { key: "ANSWERED", label: "Answered" },
  { key: "CLOSED", label: "Closed" },
];

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

// ─── Skeleton card ───────────────────────────────────────────────────────────

function SkeletonCard({ opacity }: { opacity: number }) {
  return (
    <View style={[styles.queryCard, { opacity }]}>
      <View style={styles.skeletonRow}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonPill} />
      </View>
      <View style={[styles.skeletonLine, { marginTop: spacing.sm, width: "60%" }]} />
      <View style={[styles.skeletonLine, { marginTop: spacing.xs, width: "40%" }]} />
    </View>
  );
}

// ─── Query card ──────────────────────────────────────────────────────────────

function QueryCard({ item, onPress }: { item: Query; onPress: () => void }) {
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
        <Text style={styles.queryTeacherText}>
          Sent to: {item.assigned_teacher.name}
        </Text>
      </View>

      <View style={styles.queryCardBottom}>
        <View style={styles.queryDateRow}>
          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
          <Text style={styles.queryDate}>{formatQueryDate(item.created_at)}</Text>
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

// ─── Reply bubble ────────────────────────────────────────────────────────────

function ReplyBubble({ reply, teacherName }: { reply: QueryReply; teacherName: string }) {
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
          <Text style={styles.teacherAvatarText}>{getInitials(teacherName)}</Text>
        </View>
      )}
      <View style={{ maxWidth: "75%" }}>
        <Text style={[styles.replyMeta, isTeacher ? { textAlign: "left" } : { textAlign: "right" }]}>
          {isTeacher ? teacherName : "You"}
        </Text>
        <View style={[styles.bubble, isTeacher ? styles.bubbleTeacher : styles.bubbleParent]}>
          <Text style={[styles.bubbleText, isTeacher ? { color: colors.textPrimary } : { color: colors.surface }]}>
            {reply.message}
          </Text>
        </View>
        <Text style={[styles.replyTime, isTeacher ? { textAlign: "left" } : { textAlign: "right" }]}>
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
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!visible || !queryId) return;
    setDetail(null);
    setReplyText("");
    setReplyError(null);
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
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
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
                <Text style={styles.detailMetaText}>{detail.assigned_teacher.name}</Text>
                <Text style={styles.detailMetaTime}>{formatQueryDate(detail.created_at)}</Text>
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

              <Text style={[styles.sectionChip, { marginTop: spacing.lg }]}>REPLIES</Text>
              {detail.replies.length === 0 ? (
                <Text style={styles.noRepliesText}>No replies yet</Text>
              ) : (
                detail.replies.map((reply) => (
                  <ReplyBubble key={reply.id} reply={reply} teacherName={detail.assigned_teacher.name} />
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
                      (!replyText.trim() || replySending) && styles.sendBtnDisabled,
                    ]}
                    onPress={handleSendReply}
                    disabled={!replyText.trim() || replySending}
                  >
                    {replySending ? (
                      <ActivityIndicator color={colors.surface} size={16} />
                    ) : (
                      <Ionicons name="arrow-up" size={18} color={colors.surface} />
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

// ─── Queries segment ─────────────────────────────────────────────────────────

function QueriesSegment({ students }: { students: { id: string; name: string }[] }) {
  const [activeStatus, setActiveStatus] = useState<StatusFilter>("ALL");
  const [selectedStudentId, setSelectedStudentId] = useState<string>(students[0]?.id ?? "");
  const [queries, setQueries] = useState<Query[]>([]);
  const [queriesLoading, setQueriesLoading] = useState(false);
  const [queriesError, setQueriesError] = useState<string | null>(null);

  const [skeletonOpacity, setSkeletonOpacity] = useState(1);
  const skeletonIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  function startSkeleton() {
    let rising = false;
    skeletonIntervalRef.current = setInterval(() => {
      setSkeletonOpacity((prev) => {
        if (prev <= 0.3) rising = true;
        if (prev >= 1) rising = false;
        return rising ? prev + 0.05 : prev - 0.05;
      });
    }, 60);
  }

  function stopSkeleton() {
    if (skeletonIntervalRef.current) {
      clearInterval(skeletonIntervalRef.current);
      skeletonIntervalRef.current = null;
    }
  }

  async function loadQueries(status: StatusFilter, studentId: string) {
    if (!studentId) return;
    setQueriesLoading(true);
    setQueriesError(null);
    startSkeleton();
    try {
      const res: QueryListResponse = await getQueries(
        studentId,
        status === "ALL" ? undefined : status,
      );
      setQueries(res.results);
    } catch {
      setQueriesError("Could not load queries");
    } finally {
      setQueriesLoading(false);
      stopSkeleton();
    }
  }

  useEffect(() => {
    loadQueries(activeStatus, selectedStudentId);
    return () => stopSkeleton();
  }, [activeStatus, selectedStudentId]);

  return (
    <View style={{ flex: 1 }}>
      {students.length > 1 && (
        <StudentDropdown
          students={students}
          selectedId={selectedStudentId}
          onChange={setSelectedStudentId}
          showAllOption={false}
        />
      )}
      <View style={styles.statusFilterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.statusFilterContent}
        >
          {STATUS_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[
                styles.statusPill,
                activeStatus === f.key && styles.statusPillActive,
              ]}
              onPress={() => setActiveStatus(f.key)}
            >
              <Text
                style={[
                  styles.statusPillText,
                  activeStatus === f.key && styles.statusPillTextActive,
                ]}
              >
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {queriesLoading && (
        <View style={styles.queriesListContent}>
          <SkeletonCard opacity={skeletonOpacity} />
          <SkeletonCard opacity={skeletonOpacity} />
          <SkeletonCard opacity={skeletonOpacity} />
        </View>
      )}

      {!queriesLoading && queriesError && (
        <View style={styles.queriesCenter}>
          <Text style={styles.queriesErrorText}>{queriesError}</Text>
          <Pressable style={styles.retryBtn} onPress={() => loadQueries(activeStatus, selectedStudentId)}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!queriesLoading && !queriesError && (
        <FlatList
          data={queries}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <QueryCard
              item={item}
              onPress={() => {
                setSelectedQueryId(item.id);
                setShowDetail(true);
              }}
            />
          )}
          contentContainerStyle={styles.queriesListContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm + spacing.xs }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.queriesCenter}>
              <View style={styles.emptyCircle} />
              <Text style={styles.emptyTitle}>No queries yet</Text>
              <Text style={styles.emptyBody}>
                Tap 'Raise a Query' on the home screen to get started
              </Text>
            </View>
          }
        />
      )}

      <QueryDetailSheet
        visible={showDetail}
        queryId={selectedQueryId}
        onClose={() => {
          setShowDetail(false);
          setSelectedQueryId(null);
        }}
      />
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export function HomeworkScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("ALL");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [homework, setHomework] = useState<TaggedHW[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [activeSegment, setActiveSegment] = useState<0 | 1>(0);

  useEffect(() => {
    parentApi
      .getProfile()
      .then(async (profile) => {
        if (profile.students.length === 0) return;
        setStudents(profile.students.map((s) => ({ id: s.id, name: s.name })));
        const results = await Promise.all(
          profile.students.map((s) =>
            parentApi
              .getHomework(s.id)
              .then((data) =>
                data.results.map((hw) => ({
                  ...hw,
                  studentId: s.id,
                  studentName: s.name,
                })),
              )
              .catch(() => [] as TaggedHW[]),
          ),
        );
        setHomework(results.flat());
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const studentFiltered =
    selectedStudentId === "ALL"
      ? homework
      : homework.filter((hw) => hw.studentId === selectedStudentId);

  const filtered = applyFilter(studentFiltered, activeFilter).map(mapHomework);
  const showStudentName = selectedStudentId === "ALL" && students.length > 1;

  if (loadingProfile) {
    return <LoadingScreen label="Loading homework profile..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar center={<Text style={styles.headerTitle}>Homework</Text>} />

      <View style={styles.segmentedWrap}>
        <SegmentedControl
          options={["Homework", "Queries"]}
          activeIndex={activeSegment}
          onChange={(i) => setActiveSegment(i as 0 | 1)}
          accentColor={colors.parent}
        />
      </View>

      {activeSegment === 0 ? (
        <>
          {students.length > 0 && (
            <StudentDropdown
              students={students}
              selectedId={selectedStudentId}
              onChange={setSelectedStudentId}
              showAllOption={students.length > 1}
            />
          )}

          <View style={styles.filterBar}>
            <FlatList
              data={FILTERS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={[
                    styles.filterPill,
                    activeFilter === item && styles.filterPillActive,
                  ]}
                  onPress={() => setActiveFilter(item)}
                >
                  <Text
                    style={[
                      styles.filterLabel,
                      activeFilter === item && styles.filterLabelActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              )}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterList}
              ItemSeparatorComponent={() => <View style={{ width: spacing.sm }} />}
            />
          </View>

          <FlatList
            data={filtered}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <HWCard item={item} showStudent={showStudentName} />}
            contentContainerStyle={styles.listContent}
            ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyWrap}>
                <Text style={styles.emptyText}>No homework found</Text>
              </View>
            }
          />
        </>
      ) : (
        <QueriesSegment students={students} />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },

  segmentedWrap: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },

  dropdownWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + 2,
  },
  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    alignSelf: "flex-start",
    minWidth: 160,
  },
  dropdownBtnText: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: colors.textSecondary,
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: spacing.xs,
    minWidth: 220,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
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
  dropdownItemActive: {
    backgroundColor: "#F0F4FF",
  },
  dropdownItemText: {
    ...(typography.body as object),
    color: colors.textSecondary,
  },
  dropdownItemTextActive: {
    color: colors.parent,
    fontWeight: "600",
  },
  studentFilterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  filterList: { paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: colors.background,
  },
  filterPillActive: { backgroundColor: colors.parent },
  filterLabel: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: colors.textSecondary,
  },
  filterLabelActive: { color: colors.surface },
  listContent: { padding: spacing.lg },
  hwCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
  },
  hwCardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  subjectPill: {
    borderRadius: 999,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  subjectLabel: { ...(typography.label as object) },
  hwDesc: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  hwCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  hwDueRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  hwStudentRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  hwDue: { ...(typography.caption as object), color: colors.textMuted },
  emptyWrap: { paddingTop: spacing.xxl, alignItems: "center" },
  emptyText: { ...(typography.body as object), color: colors.textMuted },

  statusFilterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  statusFilterContent: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  statusPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  statusPillActive: { backgroundColor: colors.parent },
  statusPillText: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: "#6B7280",
  },
  statusPillTextActive: { color: colors.surface },

  queriesListContent: { padding: spacing.lg },
  queriesCenter: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: spacing.xxxl },
  queriesErrorText: { fontSize: 14, color: colors.textMuted, textAlign: "center", marginBottom: spacing.md },
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
  emptyTitle: { fontSize: 15, fontWeight: "500", color: "#111111", marginBottom: spacing.xs },
  emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: "center", maxWidth: 240 },

  skeletonRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  skeletonTitle: { height: 14, width: "55%", backgroundColor: "#E5E7EB", borderRadius: 6 },
  skeletonPill: { height: 14, width: "22%", backgroundColor: "#E5E7EB", borderRadius: 999 },
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
  queryTeacherText: { fontSize: 12, color: colors.textMuted, marginLeft: spacing.sm },
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
  detailClose: { position: "absolute", top: 0, right: 0, zIndex: 10, padding: spacing.xs },
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
  detailMeta: { flexDirection: "row", alignItems: "center", marginBottom: spacing.md },
  detailMetaText: { ...(typography.caption as object), color: colors.textSecondary },
  detailMetaTime: { ...(typography.caption as object), color: colors.textMuted, marginTop: 2 },
  divider: { height: 0.5, backgroundColor: colors.border, marginBottom: spacing.md },
  sectionChip: { ...(typography.label as object), color: colors.textMuted, marginBottom: spacing.sm },
  originalMsgCard: {
    backgroundColor: "#F9F9F9",
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  originalMsgText: { fontSize: 14, color: "#444444", lineHeight: 22 },
  noRepliesText: { ...(typography.caption as object), color: colors.textMuted, textAlign: "center", marginVertical: spacing.lg },

  replyBubbleWrap: { flexDirection: "row", marginBottom: spacing.md, alignItems: "flex-end" },
  replyLeft: { justifyContent: "flex-start" },
  replyRight: { justifyContent: "flex-end" },
  replyMeta: { fontSize: 11, color: colors.textMuted, marginBottom: spacing.xs },
  bubble: { borderRadius: 14, paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
  bubbleTeacher: { backgroundColor: "#F3F4F6" },
  bubbleParent: { backgroundColor: colors.parent },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  replyTime: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },

  replyInputRow: { paddingTop: spacing.sm },
  replyErrorText: { fontSize: 12, color: colors.danger, marginBottom: spacing.xs },
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
  closedBannerText: { fontSize: 13, color: colors.textMuted, textAlign: "center" },
});
