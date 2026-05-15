import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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
import { notificationsApi } from "../../services/notifications";
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
import { BottomSheet, StatusPill } from "../shared";
import { NotificationsSheet } from "./NotificationsSheet";
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

function ChildCard({ item, onAttendancePress }: { item: Child; onAttendancePress: () => void }) {
  return (
    <View style={[styles.childCard, { width: CARD_WIDTH }]}>
      <LinearGradient
        colors={[colors.primaryLight + "AA", colors.surface + "AA"]}
        start={[0, 0]}
        end={[1, 0]}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.childRow}>
        <View style={styles.childInfo}>
          <Text style={styles.childName}>{item.name}</Text>
          <Text style={styles.childCls}>{item.cls}</Text>
          <Text style={styles.childRoll}>Roll No. {item.rollNo}</Text>
        </View>
        <Pressable onPress={onAttendancePress}>
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
                ? "Present · 9:02 AM"
                : item.attendance === "pending"
                  ? "Attendance Pending"
                  : "Absent Today"
            }
          />
        </Pressable>
      </View>
      <Pressable
        style={styles.childBottomRow}
        onPress={onAttendancePress}
      >
        <Text style={styles.childBottomText}>
          View attendance history
        </Text>
        <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
      </Pressable>
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

function AnnouncementCard({ item, index }: { item: Update; index: number }) {
  const featured = index === 0;
  if (featured) {
    return (
      <View
        style={[
          styles.featuredCard,
          { backgroundColor: colors.primaryLight, borderRadius: 24 },
        ]}
      >
        <View
          style={[styles.featuredAccent, { backgroundColor: item.color }]}
        />
        <View style={styles.featuredContent}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons
              name="megaphone-outline"
              size={16}
              color={colors.textPrimary}
            />
            <Text style={styles.feedTitle}>{item.title}</Text>
          </View>
          <Text style={styles.featuredBody} numberOfLines={3}>
            {item.sub}
          </Text>
          <Text style={styles.feedTime}>{item.time}</Text>
        </View>
      </View>
    );
  }
  return (
    <View style={styles.feedCard}>
      <View style={[styles.feedAccent, { backgroundColor: item.color }]} />
      <View style={styles.feedBody}>
        <Text style={styles.feedTitle}>{item.title}</Text>
        <Text style={styles.feedSub} numberOfLines={2}>
          {item.sub}
        </Text>
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
  const [replySent, setReplySent] = useState(false);
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
                {replySent && (
                  <View style={styles.replySentBanner}>
                    <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
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

// ─── Main Home Screen Component ──────────────────────────────────────────────

export function HomeScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcements, setAnnouncements] = useState<ParentAnnouncement[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
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

  const loadUnreadCount = useCallback(() => {
    notificationsApi
      .getUnreadCount()
      .then((data) => setUnreadCount(data.count))
      .catch(() => {
        // silently ignore unread count errors
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
      loadUnreadCount();
      // Load announcements after profile is fetched
      const timer = setTimeout(() => {
        loadAnnouncements();
      }, 100);
      return () => clearTimeout(timer);
    }, [loadProfileAndAttendance, loadAnnouncements, loadUnreadCount]),
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

  // Animations: bell dot pulse (once) and FAB entry
  const bellPulse = useRef(new Animated.Value(1)).current;
  const fabScale = useRef(new Animated.Value(0)).current;
  const [showFabLabel, setShowFabLabel] = useState(false);

  useEffect(() => {
    // bell pulse once
    Animated.sequence([
      Animated.timing(bellPulse, {
        toValue: 0.6,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(bellPulse, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();

    // FAB entry after slight delay
    const t = setTimeout(() => {
      Animated.spring(fabScale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 6,
      }).start();
    }, 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.headerWrap}>
        <View style={styles.headerTop}>
          <View style={styles.schoolPill}>
            <Text style={styles.schoolPillText}>{schoolInitials || "···"}</Text>
          </View>
          <View style={styles.headerIcons}>
            <Pressable onPress={() => router.push("/(tabs)/parent/calendar")}>
              <Ionicons
                name="calendar-outline"
                size={24}
                color={colors.primary}
              />
            </Pressable>
            <View style={{ marginLeft: 8 }}>
              <Pressable onPress={() => setShowNotifications(true)}>
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={colors.textMuted}
                />
                {unreadCount > 0 && (
                  <Animated.View
                    style={[styles.notifDot, { opacity: bellPulse }]}
                  />
                )}
              </Pressable>
            </View>
          </View>
        </View>

        <View style={styles.headerBottom}>
          <View>
            <Text style={styles.greeting} numberOfLines={1}>
              {getGreeting()}, {parentFirstName}
            </Text>
            <View style={styles.schoolRow}>
              <Text style={styles.schoolSub} numberOfLines={1}>
                {parentProfileState.school.name}
              </Text>
              <Ionicons
                name="checkmark-circle"
                size={16}
                color={colors.primary}
                style={{ marginLeft: 6 }}
              />
            </View>
          </View>
        </View>
      </View>

      <FlatList
        data={feedItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <View style={styles.feedWrapper}>
            <AnnouncementCard item={item} index={index} />
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
                  renderItem={({ item }) => (
                    <ChildCard
                      item={item}
                      onAttendancePress={() =>
                        router.push({
                          pathname: "/(tabs)/parent/attendance-history",
                          params: { student_id: item.id, student_name: item.name },
                        })
                      }
                    />
                  )}
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
                        style={
                          i === activeIndex
                            ? styles.indicatorActive
                            : styles.indicatorInactive
                        }
                      />
                    ))}
                  </View>
                )}
              </>
            )}
            {feedItems.length > 0 && (
              <View style={styles.announcementsHeader}>
                <Text style={styles.sectionLabel}>ANNOUNCEMENTS</Text>
                {/* <Pressable
                  onPress={() => router.push("/(tabs)/parent/(tabs)/queries")}
                >
                  <Text style={styles.seeAll}>See all</Text>
                </Pressable> */}
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

      <NotificationsSheet
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
        onUnreadCountChange={setUnreadCount}
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
      {/* FAB */}
      <Animated.View
        style={{
          position: "absolute",
          right: 20,
          bottom: "20%",
          transform: [{ scale: fabScale }],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          {showFabLabel && (
            <View
              style={{
                backgroundColor: colors.surface,
                paddingHorizontal: 10,
                paddingVertical: 6,
                borderRadius: 16,
                marginRight: 8,
                shadowColor: "#000",
                shadowOpacity: 0.1,
                shadowOffset: { width: 0, height: 2 },
                shadowRadius: 8,
              }}
            >
              <Text style={{ fontSize: 13, color: colors.textPrimary }}>
                Raise a Query
              </Text>
            </View>
          )}
          <Pressable
            onPress={() => queryActions.openQuerySheet()}
            onLongPress={() => setShowFabLabel(true)}
            onPressOut={() => setShowFabLabel(false)}
            style={{
              width: 52,
              height: 52,
              borderRadius: 26,
              backgroundColor: colors.primary,
              alignItems: "center",
              justifyContent: "center",
              shadowColor: colors.primary,
              shadowOpacity: 0.35,
              shadowOffset: { width: 0, height: 4 },
              shadowRadius: 16,
            }}
          >
            <Ionicons
              name="chatbubble-ellipses"
              size={22}
              color={colors.surface}
            />
          </Pressable>
        </View>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  listHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  listContent: { paddingBottom: spacing.xxxl + 72 },
  headerWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
    paddingBottom: spacing.sm,
    backgroundColor: colors.background,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  schoolPill: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  schoolPillText: {
    color: colors.primary,
    fontWeight: "600",
    fontSize: 12,
  },
  headerIcons: { flexDirection: "row", alignItems: "center" },
  greeting: {
    ...(typography.h1 as object),
    color: colors.textPrimary,
    fontSize: 22,
  },
  headerBottom: { marginTop: spacing.sm },
  schoolRow: { flexDirection: "row", alignItems: "center", marginTop: 4 },
  schoolSub: { fontSize: 13, color: colors.textMuted },
  notifDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 6,
    height: 6,
    borderRadius: 6,
    backgroundColor: colors.red,
  },
  childCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: spacing.lg,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
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
    gap: 8,
    marginBottom: spacing.xl,
  },
  dot: { height: 6, borderRadius: 3 },
  indicatorActive: {
    width: 20,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
  },
  indicatorInactive: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D1D5DB",
  },
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
  featuredCard: {
    flexDirection: "row",
    borderRadius: 14,
    overflow: "hidden",
    alignItems: "stretch",
  },
  featuredAccent: {
    width: 6,
    borderTopLeftRadius: 3,
    borderBottomLeftRadius: 3,
  },
  featuredContent: { flex: 1, padding: 14 },
  featuredBody: {
    ...(typography.body as object),
    color: colors.textSecondary,
    marginTop: 6,
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
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: "500" },

  // Child card bottom row
  childBottomRow: {
    marginTop: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  childBottomText: { fontSize: 12, color: colors.textMuted },

  // Success toast
  successToast: {
    position: "absolute",
    bottom: spacing.xxl,
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
    backgroundColor: colors.primary,
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
    backgroundColor: colors.primary,
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
    color: colors.primary,
    fontWeight: "500",
  },
});
