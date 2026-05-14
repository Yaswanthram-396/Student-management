import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Easing,
    FlatList,
    PanResponder,
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

const EVENT_FILTERS: (ParentCalendarEvent["event_type"] | "ALL")[] = [
  "ALL",
  "HOLIDAY",
  "EXAM",
  "EVENT",
];

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

function eventDaysInMonth(
  events: ParentCalendarEvent[],
  year: number,
  month: number,
): Record<number, string> {
  const days: Record<number, string> = {};
  const monthStart = toDateStr(year, month, 1);
  const monthEnd = toDateStr(year, month, daysInMonth(year, month));
  for (const ev of events) {
    if (ev.start_date <= monthEnd && ev.end_date >= monthStart) {
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        if (d.getFullYear() === year && d.getMonth() === month) {
          days[d.getDate()] = EVENT_TYPE_COLORS[ev.event_type];
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
  return `${s.toLocaleDateString("en-IN", opts)} - ${e.toLocaleDateString("en-IN", opts)}`;
}

function EventRow({ item }: { item: ParentCalendarEvent }) {
  const color = EVENT_TYPE_COLORS[item.event_type];
  return (
    <View style={styles.eventCard}>
      <View style={[styles.eventAccent, { backgroundColor: color }]} />
      <View style={styles.eventBody}>
        <View style={styles.eventTopRow}>
          <Text style={styles.eventName} numberOfLines={1}>
            {item.title}
          </Text>
          <View
            style={[styles.eventTypePill, { backgroundColor: color + "20" }]}
          >
            <Text style={[styles.eventTypeText, { color }]}>
              {EVENT_TYPE_LABELS[item.event_type]}
            </Text>
          </View>
        </View>
        <Text style={styles.eventDate}>
          {formatDateRange(item.start_date, item.end_date)}
        </Text>
        {!!item.description && (
          <Text style={styles.eventDesc} numberOfLines={2}>
            {item.description}
          </Text>
        )}
      </View>
    </View>
  );
}

export function CalendarScreen() {
  const router = useRouter();
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);
  const [filterType, setFilterType] = useState<ParentCalendarEvent["event_type"] | null>(null);

  const [studentId, setStudentId] = useState<string | null>(null);
  const [events, setEvents] = useState<ParentCalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventsLoading, setEventsLoading] = useState(false);
  const monthAnim = useRef(new Animated.Value(0)).current;

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
  const fetchEvents = useCallback((y: number, m: number, sid: string) => {
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
  }, []);

  useEffect(() => {
    if (studentId) fetchEvents(year, month, studentId);
  }, [studentId, year, month, fetchEvents]);

  const animateMonth = (direction: -1 | 1) => {
    monthAnim.setValue(direction * 38);
    Animated.timing(monthAnim, {
      toValue: 0,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  const shiftMonth = (direction: -1 | 1) => {
    animateMonth(direction);
    setSelectedDate(null);
    setMonth((currentMonth) => {
      if (direction === -1 && currentMonth === 0) {
        setYear((currentYear) => currentYear - 1);
        return 11;
      }
      if (direction === 1 && currentMonth === 11) {
        setYear((currentYear) => currentYear + 1);
        return 0;
      }
      return currentMonth + direction;
    });
  };
  const goBack = () => shiftMonth(-1);
  const goNext = () => shiftMonth(1);

  const swipeResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        Math.abs(gesture.dx) > Math.abs(gesture.dy) &&
        Math.abs(gesture.dx) > 12,
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx > 40) goBack();
        if (gesture.dx < -40) goNext();
      },
    }),
  ).current;

  const calDays = buildCalDays(year, month);
  const eventDays = eventDaysInMonth(events, year, month);
  const isCurrentMonth =
    month === today.getMonth() && year === today.getFullYear();
  const filteredEvents = events.filter((event) => {
    if (filterType && event.event_type !== filterType) return false;
    if (!selectedDate) return true;
    const selected = toDateStr(year, month, selectedDate);
    return event.start_date <= selected && event.end_date >= selected;
  });

  const CalHeader = (
    <View style={styles.calHeader} {...swipeResponder.panHandlers}>
      <View style={styles.monthNav}>
        <Pressable style={styles.navBtn} onPress={goBack}>
          <Ionicons
            name="chevron-back"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
        <Text style={styles.monthLabel}>
          {MONTH_NAMES[month]} {year}
        </Text>
        <Pressable style={styles.navBtn} onPress={goNext}>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={colors.textSecondary}
          />
        </Pressable>
      </View>

      <Animated.View
        style={[
          styles.calendarCard,
          {
            opacity: monthAnim.interpolate({
              inputRange: [-38, 0, 38],
              outputRange: [0.72, 1, 0.72],
            }),
            transform: [{ translateX: monthAnim }],
          },
        ]}
      >
        <View style={styles.weekRow}>
          {WEEK_DAYS.map((d, i) => (
            <Text key={i} style={styles.weekDayLabel}>{d}</Text>
          ))}
        </View>

        <View style={styles.calGrid}>
          {calDays.map((d, i) => {
            const isToday = isCurrentMonth && d === today.getDate();
            const isSelected = selectedDate === d;
            const eventColor = d !== null ? eventDays[d] : undefined;
            return (
              <View key={i} style={styles.dayCell}>
                {d !== null && (
                  <Pressable
                    style={[
                      styles.dayCircle,
                      isToday && !isSelected && styles.todayCircle,
                      isSelected && styles.selectedDayCircle,
                    ]}
                    onPress={() => setSelectedDate((prev) => (prev === d ? null : d))}
                  >
                    <Text
                      style={[
                        styles.dayNum,
                        isToday && !isSelected && styles.todayNum,
                        isSelected && styles.selectedDayNum,
                      ]}
                    >
                      {d}
                    </Text>
                    {!!eventColor && (
                      <View
                        style={[
                          styles.eventDot,
                          { backgroundColor: isSelected ? colors.surface : eventColor },
                        ]}
                      />
                    )}
                  </Pressable>
                )}
              </View>
            );
          })}
        </View>
      </Animated.View>

      <View style={styles.filterChipRow}>
        {EVENT_FILTERS.map((type) => {
          const active = type === "ALL" ? !filterType : filterType === type;
          const color = type === "ALL" ? colors.parent : EVENT_TYPE_COLORS[type];
          const label = type === "ALL" ? "All" : EVENT_TYPE_LABELS[type];
          return (
            <Pressable
              key={type}
              style={[
                styles.filterChip,
                { borderColor: color },
                active && { backgroundColor: color },
              ]}
              onPress={() => setFilterType(type === "ALL" ? null : type)}
            >
              <Text style={[styles.filterChipText, { color: active ? colors.surface : color }]}>
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.sectionRow}>
        <Text style={styles.sectionLabel}>
          {selectedDate
            ? `Events on ${selectedDate} ${MONTH_NAMES[month]}`
            : "Events This Month"}
        </Text>
        {eventsLoading && (
          <ActivityIndicator size="small" color={colors.parent} />
        )}
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container} edges={["top"]}>
        <HeaderBar
          left={
            <Pressable onPress={() => router.back()}>
              <Ionicons
                name="arrow-back"
                size={20}
                color={colors.textPrimary}
              />
            </Pressable>
          }
          center={<Text style={styles.headerTitle}>Academic Calendar</Text>}
        />
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={colors.parent} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <HeaderBar
        left={
          <Pressable onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={20} color={colors.textPrimary} />
          </Pressable>
        }
        center={<Text style={styles.headerTitle}>Academic Calendar</Text>}
      />

      <FlatList
        data={filteredEvents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventRow item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={CalHeader}
        ListEmptyComponent={
          eventsLoading ? (
            <View style={styles.loadingWrap}>
              <ActivityIndicator color={colors.parent} />
            </View>
          ) : (
            <View style={styles.emptyWrap}>
              <Text style={styles.emptyText}>
                {selectedDate ? "No events on this day" : "No events this month"}
              </Text>
            </View>
          )
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
  calendarCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
    borderWidth: 0.5,
    borderColor: colors.border,
    shadowColor: colors.textPrimary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  weekRow: { flexDirection: "row", marginBottom: spacing.xs },
  weekDayLabel: {
    ...(typography.caption as object),
    fontWeight: "500",
    color: colors.textMuted,
    textAlign: "center",
    flex: 1,
    paddingVertical: spacing.sm,
  },
  calGrid: { flexDirection: "row", flexWrap: "wrap" },
  dayCell: {
    width: `${100 / 7}%`,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    minHeight: 42,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  todayCircle: { backgroundColor: colors.primaryLight },
  selectedDayCircle: { backgroundColor: colors.parent },
  dayNum: { ...(typography.caption as object), color: colors.textPrimary },
  todayNum: { color: colors.parent, fontWeight: "600" },
  selectedDayNum: { color: colors.surface, fontWeight: "700" },
  eventDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.parent,
    marginTop: 2,
  },
  filterChipRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  filterChip: {
    borderWidth: 1.2,
    borderRadius: 999,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: colors.surface,
  },
  filterChipText: {
    ...(typography.caption as object),
    fontWeight: "600",
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
  emptyWrap: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    alignItems: "center",
  },
  emptyText: { ...(typography.body as object), color: colors.textMuted },
});
