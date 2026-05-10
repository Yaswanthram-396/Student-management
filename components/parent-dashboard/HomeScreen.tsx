import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  ViewToken,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { PARENT_PROFILE } from "../../constants/parentData";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { parentApi } from "../../services/parent";
import { formatQueryDate } from "../../src/lib/formatDate";
import {
  getQueryById,
  QueryDetail,
  QueryReply,
  QueryStatus,
  replyToQuery,
} from "../../src/lib/parentQueryApi";
import type { ParentAnnouncement, ParentProfile } from "../../types/parent";
import { BottomSheet, HeaderBar, StatusPill } from "../shared";
import { QuerySheet } from "./QuerySheet";
import { useParentQuery } from "./hooks/useParentQuery";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH - spacing.lg * 2;
const ACCENT = colors.parent;

type AttendanceState = "present" | "absent" | "pending";
type Child = {
  id: string;
  name: string;
  cls: string;
  rollNo: string;
  attendance: AttendanceState;
};
type Update = {
  id: string;
  color: string;
  title: string;
  sub: string;
  time: string;
};

const AUTHOR_COLORS: Record<string, string> = {
  PRINCIPAL: colors.principal,
  TEACHER: colors.teacher,
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function formatPublishedAt(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffH = Math.floor(diffMs / 3600000);
  if (diffH < 1) return "Just now";
  if (diffH < 24) return `${diffH} hour${diffH > 1 ? "s" : ""} ago`;
  const diffD = Math.floor(diffH / 24);
  if (diffD === 1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function statusVariant(
  status: QueryStatus,
): "warning" | "info" | "success" | "danger" {
  if (status === "OPEN") return "warning";
  if (status === "ANSWERED") return "info";
  return "danger";
}

function statusLabel(status: QueryStatus): string {
  if (status === "OPEN") return "Open";
  if (status === "ANSWERED") return "Answered";
  return "Closed";
}

// ─── Child Card Component ────────────────────────────────────────────────────

function ChildCard({ item }: { item: Child }) {
  return (
    <View style={[styles.childCard, { width: CARD_WIDTH }]}>
      <View style={styles.childRow}>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.name}</Text>
          <Text style={styles.childCls}>{item.cls}</Text>
          <Text style={styles.childRoll}>Roll No. {item.rollNo}</Text>
        </View>
        <StatusPill
          variant={
            item.attendance === "present"
              ? "success"
              : item.attendance === "pending"
                ? "warning"
                : "danger"
          }
          label={
            item.attendance === "present"
              ? "Present Today"
              : item.attendance === "pending"
                ? "Pending"
                : "Absent Today"
          }
        />
      </View>
    </View>
  );
}

// ─── Feed Card Component ─────────────────────────────────────────────────────

function FeedCard({ item }: { item: Update }) {
  return (
    <View style={styles.feedCard}>
      <View style={[styles.feedAccent, { backgroundColor: item.color }]} />
      <View style={styles.feedBody}>
        <Text style={styles.feedTitle}>{item.title}</Text>
        <Text style={styles.feedSub}>{item.sub}</Text>
        <Text style={styles.feedTime}>{item.time}</Text>
      </View>
    </View>
  );
}

// ─── Reply Bubble Component ──────────────────────────────────────────────────

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

// ─── Query Detail Sheet Component ────────────────────────────────────────────

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
        {/* Close button */}
        <Pressable style={styles.detailClose} onPress={onClose}>
          <Ionicons name="close" size={20} color={colors.textSecondary} />
        </Pressable>

        {loading && (
          <View style={styles.detailCenter}>
            <ActivityIndicator color={ACCENT} />
          </View>
        )}

        {!loading && detail && (
          <>
            {/* Header */}
            <View style={styles.detailHeader}>
              <Text style={styles.detailSubject} numberOfLines={2}>
                {detail.subject}
              </Text>
              <StatusPill
                variant={statusVariant(detail.status)}
                label={statusLabel(detail.status)}
              />
            </View>

            {/* Meta */}
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
              {/* Original message */}
              <Text style={styles.sectionChip}>YOUR QUERY</Text>
              <View style={styles.originalMsgCard}>
                <Text style={styles.originalMsgText}>{detail.message}</Text>
              </View>

              {/* Replies */}
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

            {/* Reply input or closed banner */}
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

// ─── Main Home Screen Component ──────────────────────────────────────────────

export function HomeScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcements, setAnnouncements] = useState<ParentAnnouncement[]>([]);
  const [parentProfileState, setParentProfileState] =
    useState<ParentProfile>(PARENT_PROFILE);
  const [childrenData, setChildrenData] = useState<Child[]>(() =>
    parentProfileState.students.map((s) => ({
      id: s.id,
      name: s.name,
      cls: `${s.academic_class.name} · Section ${s.section.name}`,
      rollNo: s.roll_number,
      attendance: "pending" as const,
    })),
  );

  // Query sheet state & actions (memoize to prevent infinite updates)
  const memoizedProfile = React.useMemo(
    () => parentProfileState,
    [parentProfileState],
  );
  const [queryState, queryActions] = useParentQuery(memoizedProfile);

  // Detail sheet state
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const parentFirstName =
    parentProfileState.name.split(" ")[0] ?? parentProfileState.name;
  const schoolInitials = parentProfileState.school.name
    .split(" ")
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  const loadAnnouncements = useCallback(() => {
    // Fetch announcements for the school (no student ID needed)
    parentApi
      .getAnnouncements()
      .then((data) => setAnnouncements(data.results))
      .catch(() => {
        // silently ignore announcements fetch errors
      });
  }, []);

  const loadProfileAndAttendance = useCallback(async () => {
    try {
      const profile = await parentApi.getProfile();
      setParentProfileState(profile);

      // Fetch attendance for all students
      const today = new Date().toISOString().split("T")[0];
      const attendancePromises = profile.students.map((s) =>
        parentApi
          .getAttendance(s.id, { date_from: today, date_to: today })
          .then((res) => ({ id: s.id, records: res.results }))
          .catch(() => ({ id: s.id, records: [] })),
      );

      const attendanceResults = await Promise.all(attendancePromises);

      // Map attendance to children data
      const children = profile.students.map((s) => {
        const rec = attendanceResults.find((r) => r.id === s.id)?.records ?? [];
        let attendance: AttendanceState = "pending";
        if (rec.length > 0) {
          const status = rec[0].status as string;
          attendance = status === "PRESENT" ? "present" : "absent";
        }
        return {
          id: s.id,
          name: s.name,
          cls: `${s.academic_class.name} · Section ${s.section.name}`,
          rollNo: s.roll_number,
          attendance,
        };
      });

      setChildrenData(children);
    } catch {
      // keep defaults on error
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadProfileAndAttendance();
      // Load announcements after profile is fetched
      const timer = setTimeout(() => {
        loadAnnouncements();
      }, 100);
      return () => clearTimeout(timer);
    }, [loadProfileAndAttendance, loadAnnouncements]),
  );

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const feedItems: Update[] = announcements.map((a) => ({
    id: a.id,
    color: AUTHOR_COLORS[a.author_role] ?? colors.parent,
    title: a.title,
    sub: a.body,
    time: formatPublishedAt(a.published_at),
  }));

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        left={
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>{schoolInitials || "···"}</Text>
          </View>
        }
        center={
          <View style={styles.headerCenter}>
            <Text style={styles.greeting} numberOfLines={1}>
              {getGreeting()}, {parentFirstName}
            </Text>
            <Text style={styles.schoolSub} numberOfLines={1}>
              {parentProfileState.school.name}
            </Text>
          </View>
        }
        right={
          <View style={styles.headerRight}>
            <Pressable onPress={() => router.push("/(tabs)/parent/calendar")}>
              <Ionicons
                name="calendar-outline"
                size={22}
                color={colors.parent}
              />
            </Pressable>
            <View>
              <Ionicons
                name="notifications-outline"
                size={22}
                color={colors.textMuted}
              />
              {announcements.length > 0 && <View style={styles.notifDot} />}
            </View>
          </View>
        }
      />

      <FlatList
        data={feedItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.feedWrapper}>
            <FeedCard item={item} />
          </View>
        )}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            {childrenData.length > 0 && (
              <>
                <FlatList
                  data={childrenData}
                  keyExtractor={(c) => c.id}
                  renderItem={({ item }) => <ChildCard item={item} />}
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onViewableItemsChanged={onViewableItemsChanged}
                  viewabilityConfig={viewabilityConfig}
                />
                {childrenData.length > 1 && (
                  <View style={styles.dots}>
                    {childrenData.map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.dot,
                          {
                            width: i === activeIndex ? 20 : 6,
                            backgroundColor:
                              i === activeIndex ? colors.parent : colors.border,
                          },
                        ]}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
            {feedItems.length > 0 && (
              <View style={styles.announcementsHeader}>
                <Text style={styles.sectionLabel}>Announcements</Text>
                <Pressable
                  onPress={queryActions.openQuerySheet}
                  style={styles.raiseQueryInline}
                >
                  <Text style={styles.raiseQueryTextInline}>Raise a Query</Text>
                  <Ionicons
                    name="chatbubble-outline"
                    size={16}
                    color={ACCENT}
                    style={styles.raiseQueryIcon}
                  />
                </Pressable>
              </View>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No announcements yet</Text>
          </View>
        }
      />

      {/* Success toast */}
      {queryState.showSuccessToast && (
        <View style={styles.successToast} pointerEvents="none">
          <Text style={styles.successToastText}>Query sent successfully!</Text>
        </View>
      )}

      {/* Raise Query Sheet */}
      <QuerySheet
        visible={queryState.showQuerySheet}
        onClose={() => queryActions.setShowQuerySheet(false)}
        profile={parentProfileState}
        state={queryState}
        actions={queryActions}
      />

      {/* Query Detail Sheet */}
      <QueryDetailSheet
        visible={showDetailSheet}
        queryId={selectedQueryId}
        onClose={() => {
          setShowDetailSheet(false);
          setSelectedQueryId(null);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  listContent: { paddingBottom: spacing.lg },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.parent,
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    ...(typography.label as object),
    color: colors.surface,
    fontWeight: "700",
    fontSize: 9,
  },
  greeting: { ...(typography.h3 as object), color: colors.textPrimary },
  headerCenter: {
    alignItems: "center",
  },
  schoolSub: {
    fontSize: 13,
    color: colors.textSecondary,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  notifDot: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 7,
    height: 7,
    borderRadius: 999,
    backgroundColor: colors.danger,
    borderWidth: 1.5,
    borderColor: colors.surface,
  },
  childCard: {
    backgroundColor: colors.successBg,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.lg,
    marginBottom: spacing.sm,
  },
  childRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  childInfo: { flex: 1, marginRight: spacing.sm },
  childName: { ...(typography.h2 as object), color: colors.textPrimary },
  childCls: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  childRoll: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: 2,
  },
  dots: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  dot: { height: 6, borderRadius: 999 },
  sectionLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  feedWrapper: { paddingHorizontal: spacing.lg },
  feedCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
  },
  feedAccent: { width: 3 },
  feedBody: { flex: 1, padding: spacing.md, paddingLeft: spacing.lg },
  feedTitle: {
    ...(typography.body as object),
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  feedSub: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    lineHeight: 18,
  },
  feedTime: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyWrap: {
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    ...(typography.body as object),
    color: colors.textMuted,
  },
  announcementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  raiseQueryInline: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  raiseQueryTextInline: {
    ...(typography.body as object),
    color: colors.parent,
    textDecorationLine: "underline",
    fontWeight: "500",
  },
  raiseQueryIcon: { marginLeft: spacing.xs },

  // Success toast
  successToast: {
    position: "absolute",
    bottom: spacing.xxl,
    left: spacing.lg,
    right: spacing.lg,
    backgroundColor: "#1D9E75",
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
  },
  successToastText: {
    ...(typography.body as object),
    color: colors.surface,
    fontWeight: "500",
  },

  // Detail sheet
  detailSheetInner: { flex: 1, position: "relative" },
  detailClose: {
    alignSelf: "flex-end",
    padding: spacing.md,
  },
  detailCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.md,
  },
  detailSubject: {
    ...(typography.h3 as object),
    flex: 1,
    marginRight: spacing.md,
    color: colors.textPrimary,
  },
  detailMeta: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  teacherAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.parent,
    alignItems: "center",
    justifyContent: "center",
  },
  teacherAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.surface,
  },
  detailMetaText: {
    ...(typography.body as object),
    fontWeight: "500",
    color: colors.textPrimary,
  },
  detailMetaTime: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.md,
  },
  sectionChip: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    marginBottom: spacing.sm,
    letterSpacing: 0.5,
  },
  originalMsgCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  originalMsgText: {
    ...(typography.body as object),
    color: colors.textPrimary,
    lineHeight: 20,
  },
  noRepliesText: {
    ...(typography.caption as object),
    color: colors.textMuted,
    textAlign: "center",
    marginVertical: spacing.lg,
  },
  replyBubbleWrap: {
    flexDirection: "row",
    marginBottom: spacing.md,
  },
  replyLeft: {
    justifyContent: "flex-start",
  },
  replyRight: {
    justifyContent: "flex-end",
  },
  replyMeta: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  bubble: {
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  bubbleTeacher: {
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  bubbleParent: {
    backgroundColor: colors.parent,
  },
  bubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  replyTime: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  closedBanner: {
    backgroundColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    marginTop: spacing.md,
  },
  closedBannerText: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: "center",
  },
  replyInputRow: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  replyInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    fontSize: 14,
    color: colors.textPrimary,
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.parent,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.5,
  },
  replyErrorText: {
    fontSize: 12,
    color: "#e53935",
    marginBottom: spacing.sm,
  },
});
