import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
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
import { colors } from "../../../constants/colors";
import { PARENT_PROFILE } from "../../../constants/parentData";
import { spacing } from "../../../constants/spacing";
import { typography } from "../../../constants/typography";
import { parentApi } from "../../../../services/parent";
import { formatQueryDate } from "../../../lib/formatDate";
import {
  createQuery,
  getQueryById,
  Query,
  QueryDetail,
  QueryReply,
  QueryStatus,
  replyToQuery,
} from "../../../lib/parentQueryApi";
import type { ParentAnnouncement } from "../../../../types/parent";
import { BottomSheet, HeaderBar, StatusPill } from "../../shared";

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

function resolveQueryError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("UNLINKED_STUDENT"))
    return "This student is not linked to your account.";
  if (msg.includes("queries") && msg.includes("disabled"))
    return "Queries are currently disabled by the school.";
  if (msg.includes("class teacher"))
    return "No class teacher assigned to this section yet.";
  return "Something went wrong. Please try again.";
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
            <ActivityIndicator color={ACCENT} />
          </View>
        )}

        {!loading && detail && (
          <>
            <View style={styles.detailHeader}>
              <Text style={styles.detailSubject} numberOfLines={2}>
                {detail.subject}
              </Text>
              <StatusPill
                variant={statusVariant(detail.status)}
                label={statusLabel(detail.status)}
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

export function HomeScreen() {
  const router = useRouter();
  const [activeIndex, setActiveIndex] = useState(0);
  const [announcements, setAnnouncements] = useState<ParentAnnouncement[]>([]);

  const [showQuerySheet, setShowQuerySheet] = useState(false);
  const [queryStudent, setQueryStudent] = useState(
    PARENT_PROFILE.students[0]?.id ?? "",
  );
  const [querySubject, setQuerySubject] = useState("");
  const [queryMessage, setQueryMessage] = useState("");
  const [queryLoading, setQueryLoading] = useState(false);
  const [queryError, setQueryError] = useState<string | null>(null);
  const [subjectError, setSubjectError] = useState(false);
  const [messageError, setMessageError] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [showDetailSheet, setShowDetailSheet] = useState(false);

  const parentFirstName =
    PARENT_PROFILE.name.split(" ")[0] ?? PARENT_PROFILE.name;
  const schoolInitials = PARENT_PROFILE.school.name
    .split(" ")
    .slice(0, 3)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  useEffect(() => {
    parentApi
      .getAnnouncements()
      .then((data) => setAnnouncements(data.results))
      .catch(() => {});
  }, []);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0) setActiveIndex(viewableItems[0].index ?? 0);
    },
  ).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 50 }).current;

  const childrenData: Child[] = PARENT_PROFILE.students.map((s, index) => ({
    id: s.id,
    name: s.name,
    cls: `${s.academic_class.name} · Section ${s.section.name}`,
    rollNo: s.roll_number,
    attendance: index % 2 === 0 ? "present" : "absent",
  }));

  const feedItems: Update[] = announcements.map((a) => ({
    id: a.id,
    color: AUTHOR_COLORS[a.author_role] ?? colors.parent,
    title: a.title,
    sub: a.body,
    time: formatPublishedAt(a.published_at),
  }));

  function openQuerySheet() {
    setQueryStudent(PARENT_PROFILE.students[0]?.id ?? "");
    setQuerySubject("");
    setQueryMessage("");
    setQueryError(null);
    setSubjectError(false);
    setMessageError(false);
    setShowQuerySheet(true);
  }

  async function handleSendQuery() {
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
  }

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
              {PARENT_PROFILE.school.name}
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
              <Text style={styles.sectionLabel}>Announcements</Text>
            )}
          </View>
        }
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No announcements yet</Text>
          </View>
        }
        ListFooterComponent={
          <View style={styles.raiseQueryWrap}>
            <Pressable style={styles.raiseQueryBtn} onPress={openQuerySheet}>
              <Ionicons
                name="chatbubble-outline"
                size={18}
                color={ACCENT}
                style={{ marginRight: spacing.sm }}
              />
              <Text style={styles.raiseQueryText}>Raise a Query</Text>
            </Pressable>
          </View>
        }
      />

      {showSuccessToast && (
        <View style={styles.successToast} pointerEvents="none">
          <Text style={styles.successToastText}>Query sent successfully!</Text>
        </View>
      )}

      <BottomSheet
        visible={showQuerySheet}
        onClose={() => setShowQuerySheet(false)}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.sheetTitle}>Raise a Query</Text>
          <Text style={styles.sheetSubtitle}>
            Your query will be sent to the class teacher
          </Text>

          {PARENT_PROFILE.students.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: spacing.lg, marginBottom: spacing.sm }}
              contentContainerStyle={{ gap: spacing.sm }}
            >
              {PARENT_PROFILE.students.map((s) => (
                <Pressable
                  key={s.id}
                  style={[
                    styles.studentPill,
                    queryStudent === s.id && styles.studentPillActive,
                  ]}
                  onPress={() => setQueryStudent(s.id)}
                >
                  <Text
                    style={[
                      styles.studentPillText,
                      queryStudent === s.id && styles.studentPillTextActive,
                    ]}
                  >
                    {s.name}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>
          )}

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Subject</Text>
            <TextInput
              style={[styles.textInput, subjectError && styles.textInputError]}
              placeholder="e.g. Homework doubt, Exam clarification"
              placeholderTextColor={colors.textMuted}
              value={querySubject}
              onChangeText={(t) => {
                setQuerySubject(t);
                if (t.trim()) setSubjectError(false);
              }}
              maxLength={100}
            />
            <View style={styles.charCountRow}>
              {subjectError && (
                <Text style={styles.fieldError}>Subject is required</Text>
              )}
              <Text style={styles.charCount}>{querySubject.length}/100</Text>
            </View>
          </View>

          <View style={styles.fieldWrap}>
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={[
                styles.textInput,
                styles.textArea,
                messageError && styles.textInputError,
              ]}
              placeholder="Describe your query in detail..."
              placeholderTextColor={colors.textMuted}
              value={queryMessage}
              onChangeText={(t) => {
                setQueryMessage(t);
                if (t.trim()) setMessageError(false);
              }}
              multiline
              numberOfLines={4}
              maxLength={500}
              textAlignVertical="top"
            />
            <View style={styles.charCountRow}>
              {messageError && (
                <Text style={styles.fieldError}>Message is required</Text>
              )}
              <Text style={styles.charCount}>{queryMessage.length}/500</Text>
            </View>
          </View>

          {queryError && (
            <Text style={styles.submitError}>{queryError}</Text>
          )}

          <Pressable
            style={[
              styles.sendQueryBtn,
              queryLoading && styles.sendQueryBtnDisabled,
            ]}
            onPress={handleSendQuery}
            disabled={queryLoading}
          >
            {queryLoading ? (
              <ActivityIndicator color={colors.surface} />
            ) : (
              <Text style={styles.sendQueryBtnText}>Send Query</Text>
            )}
          </Pressable>
          <View style={{ height: spacing.lg }} />
        </ScrollView>
      </BottomSheet>

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
  listHeader: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
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
  headerCenter: { alignItems: "center" },
  schoolSub: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },
  headerRight: { flexDirection: "row", alignItems: "center", gap: spacing.md },
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
  emptyWrap: { paddingTop: spacing.xxl, alignItems: "center" },
  emptyText: { ...(typography.body as object), color: colors.textMuted },

  raiseQueryWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  raiseQueryBtn: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: ACCENT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  raiseQueryText: {
    ...(typography.body as object),
    fontWeight: "500",
    color: ACCENT,
  },

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

  sheetTitle: {
    ...(typography.h3 as object),
    fontSize: 16,
    fontWeight: "500",
    color: colors.textPrimary,
  },
  sheetSubtitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.lg,
  },
  studentPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  studentPillActive: { backgroundColor: ACCENT, borderColor: ACCENT },
  studentPillText: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: colors.textSecondary,
  },
  studentPillTextActive: { color: colors.surface },
  fieldWrap: { marginTop: spacing.lg },
  fieldLabel: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    ...(typography.body as object),
    color: colors.textPrimary,
  },
  textArea: { minHeight: 96, textAlignVertical: "top" },
  textInputError: { borderColor: colors.danger },
  charCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.xs,
  },
  charCount: { fontSize: 11, color: colors.textMuted, marginLeft: "auto" },
  fieldError: { fontSize: 12, color: colors.danger },
  submitError: { fontSize: 13, color: colors.danger, marginTop: spacing.md, textAlign: "center" },
  sendQueryBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginTop: spacing.lg,
  },
  sendQueryBtnDisabled: { opacity: 0.6 },
  sendQueryBtnText: {
    ...(typography.body as object),
    fontWeight: "600",
    color: colors.surface,
  },

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
  bubbleParent: { backgroundColor: ACCENT },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  replyTime: { fontSize: 11, color: colors.textMuted, marginTop: spacing.xs },
  teacherAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.principal,
    alignItems: "center",
    justifyContent: "center",
    marginRight: spacing.sm,
  },
  teacherAvatarText: { fontSize: 10, fontWeight: "700", color: colors.surface },

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
    backgroundColor: ACCENT,
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
