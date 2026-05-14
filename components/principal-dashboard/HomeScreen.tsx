import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
    Dimensions,
    FlatList,
    Pressable,
    StyleSheet,
    Text,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors } from "../../constants/colors";
import { spacing } from "../../constants/spacing";
import { typography } from "../../constants/typography";
import { principalApi } from "../../services/principal";
import { useAuthStore } from "../../store/auth-store";
import type { ClassAttendanceSummary } from "../../types/principal";
import { HeaderBar, LoadingScreen } from "../shared";

const SCREEN_WIDTH = Dimensions.get("window").width;
const HEATMAP_CONTENT_W = SCREEN_WIDTH - spacing.lg * 2 - spacing.md * 2;
const LABEL_W = 48;
const CELL_W = (HEATMAP_CONTENT_W - LABEL_W) / 5;

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri"];
const LEGEND = [
  { color: colors.success, label: "90%+" },
  { color: colors.warning, label: "70–89%" },
  { color: colors.danger, label: "<70%" },
];

// Fallback heatmap when attendance API has no data
const FALLBACK_HEATMAP: number[][] = [
  [92, 85, 78, 94, 88],
  [76, 91, 89, 72, 95],
  [88, 64, 92, 81, 77],
  [95, 88, 71, 90, 86],
  [69, 83, 95, 87, 93],
];

function heatColor(val: number) {
  if (val >= 90) return colors.success;
  if (val >= 70) return colors.warning;
  return colors.danger;
}

type Announcement = { id: string; title: string; date: string };

function audienceLabel(audience: "SCHOOL" | "CLASS" | "SECTION") {
  if (audience === "CLASS") return "Sent to Class";
  if (audience === "SECTION") return "Sent to Section";
  return "Sent to School";
}

const FALLBACK_ANNOUNCEMENTS: Announcement[] = [
  { id: "1", title: "School Closed on 10 May for Elections", date: "3 May 2026" },
  { id: "2", title: "Mid-Term Exam Timetable Released", date: "3 May 2026" },
];

