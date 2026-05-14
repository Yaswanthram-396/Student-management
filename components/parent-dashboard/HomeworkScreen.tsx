import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  FlatList,
  Modal,
  Pressable,
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
import { LoadingScreen, StatusPill } from "../shared";

// ─── Types ────────────────────────────────────────────────────────────────────

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

// ─── Subject colours ──────────────────────────────────────────────────────────

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
  const style = subjectStyle(hw.subject.name);
  return {
    id: hw.id,
    subject: hw.subject.name,
    subjectBg: style.bg,
    subjectText: style.text,
    desc: hw.description,
    due: deadline.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }),
    status: deadline < new Date() ? "Overdue" : "Pending",
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

// ─── Student dropdown ─────────────────────────────────────────────────────────

function StudentDropdown({
  students,
  selectedId,
  onChange,
  showAllOption,
}: {
  students: { id: string; name: string }[];
  selectedId: string;
  onChange: (id: string) => void;
  showAllOption: boolean;
}) {
  const [open, setOpen] = useState(false);
  const options = showAllOption
    ? [{ id: "ALL", name: "All Students" }, ...students]
    : students;
  const selected = options.find((s) => s.id === selectedId);
  const displayName = selected ? selected.name.split(" ")[0] : "All";

  return (
    <>
      <Pressable style={styles.dropdownBtn} onPress={() => setOpen(true)}>
        <Ionicons name="person-outline" size={13} color={colors.parent} />
        <Text style={styles.dropdownBtnText} numberOfLines={1}>{displayName}</Text>
        <Ionicons name="chevron-down" size={13} color={colors.parent} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdownMenu}>
            {options.map((s) => (
              <Pressable
                key={s.id}
                style={[styles.dropdownItem, selectedId === s.id && styles.dropdownItemActive]}
                onPress={() => { onChange(s.id); setOpen(false); }}
              >
                <Text style={[styles.dropdownItemText, selectedId === s.id && styles.dropdownItemTextActive]}>
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

// ─── Homework card ────────────────────────────────────────────────────────────

function SubjectPill({ label, bg, text }: { label: string; bg: string; text: string }) {
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
        <SubjectPill label={item.subject} bg={item.subjectBg} text={item.subjectText} />
        <StatusPill variant={item.status === "Overdue" ? "danger" : "warning"} label={item.status} />
      </View>
      <Text style={styles.hwDesc}>{item.desc}</Text>
      <View style={styles.hwDueRow}>
        <Ionicons name="calendar-outline" size={11} color={colors.textMuted} />
        <Text style={styles.hwDue}>Due: {item.due}</Text>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export function HomeworkScreen() {
  const [activeFilter, setActiveFilter] = useState<FilterKey>("All");
  const [selectedStudentId, setSelectedStudentId] = useState<string>("ALL");
  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [homework, setHomework] = useState<TaggedHW[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const loadHomework = useCallback(() => {
    setLoadingProfile(true);
    parentApi
      .getProfile()
      .then(async (profile) => {
        if (profile.students.length === 0) return;
        const studentList = profile.students.map((s) => ({ id: s.id, name: s.name }));
        setStudents(studentList);
        const results = await Promise.all(
          studentList.map((s) =>
            parentApi
              .getHomework(s.id)
              .then((data) => data.results.map((hw) => ({ ...hw, studentId: s.id, studentName: s.name })))
              .catch(() => [] as TaggedHW[]),
          ),
        );
        setHomework(results.flat());
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  useFocusEffect(useCallback(() => { loadHomework(); }, [loadHomework]));

  const studentFiltered =
    selectedStudentId === "ALL"
      ? homework.filter((hw, idx, arr) => arr.findIndex((h) => h.id === hw.id) === idx)
      : homework.filter((hw) => hw.studentId === selectedStudentId);

  const filtered = applyFilter(studentFiltered, activeFilter).map(mapHomework);

  if (loadingProfile) {
    return <LoadingScreen label="Loading homework..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Homework</Text>
        {students.length > 0 && (
          <StudentDropdown
            students={students}
            selectedId={selectedStudentId}
            onChange={setSelectedStudentId}
            showAllOption={students.length > 1}
          />
        )}
      </View>

      {/* Time filter pills */}
      <View style={styles.filterBar}>
        <FlatList
          data={FILTERS}
          keyExtractor={(item) => item}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.filterPill, activeFilter === item && styles.filterPillActive]}
              onPress={() => setActiveFilter(item)}
            >
              <Text style={[styles.filterLabel, activeFilter === item && styles.filterLabelActive]}>
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

      {/* Homework list */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => `${item.id}-${item.studentName}`}
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

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

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
  dropdownItemText: { ...(typography.body as object), color: colors.textSecondary },
  dropdownItemTextActive: { color: colors.parent, fontWeight: "600" },

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
  filterLabel: { ...(typography.caption as object), fontWeight: "500", color: colors.textSecondary },
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
  subjectPill: { borderRadius: 999, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  subjectLabel: { ...(typography.label as object) },
  hwDesc: { ...(typography.body as object), color: colors.textSecondary, lineHeight: 22, marginBottom: spacing.sm },
  hwDueRow: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  hwDue: { ...(typography.caption as object), color: colors.textMuted },

  emptyWrap: { paddingTop: spacing.xxl, alignItems: "center" },
  emptyText: { ...(typography.body as object), color: colors.textMuted },
});
