import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { calendarApi, type CalendarEvent, type CalendarEventType } from '../services/calendar';

const ACCENT = '#534AB7'; // principal purple for calendar (matches screenshot)

const EVENT_CONFIG: Record<CalendarEventType, { color: string; bg: string; label: string }> = {
  HOLIDAY: { color: '#DC2626', bg: '#FEE2E2', label: 'Holiday' },
  EXAM:    { color: '#D97706', bg: '#FEF3C7', label: 'Exam'    },
  EVENT:   { color: '#534AB7', bg: '#F3F0FF', label: 'Event'   },
};

const DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function firstDayOfMonth(year: number, month: number) {
  return new Date(year, month, 1).getDay(); // 0 = Sunday
}

// Returns which dates (1-based) have events, mapped to their event type color
function buildDotMap(events: CalendarEvent[], year: number, month: number) {
  const map: Record<number, string> = {};
  for (const ev of events) {
    const start = new Date(ev.start_date);
    const end = new Date(ev.end_date);
    const cfg = EVENT_CONFIG[ev.event_type];
    // Mark every date in the event range that falls in this month
    const cur = new Date(start);
    while (cur <= end) {
      if (cur.getFullYear() === year && cur.getMonth() === month) {
        map[cur.getDate()] = cfg.color;
      }
      cur.setDate(cur.getDate() + 1);
    }
  }
  return map;
}

function formatEventDate(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts = { day: 'numeric' as const, month: 'short' as const };
  if (start === end) return s.toLocaleDateString('en-IN', opts);
  return `${s.toLocaleDateString('en-IN', opts)} – ${e.toLocaleDateString('en-IN', opts)}`;
}

