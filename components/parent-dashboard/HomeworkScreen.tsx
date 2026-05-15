import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { parentApi } from "../../services/parent";
import type { HomeworkItem } from "../../types/parent";
import { LoadingScreen } from "../shared";

type FilterKey = "All" | "Today" | "This Week" | "Overdue";
const FILTERS: FilterKey[] = ["All", "Today", "This Week", "Overdue"];

type TaggedHW = HomeworkItem & { studentId: string; studentName: string };

type SubjectTheme = {
  accent: string;
  bg: string;
  icon: keyof typeof Ionicons.glyphMap;
};

const SUBJECT_THEMES: Record<string, SubjectTheme> = {
  Science: { accent: "#10B981", bg: "#E7F8F1", icon: "flask-outline" },
  Mathematics: { accent: "#2563EB", bg: "#EAF1FF", icon: "calculator-outline" },
  Math: { accent: "#2563EB", bg: "#EAF1FF", icon: "calculator-outline" },
  English: { accent: "#7C3AED", bg: "#F1EAFE", icon: "book-outline" },
  History: { accent: "#F97316", bg: "#FFF1E8", icon: "library-outline" },
  Hindi: { accent: "#D97706", bg: "#FEF3C7", icon: "document-text-outline" },
};

const DEFAULT_THEME: SubjectTheme = {
  accent: colors.parent,
  bg: colors.primaryLight,
  icon: "school-outline",
};

function getSubjectTheme(subject: string): SubjectTheme {
  return SUBJECT_THEMES[subject] ?? DEFAULT_THEME;
}

function getInitials(name: string): string {
  return name
    .trim()
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
}