export function HomeScreen() {
  const { currentUser } = useAuthStore();
  const [announcements, setAnnouncements] = useState<Announcement[]>(FALLBACK_ANNOUNCEMENTS);
  const [attendanceClasses, setAttendanceClasses] = useState<ClassAttendanceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const schoolName = currentUser?.school.name?.trim() || "School";
  const schoolInitials = schoolName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  useEffect(() => {
    const today = new Date().toISOString().split("T")[0];

    Promise.allSettled([
      principalApi.getAnnouncements(),
      principalApi.getAttendanceDailySummary({ date: today }),
    ]).then(([annResult, attResult]) => {
      if (annResult.status === "fulfilled" && annResult.value.results.length > 0) {
        setAnnouncements(
          annResult.value.results.slice(0, 2).map((a) => ({
            id: String(a.id),
            title: a.title,
            date: `${audienceLabel(a.audience)} · ${new Date(a.published_at).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}`,
          })),
        );
      }
      if (attResult.status === "fulfilled") {
        setAttendanceClasses(attResult.value.classes);
      }
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <LoadingScreen label="Loading school overview..." />;
  }

  // Build heatmap: up to 5 classes × last 5 days (only today's % per class, rest as fallback)
  const heatmapRows: number[][] = attendanceClasses.length > 0
    ? attendanceClasses.slice(0, 5).map((cls) =>
        DAYS.map((_, di) =>
          di === 4 ? Math.round(cls.attendance_percentage) : FALLBACK_HEATMAP[0][di]
        )
      )
    : FALLBACK_HEATMAP;

  const heatmapLabels = attendanceClasses.length > 0
    ? attendanceClasses.slice(0, 5).map((c) => c.class_name.replace("Class ", "Cls "))
    : FALLBACK_HEATMAP.map((_, i) => `Class ${i + 1}`);

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        left={
          <View style={styles.logoCircle}>
            <Text style={styles.logoText}>{schoolInitials || "SC"}</Text>
          </View>
        }
        center={<Text style={styles.headerTitle}>{schoolName}</Text>}
        right={
          <Pressable
            onPress={() => router.push("/(tabs)/principal/calendar")}
            hitSlop={8}
          >
            <Ionicons
              name="calendar-outline"
              size={22}
              color={colors.textPrimary}
            />
          </Pressable>
        }
      />

      <FlatList
        data={announcements}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        renderItem={({ item }) => (
          <View style={styles.annCard}>
            <Text style={styles.annTitle}>{item.title}</Text>
            <Text style={styles.annMeta}>{item.date}</Text>
          </View>
        )}
        ListHeaderComponent={
          <View style={styles.listHeader}>
            <View style={styles.quickActionsRow}>
              <Pressable
                style={styles.quickActionCard}
                onPress={() => router.push('/(tabs)/principal/results' as any)}
              >
                <Ionicons name="bar-chart-outline" size={18} color={colors.principal} />
                <Text style={styles.quickActionTitle}>Exam Analytics</Text>
                <Text style={styles.quickActionMeta}>Create exams, upload results, and open analytics</Text>
              </Pressable>
              <Pressable
                style={styles.quickActionCard}
                onPress={() => router.push('/(tabs)/principal/results' as any)}
              >
                <Ionicons name="grid-outline" size={18} color={colors.principal} />
                <Text style={styles.quickActionTitle}>Analytics Dashboard</Text>
                <Text style={styles.quickActionMeta}>Open the same exam flow for class, section, and student drill-downs</Text>
              </Pressable>
            </View>

            <View style={styles.heatmapSection}>
              <Text style={styles.sectionLabel}>Class Attendance This Week</Text>
              <View style={styles.heatmapCard}>
                <View style={styles.heatmapHeaderRow}>
                  <View style={{ width: LABEL_W }} />
                  {DAYS.map((d) => (
                    <View key={d} style={[styles.heatmapHeaderCell, { width: CELL_W }]}>
                      <Text style={styles.heatmapDayLabel}>{d}</Text>
                    </View>
                  ))}
                </View>
                {heatmapRows.map((row, ri) => {
                  const cls = attendanceClasses[ri];
                  return (
                    <Pressable
                      key={ri}
                      style={styles.heatmapRow}
                      onPress={() => cls && router.push(
                        `/(tabs)/principal/class-attendance?class_id=${cls.class_id}`
                      )}
                    >
                      <Text style={[styles.heatmapRowLabel, { width: LABEL_W }]}>
                        {heatmapLabels[ri]}
                      </Text>
                      {row.map((val, ci) => (
                        <View
                          key={ci}
                          style={[
                            styles.heatmapCell,
                            { width: CELL_W - 4, backgroundColor: heatColor(val) },
                          ]}
                        >
                          <Text style={styles.heatmapCellText}>{val}%</Text>
                        </View>
                      ))}
                    </Pressable>
                  );
                })}
                <View style={styles.heatmapLegend}>
                  {LEGEND.map((l) => (
                    <View key={l.label} style={styles.legendItem}>
                      <View style={[styles.legendDot, { backgroundColor: l.color }]} />
                      <Text style={styles.legendLabel}>{l.label}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>

            <Text style={styles.sectionLabel}>Recent Announcements</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  logoCircle: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: "#14B8A6",
    alignItems: "center", justifyContent: "center",
  },
  logoText: { ...(typography.label as object), color: colors.surface, fontWeight: "700" },
  listContent: { padding: spacing.lg, gap: spacing.lg },
  listHeader: { gap: spacing.lg },
  quickActionsRow: { flexDirection: 'row', gap: spacing.sm },
  quickActionCard: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    padding: spacing.md,
    gap: spacing.xs,
  },
  quickActionTitle: {
    ...(typography.body as object),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  quickActionMeta: {
    ...(typography.caption as object),
    color: colors.textMuted,
  },
  heatmapSection: { gap: spacing.sm },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted },
  heatmapCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md,
  },
  heatmapHeaderRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  heatmapHeaderCell: { alignItems: "center" },
  heatmapDayLabel: { ...(typography.caption as object), color: colors.textMuted },
  heatmapRow: { flexDirection: "row", alignItems: "center", marginBottom: spacing.xs },
  heatmapRowLabel: { ...(typography.caption as object), color: colors.textSecondary },
  heatmapCell: {
    height: 26, marginHorizontal: 2, borderRadius: 6,
    alignItems: "center", justifyContent: "center",
  },
  heatmapCellText: { fontSize: 10, fontWeight: "600", color: colors.surface },
  heatmapLegend: { flexDirection: "row", gap: spacing.md, marginTop: spacing.sm },
  legendItem: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  legendDot: { width: 10, height: 10, borderRadius: 2 },
  legendLabel: { ...(typography.caption as object), color: colors.textMuted },
  annCard: {
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, padding: spacing.md, paddingHorizontal: spacing.lg,
  },
  annTitle: { ...(typography.body as object), fontWeight: "500", color: colors.textPrimary },
  annMeta: { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
});