export default function TeacherCalendarScreen() {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDate, setSelectedDate] = useState<number | null>(null);

  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterType, setFilterType] = useState<CalendarEventType | null>(null);

  useEffect(() => {
    fetchEvents();
    setSelectedDate(null);
  }, [year, month]);

  async function fetchEvents() {
    setLoading(true);
    setError('');
    const startDate = toISO(new Date(year, month, 1));
    const endDate = toISO(new Date(year, month + 1, 0));
    try {
      const data = await calendarApi.getEvents({ start_date: startDate, end_date: endDate });
      setEvents(data.results);
    } catch (err: any) {
      setError(err.details ?? 'Failed to load calendar events.');
    } finally {
      setLoading(false);
    }
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  }

  const dotMap = buildDotMap(events, year, month);
  const totalDays = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);

  // Build calendar grid (6 rows × 7 cols)
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= totalDays; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  const isToday = (d: number) =>
    d === today.getDate() && month === today.getMonth() && year === today.getFullYear();

  // Filter events for display
  const filteredEvents = events.filter(ev => {
    if (filterType && ev.event_type !== filterType) return false;
    if (selectedDate) {
      const sel = new Date(year, month, selectedDate);
      const start = new Date(ev.start_date);
      const end = new Date(ev.end_date);
      return sel >= start && sel <= end;
    }
    return true;
  });

  const eventTypes: CalendarEventType[] = ['HOLIDAY', 'EXAM', 'EVENT'];

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      {/* Nav bar */}
      <View style={styles.navbar}>
        <Pressable
          style={({ pressed }) => [styles.backBtn, pressed && styles.backBtnPressed]}
          onPress={() => router.back()}
          hitSlop={8}
        >
          <Ionicons name="arrow-back" size={22} color="#111111" />
        </Pressable>
        <Text style={styles.navTitle}>Academic Calendar</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {/* Month navigator */}
        <View style={styles.monthNav}>
          <Pressable
            style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
            onPress={prevMonth}
            hitSlop={10}
          >
            <Ionicons name="chevron-back" size={20} color="#444444" />
          </Pressable>
          <Text style={styles.monthTitle}>{MONTHS[month]} {year}</Text>
          <Pressable
            style={({ pressed }) => [styles.navArrow, pressed && styles.navArrowPressed]}
            onPress={nextMonth}
            hitSlop={10}
          >
            <Ionicons name="chevron-forward" size={20} color="#444444" />
          </Pressable>
        </View>

        {/* Calendar grid */}
        <View style={styles.calendarCard}>
          {/* Day headers */}
          <View style={styles.weekRow}>
            {DAYS.map((d, i) => (
              <Text key={i} style={styles.dayHeader}>{d}</Text>
            ))}
          </View>

          {/* Date cells */}
          {Array.from({ length: cells.length / 7 }, (_, row) => (
            <View key={row} style={styles.weekRow}>
              {cells.slice(row * 7, row * 7 + 7).map((day, col) => {
                if (!day) return <View key={col} style={styles.cell} />;
                const dot = dotMap[day];
                const isSel = selectedDate === day;
                const itIsToday = isToday(day);
                return (
                  <Pressable
                    key={col}
                    style={[
                      styles.cell,
                      isSel && { backgroundColor: ACCENT, borderRadius: 20 },
                      itIsToday && !isSel && styles.todayCell,
                    ]}
                    onPress={() => setSelectedDate(prev => prev === day ? null : day)}
                  >
                    <Text style={[
                      styles.dayText,
                      isSel && styles.dayTextSelected,
                      itIsToday && !isSel && styles.todayText,
                    ]}>
                      {day}
                    </Text>
                    {dot && (
                      <View style={[styles.dot, { backgroundColor: isSel ? '#FFFFFF' : dot }]} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          ))}
        </View>

        {/* Filter chips */}
        <View style={styles.filterRow}>
          <Pressable
            style={[styles.filterChip, !filterType && styles.filterChipAll]}
            onPress={() => setFilterType(null)}
          >
            <Text style={[styles.filterChipText, !filterType && { color: '#FFFFFF' }]}>All</Text>
          </Pressable>
          {eventTypes.map(type => {
            const cfg = EVENT_CONFIG[type];
            const active = filterType === type;
            return (
              <Pressable
                key={type}
                style={[
                  styles.filterChip,
                  { borderColor: cfg.color },
                  active && { backgroundColor: cfg.color },
                ]}
                onPress={() => setFilterType(active ? null : type)}
              >
                <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : cfg.color }]}>
                  {cfg.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {/* Section title */}
        <Text style={styles.sectionLabel}>
          {selectedDate
            ? `Events on ${selectedDate} ${MONTHS[month]}`
            : `Events this month`}
        </Text>

        {/* Loading */}
        {loading && (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.stateText}>Loading events…</Text>
          </View>
        )}

        {/* Error */}
        {!loading && !!error && (
          <View style={styles.errorCard}>
            <View style={styles.errorIconWrap}>
              <Ionicons name="alert-circle-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.errorTitle}>Couldn't load events</Text>
            <Text style={styles.errorBody}>{error}</Text>
            <Pressable style={styles.retryBtn} onPress={fetchEvents}>
              <Ionicons name="refresh-outline" size={15} color="#FFFFFF" />
              <Text style={styles.retryText}>Try Again</Text>
            </Pressable>
          </View>
        )}

        {/* Empty */}
        {!loading && !error && filteredEvents.length === 0 && (
          <View style={styles.centered}>
            <Ionicons name="calendar-outline" size={48} color="#CCCCCC" />
            <Text style={styles.emptyTitle}>
              {selectedDate ? 'No events on this day' : 'No events this month'}
            </Text>
            {selectedDate && (
              <Pressable onPress={() => setSelectedDate(null)}>
                <Text style={styles.clearSel}>Show all month events</Text>
              </Pressable>
            )}
          </View>
        )}

        {/* Event cards */}
        {!loading && !error && filteredEvents.map(ev => {
          const cfg = EVENT_CONFIG[ev.event_type];
          return (
            <View key={ev.id} style={styles.eventCard}>
              <View style={[styles.eventStripe, { backgroundColor: cfg.color }]} />
              <View style={styles.eventBody}>
                <View style={styles.eventTopRow}>
                  <View style={[styles.eventTypeBadge, { backgroundColor: cfg.bg }]}>
                    <Text style={[styles.eventTypeText, { color: cfg.color }]}>
                      {cfg.label}
                    </Text>
                  </View>
                  <Text style={styles.eventDate}>
                    {formatEventDate(ev.start_date, ev.end_date)}
                  </Text>
                </View>
                <Text style={styles.eventTitle}>{ev.title}</Text>
                {!!ev.description && (
                  <Text style={styles.eventDesc} numberOfLines={2}>{ev.description}</Text>
                )}
                {ev.visible_to.length > 0 && (
                  <View style={styles.audienceRow}>
                    <Ionicons name="people-outline" size={11} color="#AAAAAA" />
                    <Text style={styles.audienceText}>{ev.visible_to.join(', ')}</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F4F8' },

  navbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#FFFFFF', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: '#EEEEEE',
  },
  navTitle: { fontSize: 16, fontWeight: '700', color: '#111111' },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  backBtnPressed: { backgroundColor: '#F0F0F0' },

  scroll: { paddingBottom: 24 },

  // Month navigator
  monthNav: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 18,
  },
  monthTitle: { fontSize: 18, fontWeight: '700', color: '#111111' },
  navArrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navArrowPressed: { backgroundColor: '#F0F0F0' },

  // Calendar grid
  calendarCard: {
    backgroundColor: '#FFFFFF', marginHorizontal: 16,
    borderRadius: 16, paddingVertical: 8, paddingHorizontal: 8,
    borderWidth: 0.5, borderColor: '#EEEEEE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05, shadowRadius: 6, elevation: 2,
  },
  weekRow: { flexDirection: 'row' },
  dayHeader: {
    flex: 1, textAlign: 'center',
    fontSize: 12, fontWeight: '600', color: '#AAAAAA',
    paddingVertical: 8,
  },
  cell: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: 6, minHeight: 44,
  },
  todayCell: { backgroundColor: '#F3F0FF', borderRadius: 20 },
  dayText: { fontSize: 14, fontWeight: '500', color: '#111111' },
  dayTextSelected: { color: '#FFFFFF', fontWeight: '700' },
  todayText: { color: ACCENT, fontWeight: '700' },
  dot: { width: 5, height: 5, borderRadius: 3, marginTop: 2 },

  // Filter chips
  filterRow: {
    flexDirection: 'row', gap: 8,
    paddingHorizontal: 16, paddingTop: 16, paddingBottom: 4,
  },
  filterChip: {
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#DDDDDD',
  },
  filterChipAll: { backgroundColor: ACCENT, borderColor: ACCENT },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#888888' },

  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#AAAAAA',
    textTransform: 'uppercase', letterSpacing: 0.8,
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 10,
  },

  // States
  centered: { alignItems: 'center', paddingVertical: 40, gap: 10 },
  stateText: { fontSize: 14, color: '#888888' },
  errorCard: {
    backgroundColor: '#FFFFFF', borderRadius: 16, margin: 16, padding: 24,
    alignItems: 'center', gap: 8, borderWidth: 1, borderColor: '#FFCDD2',
  },
  errorIconWrap: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center' },
  errorTitle: { fontSize: 15, fontWeight: '600', color: '#111111' },
  errorBody: { fontSize: 13, color: '#888888', textAlign: 'center' },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#DC2626', borderRadius: 10, paddingHorizontal: 18, paddingVertical: 9, marginTop: 4 },
  retryText: { color: '#FFFFFF', fontWeight: '600', fontSize: 13 },
  emptyTitle: { fontSize: 15, fontWeight: '600', color: '#444444' },
  clearSel: { fontSize: 13, color: ACCENT, fontWeight: '600', marginTop: 4 },

  // Event card
  eventCard: {
    flexDirection: 'row', backgroundColor: '#FFFFFF',
    borderRadius: 14, marginHorizontal: 16, marginBottom: 10,
    overflow: 'hidden', borderWidth: 0.5, borderColor: '#EEEEEE',
    shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04, shadowRadius: 4, elevation: 1,
  },
  eventStripe: { width: 4 },
  eventBody: { flex: 1, padding: 14 },
  eventTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  eventTypeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  eventTypeText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  eventDate: { fontSize: 12, color: '#888888', fontWeight: '500' },
  eventTitle: { fontSize: 14, fontWeight: '600', color: '#111111', marginBottom: 4 },
  eventDesc: { fontSize: 12, color: '#666666', lineHeight: 17, marginBottom: 6 },
  audienceRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  audienceText: { fontSize: 11, color: '#AAAAAA' },
});
