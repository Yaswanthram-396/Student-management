import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../../constants/colors";
import { spacing } from "../../../constants/spacing";
import { typography } from "../../../constants/typography";
import { parentApi } from "../../../services/parent";
import type { AttendanceRecord, AttendanceSummary } from "../../../types/parent";

type SlotFilter = "ALL" | "MORNING" | "AFTERNOON";

const SLOT_FILTERS: { key: SlotFilter; label: string }[] = [
  { key: "ALL", label: "All Slots" },
  { key: "MORNING", label: "Morning" },
  { key: "AFTERNOON", label: "Afternoon" },
];

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function toIsoDate(d: Date) {
  return d.toISOString().split("T")[0];
}

function getPresetRange(preset: string): { from: string; to: string } {
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
  // today
  return { from: to, to };
}

function StatusBadge({ status }: { status: AttendanceRecord["status"] }) {
  const map = {
    PRESENT: { bg: colors.primaryLight, text: colors.primary, label: "Present" },
    ABSENT: { bg: colors.redLight, text: colors.red, label: "Absent" },
    LATE: { bg: colors.amberLight, text: colors.amber, label: "Late" },
  };
  const s = map[status] ?? map.PRESENT;
  return (
    <View style={[styles.badge, { backgroundColor: s.bg }]}>
      <Text style={[styles.badgeText, { color: s.text }]}>{s.label}</Text>
    </View>
  );
}

