import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
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
import { HeaderBar } from "../shared";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CELL_SIZE = (SCREEN_WIDTH - spacing.lg * 2) / 7;

const WEEK_DAYS = ["S", "M", "T", "W", "T", "F", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const EVENT_TYPE_COLORS: Record<ParentCalendarEvent["event_type"], string> = {
  HOLIDAY: colors.danger,
  EXAM: colors.warning,
  EVENT: colors.success,
};

const EVENT_TYPE_LABELS: Record<ParentCalendarEvent["event_type"], string> = {
  HOLIDAY: "Holiday",
  EXAM: "Exam",
  EVENT: "Event",
};

function buildCalDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function toDateStr(year: number, month: number, day: number): string {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function eventDaysInMonth(events: ParentCalendarEvent[], year: number, month: number): Set<number> {
  const days = new Set<number>();
  const monthStart = toDateStr(year, month, 1);
  const monthEnd = toDateStr(year, month, daysInMonth(year, month));
  for (const ev of events) {
    if (ev.start_date <= monthEnd && ev.end_date >= monthStart) {
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          days.add(d.getDate());
        }
      }
    }
  }
  return days;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short" };
  if (start === end) return s.toLocaleDateString("en-IN", opts);
  return `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)}`;
}

function EventRow({ item }: { item: ParentCalendarEvent }) {
  const color = EVENT_TYPE_COLORS[item.event_type];
  return (
    <View style={styles.eventCard}>
      <View style={[styles.eventAccent, { backgroundColor: color }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTopRow}>
          <Text style={styles.eventName} numberOfLines={1}>{item.title}</Text>
          <View style={[styles.eventTypePill, { backgroundColor: color + "20" }]}>
            <Text style={[styles.eventTypeText, { color }]}>
              {EVENT_TYPE_LABELS[item.event_type]}
            </Text>
          </View>
        </View>
        <Text style={styles.eventDate}>
          {formatDateRange(item.start_date, item.end_date)}
        </Text>
        {!!item.description && (
          <Text style={styles.eventDesc} numberOfLines={2}>{item.description}</Text>
        )}
      </View>
    </View>
  );
}

export function CalendarScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());

  const [studentId, setStudentId] = useState<string | null>(null);
  const [events, setEvents] = useState<ParentCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);

  // Load first student ID from profile once
  useEffect(() => {
    parentApi
      .getProfile()
      .then((profile) => {
        setStudentId(profile.students[0]?.id ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Fetch events whenever studentId or month/year changes
  const fetchEvents = useCallback(
    (y: number, m: number, sid: string) => {
      const lastDay = daysInMonth(y, m);
      setEventsLoading(true);
      parentApi
        .getCalendarEvents(sid, {
          start_date: toDateStr(y, m, 1),
          end_date: toDateStr(y, m, lastDay),
        })
        .then((res) => setEvents(res.results))
        .catch(() => setEvents([]))
        .finally(() => setEventsLoading(false));
    },
    [],
  );

  useEffect(() => {
    if (studentId) fetchEvents(year, month, studentId);
  }, [studentId, year, month, fetchEvents]);

  const goBack = () => {
    if (month === 0) { setMonth(11); setYear((y) => y - 1); }
    else setMonth((m) => m - 1);
  };
  const goNext = () => {
    if (month === 11) { setMonth(0); setYear((y) => y + 1); }
    else setMonth((m) => m + 1);
  };

  const calDays = buildCalDays(year, month);
  const eventDays = eventDaysInMonth(events, year, month);
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();

  const CalHeader = (
    <View style={styles.calHeader}>
      <View style={styles.monthNav}>
        <Pressable style={styles.navBtn} onPress={goBack}>
          <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        </Pressable>
        <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
        <Pressable style={styles.navBtn} onPress={goNext}>
          <Ionicons name="chevron-forward" size={18} color={colors.textSecondary} />
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
          const hasEvent = d !== null && eventDays.has(d);
          return (
            <View key={i} style={[styles.dayCell, { width: CELL_SIZE }]}>
              {d !== null && (
                <>
                  <View style={[styles.dayCircle, isToday && styles.todayCircle]}>
                    <Text style={[styles.dayNum, isToday && styles.todayNum]}>{d}</Text>
                  </View>
                  {hasEvent && <View style={styles.eventDot} />}
                </>
              )}
            </View>
          );
        })}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>Events This Month</Text>
        {eventsLoading && <ActivityIndicator size="small" color={colors.parent} />}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBar center={<Text style={styles.headerTitle}>Academic Calendar</Text>} />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.parent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar center={<Text style={styles.headerTitle}>Academic Calendar</Text>} />

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventRow item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={CalHeader}
        ListEmptyComponent={
          !eventsLoading ? (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>No events this month</Text>
            </View>
          ) : null
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  loadingWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: spacing.xxxl },

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
  sectionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.sm,
  },
  sectionLabel: {
    ...(typography.label as object),
    color: colors.textMuted,
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
  eventTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.xs,
  },
  eventName: {
    ...(typography.body as object),
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
    marginRight: spacing.sm,
  },
  eventTypePill: {
    borderRadius: 999,
    paddingVertical: 2,
    paddingHorizontal: spacing.sm,
  },
  eventTypeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  eventDate: {
    ...(typography.caption as object),
    color: colors.textMuted,
  },
  eventDesc: {
    ...(typography.caption as object),
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  emptyWrap: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, alignItems: "center" },
  emptyText: { ...(typography.body as object), color: colors.textMuted },
});
