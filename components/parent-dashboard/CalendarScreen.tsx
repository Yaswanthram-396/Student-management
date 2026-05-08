import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
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
import { parentApi } from "../../services/parent";
import type { ParentCalendarEvent } from "../../types/parent";
import { HeaderBar, LoadingScreen } from "../shared";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_SIZE = (SCREEN_WIDTH - spacing.lg * 2) / 7;

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const EVENT_TYPE_COLORS: Record<string, string> = {
  HOLIDAY: colors.success,
  EXAM: colors.warning,
  EVENT: "#14B8A6",
};

type CalEvent = { id: string; date: string; name: string; bar: string };

function buildCalDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function formatEventDate(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  if (start === end) {
    return s.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
  }
  return `${s.toLocaleDateString("en-IN", { day: "numeric", month: "short" })} – ${e.toLocaleDateString("en-IN", { day: "numeric", month: "short" })}`;
}

function EventRow({ item }: { item: CalEvent }) {
  return (
    <View style={styles.eventCard}>
      <View style={[styles.eventAccent, { backgroundColor: item.bar }]} />
      <View style={styles.eventBody}>
        <Text style={styles.eventName}>{item.name}</Text>
        <Text style={styles.eventDate}>{item.date}</Text>
      </View>
    </View>
  );
}

export function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [studentId, setStudentId] = useState<string | null>(null);
  const [calEvents, setCalEvents] = useState<ParentCalendarEvent[]>([]);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    parentApi
      .getProfile()
      .then((profile) => {
        if (profile.students.length > 0) {
          setStudentId(profile.students[0].id);
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  useEffect(() => {
    if (!studentId) return;
    const startDate = new Date(year, month, 1).toISOString().split("T")[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split("T")[0];
    parentApi
      .getCalendarEvents(studentId, {
        start_date: startDate,
        end_date: endDate,
      })
      .then((data) => setCalEvents(data.results))
      .catch(() => {});
  }, [studentId, year, month]);

  if (loadingProfile) {
    return <LoadingScreen label="Loading calendar profile..." />;
  }

  const calDays = buildCalDays(year, month);
  const isCurrentMonth =
    month === today.getMonth() && year === today.getFullYear();

  const eventDaysInMonth = new Set(
    calEvents
      .map((e) => new Date(e.start_date))
      .filter((d) => d.getMonth() === month && d.getFullYear() === year)
      .map((d) => d.getDate()),
  );

  const events: CalEvent[] = calEvents.map((e) => ({
    id: e.id,
    date: formatEventDate(e.start_date, e.end_date),
    name: e.title,
    bar: EVENT_TYPE_COLORS[e.event_type] ?? colors.parent,
  }));

  const goBack = () => {
    if (month === 0) {
      setMonth(11);
      setYear((y) => y - 1);
    } else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 11) {
      setMonth(0);
      setYear((y) => y + 1);
    } else setMonth((m) => m + 1);
  };

  const CalHeader = (
    <View style={styles.calHeader}>
      <View style={styles.monthNav}>
        <Pressable style={styles.navBtn} onPress={goBack}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable style={styles.navBtn} onPress={goNext}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, i) => (
          <View key={i} style={[styles.dayCell, { width: CELL_SIZE }]}>
            <Text style={styles.weekDayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      <View style={styles.calGrid}>
        {calDays.map((d, i) => {
          const isToday = isCurrentMonth && d === today.getDate();
          const hasEvent = d !== null && eventDaysInMonth.has(d);
          return (
            <View key={i} style={[styles.dayCell, { width: CELL_SIZE }]}>
              {d !== null && (
                <>
                  <View
                    style={[styles.dayCircle, isToday && styles.todayCircle]}
                  >
                    <Text style={[styles.dayNum, isToday && styles.todayNum]}>
                      {d}
                    </Text>
                  </View>
                  {hasEvent && <View style={styles.eventDot} />}
                </>
              )}
            </View>
          );
        })}
      </View>

      <Text style={styles.sectionLabel}>Upcoming Events</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()} hitSlop={8}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </Pressable>
        }
        center={<Text style={styles.headerTitle}>Academic Calendar</Text>}
      />

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventRow item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={CalHeader}
        ListEmptyComponent={
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No events this month</Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { paddingBottom: spacing.lg },
  calHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.lg,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  navArrow: { fontSize: 20, color: colors.textMuted, lineHeight: 24 },
  monthLabel: {
    ...(typography.h3 as object),
    fontWeight: "600",
    color: colors.textPrimary,
  },
  weekRow: { flexDirection: "row", marginBottom: spacing.xs },
  weekDayLabel: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: colors.textMuted,
    textAlign: "center",
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: spacing.xl },
  dayCell: { alignItems: "center", paddingVertical: 3 },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircle: { backgroundColor: colors.parent },
  dayNum: { ...(typography.caption as object), color: colors.textPrimary },
  todayNum: { color: colors.surface, fontWeight: "600" },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.parent,
    marginTop: 2,
  },
  sectionLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
    marginBottom: spacing.sm,
  },
  eventCard: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: "hidden",
    marginHorizontal: spacing.lg,
  },
  eventAccent: { width: 3 },
  eventBody: { flex: 1, padding: spacing.md, paddingLeft: spacing.lg },
  eventName: {
    ...(typography.body as object),
    fontWeight: "500",
    color: colors.textPrimary,
  },
  eventDate: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  emptyWrap: {
    paddingTop: spacing.xl,
    alignItems: "center",
  },
  emptyText: {
    ...(typography.body as object),
    color: colors.textMuted,
  },
});