function formatDate(date: string): string {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getTitle(description: string): string {
  const firstSentence = description.split(/[.!?]/)[0]?.trim();
  if (!firstSentence) return "Homework Assignment";
  return firstSentence.length > 58
    ? `${firstSentence.slice(0, 58).trim()}...`
    : firstSentence;
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

function StudentMenu({
  students,
  selectedId,
  onChange,
}: {
  students: { id: string; name: string }[];
  selectedId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const options =
    students.length > 1
      ? [{ id: "ALL", name: "All Students" }, ...students]
      : students;
  const selected = options.find((student) => student.id === selectedId);

  return (
    <>
      <Pressable style={styles.studentButton} onPress={() => setOpen(true)}>
        <View style={styles.studentAvatar}>
          <Text style={styles.studentAvatarText}>
            {getInitials(selected?.name ?? "All")}
          </Text>
        </View>
        <Text style={styles.studentButtonText} numberOfLines={1}>
          {selected?.name.split(" ")[0] ?? "Student"}
        </Text>
        <Ionicons name="chevron-down" size={16} color={colors.parent} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable style={styles.menuLayer} onPress={() => setOpen(false)}>
          <View style={styles.menuCard}>
            {options.map((student) => {
              const active = student.id === selectedId;
              return (
                <Pressable
                  key={student.id}
                  style={[styles.menuItem, active && styles.menuItemActive]}
                  onPress={() => {
                    onChange(student.id);
                    setOpen(false);
                  }}
                >
                  <View style={styles.menuItemLeft}>
                    <View
                      style={[
                        styles.menuAvatar,
                        active && styles.menuAvatarActive,
                      ]}
                    >
                      <Text
                        style={[
                          styles.menuAvatarText,
                          active && styles.menuAvatarTextActive,
                        ]}
                      >
                        {getInitials(student.name)}
                      </Text>
                    </View>
                    <Text
                      style={[styles.menuText, active && styles.menuTextActive]}
                    >
                      {student.name}
                    </Text>
                  </View>
                  {active && (
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={colors.parent}
                    />
                  )}
                </Pressable>
              );
            })}
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

function HomeworkCard({
  item,
  index,
  onPress,
}: {
  item: TaggedHW;
  index: number;
  onPress: (item: TaggedHW) => void;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const theme = getSubjectTheme(item.subject.name);
  const pressIn = () => {
    Animated.spring(scale, {
      toValue: 0.985,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  const pressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 30,
      bounciness: 6,
    }).start();
  };

  return (
    <Animated.View
      style={[
        styles.cardShell,
        {
          transform: [{ scale }],
          borderRadius: 24,
          opacity: Math.max(0.88, 1 - index * 0.015),
        },
      ]}
    >
      <Pressable
        onPress={() => onPress(item)}
        onPressIn={pressIn}
        onPressOut={pressOut}
        style={styles.homeworkCard}
      >
        <View style={[styles.cardAccent, { backgroundColor: theme.accent }]} />

        <View style={styles.cardTopRow}>
          <View style={[styles.subjectChip, { backgroundColor: theme.bg }]}>
            <Ionicons name={theme.icon} size={15} color={theme.accent} />
            <Text style={[styles.subjectText, { color: theme.accent }]}>
              {item.subject.name}
            </Text>
          </View>
        </View>

        <Text style={styles.cardTitle} numberOfLines={2}>
          {getTitle(item.description)}
        </Text>
        <Text style={styles.cardPreview} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.cardMetaRow}>
          <View style={styles.metaItem}>
            <Ionicons
              name="calendar-outline"
              size={14}
              color={colors.textMuted}
            />
            <Text style={styles.metaText}>Due {formatDate(item.deadline)}</Text>
          </View>
        </View>
      </Pressable>
    </Animated.View>
  );
}

function HomeworkDetailModal({
  item,
  visible,
  onClose,
}: {
  item: TaggedHW | null;
  visible: boolean;
  onClose: () => void;
}) {
  const [openingFile, setOpeningFile] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  async function handleOpenFile(url: string) {
    setOpeningFile(true);
    setFileError(null);
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      } else {
        setFileError("Cannot open this file on your device.");
      }
    } catch {
      setFileError("Failed to open file. Please try again.");
    } finally {
      setOpeningFile(false);
    }
  }

  if (!item) return null;

  const theme = getSubjectTheme(item.subject.name);
  const hasFile = !!item.file_url;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.detailLayer}>
        <Pressable style={styles.detailBackdrop} onPress={onClose} />
        <View style={styles.detailSheet}>
          <View style={styles.dragHandle} />
          <View style={styles.detailHeader}>
            <View style={[styles.subjectChip, { backgroundColor: theme.bg }]}>
              <Ionicons name={theme.icon} size={15} color={theme.accent} />
              <Text style={[styles.subjectText, { color: theme.accent }]}>
                {item.subject.name}
              </Text>
            </View>
            <Pressable style={styles.closeButton} onPress={onClose}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.detailScroll}
          >
            <Text style={styles.detailTitle}>{getTitle(item.description)}</Text>
            <Text style={styles.detailDescription}>{item.description}</Text>

            <View style={styles.detailInfoGrid}>
              <View style={styles.detailInfoCard}>
                <Ionicons
                  name="person-outline"
                  size={18}
                  color={theme.accent}
                />
                <Text style={styles.detailInfoLabel}>Teacher</Text>
                <Text style={styles.detailInfoValue}>
                  {item.assigned_by?.name ?? "Teacher"}
                </Text>
              </View>
              <View style={styles.detailInfoCard}>
                <Ionicons
                  name="calendar-outline"
                  size={18}
                  color={theme.accent}
                />
                <Text style={styles.detailInfoLabel}>Due Date</Text>
                <Text style={styles.detailInfoValue}>
                  {formatDate(item.deadline)}
                </Text>
              </View>
            </View>

            {hasFile && (
              <View style={styles.attachmentSection}>
                <Text style={styles.attachmentLabel}>ATTACHMENT</Text>
                <Pressable
                  style={[
                    styles.attachmentRow,
                    openingFile && styles.attachmentRowDisabled,
                  ]}
                  onPress={() => handleOpenFile(item.file_url!)}
                  disabled={openingFile}
                >
                  <View style={[styles.attachmentIcon, { backgroundColor: theme.bg }]}>
                    {openingFile ? (
                      <ActivityIndicator size={18} color={theme.accent} />
                    ) : (
                      <Ionicons name="document-text-outline" size={20} color={theme.accent} />
                    )}
                  </View>
                  <View style={styles.attachmentMeta}>
                    <Text style={styles.attachmentName} numberOfLines={1}>
                      {item.file_url!.split("/").pop() ?? "Attachment"}
                    </Text>
                    <Text style={styles.attachmentHint}>Tap to open file</Text>
                  </View>
                  <View style={styles.attachmentOpenBtn}>
                    <Ionicons name="open-outline" size={16} color={theme.accent} />
                    <Text style={[styles.attachmentOpenText, { color: theme.accent }]}>
                      Open
                    </Text>
                  </View>
                </Pressable>
                {fileError && (
                  <Text style={styles.fileErrorText}>{fileError}</Text>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

export function HomeworkScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("ALL");
  const [selectedHomework, setSelectedHomework] = useState<TaggedHW | null>(
    null,
  );
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [homework, setHomework] = useState<TaggedHW[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [loadingHomework, setLoadingHomework] = useState(false);
  const [homeworkError, setHomeworkError] = useState<string | null>(null);

  const loadHomework = useCallback(() => {
    setLoadingProfile(true);
    setHomeworkError(null);
    parentApi
      .getProfile()
      .then(async (profile) => {
        if (profile.students.length === 0) {
          setStudents([]);
          setHomework([]);
          return;
        }
        const studentList = profile.students.map((s) => ({
          id: s.id,
          name: s.name,
        }));
        setStudents(studentList);
        setSelectedStudentId((prev) =>
          prev === "ALL" || studentList.some((student) => student.id === prev)
            ? prev
            : "ALL",
        );
        setLoadingHomework(true);
        try {
          const results = await Promise.all(
            studentList.map((s) =>
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
        } catch {
          setHomeworkError("Could not load homework. Please try again.");
        } finally {
          setLoadingHomework(false);
        }
      })
      .catch(() => {
        setHomeworkError("Could not load profile. Please try again.");
      })
      .finally(() => setLoadingProfile(false));
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHomework();
    }, [loadHomework]),
  );

  const filtered = useMemo(() => {
    const studentFiltered =
      selectedStudentId === "ALL"
        ? homework.filter(
            (hw, idx, arr) => arr.findIndex((h) => h.id === hw.id) === idx,
          )
        : homework.filter((hw) => hw.studentId === selectedStudentId);
    return applyFilter(studentFiltered, activeFilter);
  }, [activeFilter, homework, selectedStudentId]);

  if (loadingProfile) {
    return <LoadingScreen label="Loading homework..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Homework</Text>
          <Text style={styles.headerSubtitle}>
            {filtered.length} assignment{filtered.length === 1 ? "" : "s"} ready
          </Text>
        </View>
        <View style={styles.headerActions}>
          {/* <Pressable style={styles.notificationButton}>
            <Ionicons
              name="notifications-outline"
              size={20}
              color={colors.textPrimary}
            />
          </Pressable> */}
          {students.length > 0 && (
            <StudentMenu
              students={students}
              selectedId={selectedStudentId}
              onChange={setSelectedStudentId}
            />
          )}
        </View>
      </View>

      {/* <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {FILTERS.map((filter) => {
            const active = activeFilter === filter;
            return (
              <Pressable
                key={filter}
                style={[styles.filterPill, active && styles.filterPillActive]}
                onPress={() => setActiveFilter(filter)}
              >
                <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
                  {filter}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View> */}

      {loadingHomework && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator color={colors.parent} size="small" />
          <Text style={styles.loadingOverlayText}>Loading homework...</Text>
        </View>
      )}

      {!loadingHomework && homeworkError && (
        <View style={styles.emptyWrap}>
          <View style={[styles.emptyIcon, { backgroundColor: colors.redLight }]}>
            <Ionicons name="alert-circle-outline" size={30} color={colors.red} />
          </View>
          <Text style={styles.emptyTitle}>Something went wrong</Text>
          <Text style={styles.emptyText}>{homeworkError}</Text>
          <Pressable style={styles.retryBtn} onPress={loadHomework}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </Pressable>
        </View>
      )}

      {!loadingHomework && !homeworkError && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.id}-${item.studentName}`}
          renderItem={({ item, index }) => (
            <HomeworkCard
              item={item}
              index={index}
              onPress={setSelectedHomework}
            />
          )}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrap}>
              <View style={styles.emptyIcon}>
                <Ionicons
                  name="checkmark-done-outline"
                  size={30}
                  color={colors.parent}
                />
              </View>
              <Text style={styles.emptyTitle}>Nothing here</Text>
              <Text style={styles.emptyText}>
                No homework found for this filter.
              </Text>
            </View>
          }
        />
      )}

      <HomeworkDetailModal
        item={selectedHomework}
        visible={!!selectedHomework}
        onClose={() => setSelectedHomework(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.94)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  headerSubtitle: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  notificationButton: {
    width: 42,
    height: 42,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  studentButton: {
    height: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.parent,
    paddingHorizontal: spacing.md,
    shadowColor: colors.parent,
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  studentAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.parent,
  },
  studentButtonText: {
    ...(typography.caption as object),
    fontWeight: "700",
    color: colors.parent,
    maxWidth: 74,
  },
  menuLayer: {
    flex: 1,
    backgroundColor: "transparent",
    alignItems: "flex-end",
    paddingTop: 76,
    paddingRight: spacing.lg,
  },
  menuCard: {
    width: 230,
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.12,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  menuItem: {
    minHeight: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.md,
  },
  menuItemActive: { backgroundColor: colors.primaryLight },
  menuItemLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  menuAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  menuAvatarActive: { backgroundColor: colors.parent },
  menuAvatarText: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textSecondary,
  },
  menuAvatarTextActive: { color: colors.surface },
  menuText: { ...(typography.body as object), color: colors.textSecondary },
  menuTextActive: { color: colors.parent, fontWeight: "700" },
  filterBar: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  filterPill: {
    minHeight: 36,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface2,
  },
  filterPillActive: {
    backgroundColor: colors.parent,
    shadowColor: colors.parent,
    shadowOpacity: 0.2,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 },
    elevation: 3,
  },
  filterLabel: {
    ...(typography.caption as object),
    fontWeight: "700",
    color: colors.textSecondary,
  },
  filterLabelActive: { color: colors.surface },
  listContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  cardShell: {
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.08,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 4,
  },
  homeworkCard: {
    backgroundColor: colors.surface,
    borderRadius: 24,
    padding: spacing.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: "hidden",
  },
  homeworkCardOverdue: {
    backgroundColor: "#FFF8F8",
    borderColor: "#FECACA",
    shadowColor: colors.danger,
  },
  cardAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 5,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  subjectChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  subjectText: {
    ...(typography.label as object),
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 8,
  },
  statusText: {
    ...(typography.caption as object),
    fontWeight: "700",
  },
  cardTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.textPrimary,
    lineHeight: 25,
    marginTop: spacing.lg,
  },
  cardPreview: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  cardMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
  },
  metaItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  metaText: { ...(typography.caption as object), color: colors.textMuted },
  progressText: {
    ...(typography.caption as object),
    color: colors.textMuted,
    fontWeight: "700",
  },
  progressTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    overflow: "hidden",
    marginTop: spacing.sm,
  },
  progressTrackLarge: {
    height: 10,
    borderRadius: 999,
    backgroundColor: colors.surface2,
    overflow: "hidden",
    marginTop: spacing.md,
  },
  progressFill: { height: "100%", borderRadius: 999 },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  continueButton: {
    flex: 1,
    height: 44,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.surface,
  },
  quickAction: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  detailLayer: { flex: 1, justifyContent: "flex-end" },
  detailBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(13,17,23,0.22)",
  },
  detailSheet: {
    maxHeight: "92%",
    backgroundColor: colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: spacing.md,
    shadowColor: colors.textPrimary,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: -10 },
    elevation: 12,
  },
  dragHandle: {
    width: 46,
    height: 5,
    borderRadius: 999,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.md,
  },
  detailHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
  },
  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 14,
    backgroundColor: colors.surface2,
    alignItems: "center",
    justifyContent: "center",
  },
  detailScroll: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 112,
  },
  detailTitle: {
    fontSize: 26,
    lineHeight: 32,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: spacing.lg,
  },
  detailDescription: {
    ...(typography.body as object),
    color: colors.textSecondary,
    lineHeight: 23,
    marginTop: spacing.md,
  },
  detailInfoGrid: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  detailInfoCard: {
    flex: 1,
    backgroundColor: colors.background,
    borderRadius: 18,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  detailInfoLabel: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.sm,
  },
  detailInfoValue: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textPrimary,
    marginTop: 2,
  },
  detailSection: {
    marginTop: spacing.lg,
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  detailSectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.textPrimary,
    marginBottom: spacing.md,
  },
  fileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  fileIcon: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  fileTextBlock: { flex: 1 },
  fileTitle: { fontSize: 13, fontWeight: "700", color: colors.textPrimary },
  fileMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: 2,
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  checkDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
  },
  checkText: { ...(typography.body as object), color: colors.textSecondary },
  notesBox: {
    minHeight: 74,
    borderRadius: 16,
    backgroundColor: colors.surface,
    padding: spacing.md,
  },
  notesText: {
    ...(typography.body as object),
    color: colors.textMuted,
    lineHeight: 21,
  },
  stickyActions: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: spacing.sm,
    padding: spacing.lg,
    backgroundColor: "rgba(255,255,255,0.96)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  markDoneButton: {
    flex: 0.9,
    height: 48,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    backgroundColor: colors.surface,
  },
  markDoneText: { fontSize: 13, fontWeight: "700" },
  continueAssignmentButton: {
    flex: 1.2,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  continueAssignmentText: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.surface,
  },
  emptyWrap: {
    alignItems: "center",
    paddingTop: spacing.xxxl,
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 24,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  emptyText: {
    ...(typography.body as object),
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing.xs,
  },
  loadingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.xl,
  },
  loadingOverlayText: {
    fontSize: 14,
    color: colors.textMuted,
  },
  retryBtn: {
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.parent,
    borderRadius: 10,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.parent,
  },

  // Attachment section in detail modal
  attachmentSection: {
    marginTop: spacing.lg,
  },
  attachmentLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textMuted,
    letterSpacing: 0.8,
    marginBottom: spacing.sm,
  },
  attachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.background,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    padding: spacing.md,
  },
  attachmentRowDisabled: { opacity: 0.6 },
  attachmentIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  attachmentMeta: { flex: 1 },
  attachmentName: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  attachmentHint: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  attachmentOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  attachmentOpenText: {
    fontSize: 12,
    fontWeight: "600",
  },
  fileErrorText: {
    fontSize: 12,
    color: colors.red,
    marginTop: spacing.sm,
  },
});
