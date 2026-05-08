import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { parentApi } from "../../services/parent";
import type { HomeworkItem } from "../../types/parent";
import { HeaderBar, LoadingScreen, StatusPill } from "../shared";

type FilterKey = "All" | "Today" | "This Week" | "Overdue";
const FILTERS: FilterKey[] = ["All", "Today", "This Week", "Overdue"];

type HWItem = {
  id: string;
  subject: string;
  subjectBg: string;
  subjectText: string;
  desc: string;
  due: string;
  status: "Pending" | "Overdue";
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

function mapHomework(hw: HomeworkItem): HWItem {
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
  };
}

function applyFilter(items: HomeworkItem[], filter: FilterKey): HomeworkItem[] {
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

function SubjectPill({
  label,
  bg,
  text,
}: {
  label: string;
  bg: string;
  text: string;
}) {
  return (
    <View style={[styles.subjectPill, { backgroundColor: bg }]}>
      <Text style={[styles.subjectLabel, { color: text }]}>{label}</Text>
    </View>
  );
}

function HWCard({ item }: { item: HWItem }) {
  return (
    <View style={styles.hwCard}>
      <View style={styles.hwCardTop}>
        <SubjectPill
          label={item.subject}
          bg={item.subjectBg}
          text={item.subjectText}
        />
        <StatusPill
          variant={item.status === "Overdue" ? "danger" : "warning"}
          label={item.status}
        />
      </View>
      <Text style={styles.hwDesc}>{item.desc}</Text>
      <View style={styles.hwDueRow}>
        <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
        <Text style={styles.hwDue}>Due: {item.due}</Text>
      </View>
    </View>
  );
}

export function HomeworkScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    parentApi
      .getProfile()
      .then((profile) => {
        if (profile.students.length === 0) return;
        parentApi
          .getHomework(profile.students[0].id)
          .then((data) => setHomework(data.results))
          .catch(() => {});
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const filtered = applyFilter(homework, activeFilter).map(mapHomework);

  if (loadingProfile) {
    return <LoadingScreen label="Loading homework profile..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar center={<Text style={styles.headerTitle}>Homework</Text>} />

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
        renderItem={({ item }) => <HWCard item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No homework found</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  filterBar: {
    backgroundColor: colors.surface,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
  },
  filterList: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
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
  hwDueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  hwDue: { ...(typography.caption as object), color: colors.textMuted },
  emptyWrap: {
    paddingTop: spacing.xxl,
    alignItems: "center",
  },
  emptyText: {
    ...(typography.body as object),
    color: colors.textMuted,
  },
});