function AttendanceItem({ record }: { record: AttendanceRecord }) {
  return (
    <View style={styles.card}>
      <View style={styles.cardLeft}>
        <Text style={styles.cardDate}>{formatDate(record.date)}</Text>
        <View style={styles.slotRow}>
          <Ionicons
            name={record.slot === "MORNING" ? "sunny-outline" : "moon-outline"}
            size={12}
            color={colors.textMuted}
          />
          <Text style={styles.cardSlot}>
            {record.slot === "MORNING" ? "Morning" : "Afternoon"}
          </Text>
        </View>
      </View>
      <StatusBadge status={record.status} />
    </View>
  );
}

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
  const selected = students.find((s) => s.id === selectedId);

  return (
    <>
      <Pressable style={styles.dropdownBtn} onPress={() => setOpen(true)}>
        <Ionicons name="person-outline" size={13} color={colors.parent} />
        <Text style={styles.dropdownBtnText} numberOfLines={1}>
          {selected?.name.split(" ")[0] ?? "Student"}
        </Text>
        <Ionicons name="chevron-down" size={13} color={colors.parent} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdownMenu}>
            {students.map((s) => (
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

export default function AttendanceHistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ student_id: string; student_name: string }>();

  const [students, setStudents] = useState<{ id: string; name: string }[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState(params.student_id ?? "");
  const [selectedStudentName, setSelectedStudentName] = useState(params.student_name ?? "Student");

  const [slotFilter, setSlotFilter] = useState<SlotFilter>("ALL");
  const [preset, setPreset] = useState("month");
  const [dateFrom, setDateFrom] = useState(() => getPresetRange("month").from);
  const [dateTo, setDateTo] = useState(() => getPresetRange("month").to);

  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    parentApi
      .getProfile()
      .then((profile) => {
        const list = profile.students.map((s) => ({ id: s.id, name: s.name }));
        setStudents(list);
        if (!selectedStudentId && list.length > 0) {
          setSelectedStudentId(list[0].id);
          setSelectedStudentName(list[0].name);
        }
      })
      .catch(() => {});
  }, []);

  const loadAttendance = useCallback(
    async (studentId: string, from: string, to: string, slot: SlotFilter) => {
      if (!studentId) return;
      setLoading(true);
      setError(null);
      try {
        const params: Record<string, string | undefined> = {
          date_from: from,
          date_to: to,
        };
        if (slot !== "ALL") params.slot = slot;
        const res = await parentApi.getAttendance(studentId, params);
        setRecords(res.results);
        setSummary(res.summary ?? null);
      } catch {
        setError("Could not load attendance. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    void loadAttendance(selectedStudentId, dateFrom, dateTo, slotFilter);
  }, [selectedStudentId, dateFrom, dateTo, slotFilter, loadAttendance]);

  function applyPreset(p: string) {
    setPreset(p);
    const range = getPresetRange(p);
    setDateFrom(range.from);
    setDateTo(range.to);
  }

  function handleStudentChange(id: string) {
    const s = students.find((st) => st.id === id);
    setSelectedStudentId(id);
    setSelectedStudentName(s?.name ?? "Student");
  }

  const presentPct = summary
    ? Math.round(summary.attendance_percentage)
    : null;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Attendance</Text>
          <Text style={styles.headerSub} numberOfLines={1}>
            {selectedStudentName}
          </Text>
        </View>
        {students.length > 1 && (
          <StudentDropdown
            students={students}
            selectedId={selectedStudentId}
            onChange={handleStudentChange}
          />
        )}
      </View>

      {/* Summary bar */}
      {summary && !loading && (
        <View style={styles.summaryBar}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.present_count}</Text>
            <Text style={styles.summaryLabel}>Present</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={[styles.summaryValue, { color: colors.red }]}>
              {summary.absent_count}
            </Text>
            <Text style={styles.summaryLabel}>Absent</Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text
              style={[
                styles.summaryValue,
                { color: presentPct && presentPct >= 75 ? colors.primary : colors.amber },
              ]}
            >
              {presentPct ?? "--"}%
            </Text>
            <Text style={styles.summaryLabel}>Attendance</Text>
          </View>
        </View>
      )}

      {/* Filters */}
      <View style={styles.filtersWrap}>
        {/* Preset range pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.presetRow}
        >
          {[
            { key: "today", label: "Today" },
            { key: "week", label: "This Week" },
            { key: "month", label: "This Month" },
          ].map((p) => (
            <Pressable
              key={p.key}
              style={[styles.filterPill, preset === p.key && styles.filterPillActive]}
              onPress={() => applyPreset(p.key)}
            >
              <Text style={[styles.filterLabel, preset === p.key && styles.filterLabelActive]}>
                {p.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* Slot filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[styles.presetRow, { paddingTop: 0, paddingBottom: spacing.md }]}
        >
          {SLOT_FILTERS.map((f) => (
            <Pressable
              key={f.key}
              style={[styles.filterPill, slotFilter === f.key && styles.filterPillActive]}
              onPress={() => setSlotFilter(f.key)}
            >
              <Text style={[styles.filterLabel, slotFilter === f.key && styles.filterLabelActive]}>
                {f.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.parent} />
        </View>
      )}

      {!loading && error && (
        <View style={styles.center}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            style={styles.retryBtn}
            onPress={() => loadAttendance(selectedStudentId, dateFrom, dateTo, slotFilter)}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!loading && !error && (
        <FlatList
          data={records}
          keyExtractor={(_, i) => String(i)}
          renderItem={({ item }) => <AttendanceItem record={item} />}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.center}>
              <Ionicons name="calendar-outline" size={40} color={colors.border} />
              <Text style={styles.emptyTitle}>No records found</Text>
              <Text style={styles.emptyBody}>
                Try adjusting the date range or slot filter
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: { marginRight: spacing.md },
  headerCenter: { flex: 1 },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  headerSub: { fontSize: 12, color: colors.textMuted, marginTop: 1 },

  summaryBar: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingVertical: spacing.md,
  },
  summaryItem: { flex: 1, alignItems: "center" },
  summaryValue: {
    fontSize: 22,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  summaryLabel: { fontSize: 11, color: colors.textMuted, marginTop: 2 },
  summaryDivider: { width: 1, backgroundColor: colors.border },

  filtersWrap: {
    backgroundColor: colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  presetRow: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    flexDirection: "row",
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: 999,
    backgroundColor: "#F3F4F6",
  },
  filterPillActive: { backgroundColor: colors.parent },
  filterLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6B7280",
  },
  filterLabelActive: { color: colors.surface },

  listContent: { padding: spacing.lg },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 0.5,
    borderColor: colors.border,
  },
  cardLeft: {},
  cardDate: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  slotRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  cardSlot: { fontSize: 12, color: colors.textMuted },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  badgeText: { fontSize: 12, fontWeight: "600" },

  center: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 60 },
  errorText: { fontSize: 14, color: colors.textMuted, marginBottom: spacing.md },
  retryBtn: {
    borderWidth: 1,
    borderColor: colors.parent,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  retryText: { fontSize: 13, color: colors.parent, fontWeight: "500" },
  emptyTitle: { fontSize: 15, fontWeight: "500", color: colors.textPrimary, marginTop: spacing.md },
  emptyBody: { fontSize: 13, color: colors.textMuted, textAlign: "center", maxWidth: 240, marginTop: spacing.xs },

  dropdownBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.parent,
    paddingVertical: 7,
    paddingHorizontal: spacing.md,
    minWidth: 110,
  },
  dropdownBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.parent,
    maxWidth: 80,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 90,
    paddingRight: spacing.lg,
  },
  dropdownMenu: {
    backgroundColor: colors.surface,
    borderRadius: 8,
    paddingVertical: spacing.sm,
    minWidth: 200,
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
  dropdownItemText: { fontSize: 14, color: colors.textSecondary },
  dropdownItemTextActive: { color: colors.parent, fontWeight: "600" },
});
