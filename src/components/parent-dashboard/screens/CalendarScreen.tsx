import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  TextInput,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../constants/colors';
import { spacing } from '../../../constants/spacing';
import { typography } from '../../../constants/typography';
import { HeaderBar, BottomSheet } from '../../shared';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - spacing.lg * 2) / 7;

const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const FIXED_TODAY = { day: 5, month: 4, year: 2026 };
const EVENT_DATES = [10, 15, 22, 25];

type CalEvent = { id: string; date: string; name: string; bar: string };

const INITIAL_EVENTS: CalEvent[] = [
  { id: '1', date: '10 May', name: 'Parent-Teacher Meeting',    bar: colors.success  },
  { id: '2', date: '15 May', name: 'Mid-Term Exams Begin',      bar: colors.warning  },
  { id: '3', date: '22 May', name: 'Annual Sports Day',         bar: '#14B8A6'       },
  { id: '4', date: '25 May', name: 'School Closes for Summer',  bar: colors.danger   },
];

function buildCalDays(year: number, month: number): (number | null)[] {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const days: (number | null)[] = Array(firstDay).fill(null);
  for (let d = 1; d <= daysInMonth; d++) days.push(d);
  return days;
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
  const [year, setYear]           = useState(2026);
  const [month, setMonth]         = useState(4);
  const [events, setEvents]       = useState<CalEvent[]>(INITIAL_EVENTS);
  const [showAdd, setShowAdd]     = useState(false);
  const [eventTitle, setEventTitle] = useState('');

  const calDays = buildCalDays(year, month);
  const isFixedMonth = month === FIXED_TODAY.month && year === FIXED_TODAY.year;

  const goBack = () => {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  };
  const goNext = () => {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  };

  const handleSave = () => {
    if (eventTitle.trim()) {
      setEvents(prev => [
        ...prev,
        { id: String(Date.now()), date: 'Upcoming', name: eventTitle.trim(), bar: colors.principal },
      ]);
    }
    setEventTitle('');
    setShowAdd(false);
  };

  const CalHeader = (
    <View style={styles.calHeader}>
      {/* Month nav */}
      <View style={styles.monthNav}>
        <Pressable style={styles.navBtn} onPress={goBack}>
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{MONTH_NAMES[month]} {year}</Text>
        <Pressable style={styles.navBtn} onPress={goNext}>
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* Week day headers */}
      <View style={styles.weekRow}>
        {WEEK_DAYS.map((d, i) => (
          <View key={i} style={[styles.dayCell, { width: CELL_SIZE }]}>
            <Text style={styles.weekDayLabel}>{d}</Text>
          </View>
        ))}
      </View>

      {/* Calendar grid */}
      <View style={styles.calGrid}>
        {calDays.map((d, i) => {
          const isToday = isFixedMonth && d === FIXED_TODAY.day;
          const hasEvent = isFixedMonth && d !== null && EVENT_DATES.includes(d);
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

      <Text style={styles.sectionLabel}>Upcoming Events</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Academic Calendar</Text>}
        right={
          <Pressable onPress={() => setShowAdd(true)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.parent} />
          </Pressable>
        }
      />

      <FlatList
        data={events}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <EventRow item={item} />}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={CalHeader}
      />

      <BottomSheet visible={showAdd} onClose={() => setShowAdd(false)}>
        <Text style={styles.sheetTitle}>Add Event</Text>
        <TextInput
          style={styles.eventInput}
          value={eventTitle}
          onChangeText={setEventTitle}
          placeholder="Event name..."
          placeholderTextColor={colors.textMuted}
          returnKeyType="done"
          onSubmitEditing={handleSave}
        />
        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save</Text>
        </Pressable>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { paddingBottom: spacing.lg },
  // Calendar header section
  calHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  monthNav: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  navBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 0.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navArrow: { fontSize: 20, color: colors.textMuted, lineHeight: 24 },
  monthLabel: {
    ...(typography.h3 as object),
    fontWeight: '600',
    color: colors.textPrimary,
  },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDayLabel: {
    ...(typography.caption as object),
    fontWeight: '500',
    color: colors.textMuted,
    textAlign: 'center',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  dayCell: { alignItems: 'center', paddingVertical: 3 },
  dayCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  todayCircle: { backgroundColor: colors.parent },
  dayNum: { ...(typography.caption as object), color: colors.textPrimary },
  todayNum: { color: colors.surface, fontWeight: '600' },
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
  // Event rows
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5,
    borderColor: colors.border,
    borderRadius: 14,
    overflow: 'hidden',
    marginHorizontal: spacing.lg,
  },
  eventAccent: { width: 3 },
  eventBody: { flex: 1, padding: spacing.md, paddingLeft: spacing.lg },
  eventName: {
    ...(typography.body as object),
    fontWeight: '500',
    color: colors.textPrimary,
  },
  eventDate: {
    ...(typography.caption as object),
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  // Add event sheet
  sheetTitle: {
    ...(typography.h2 as object),
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  eventInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    padding: spacing.md,
    ...(typography.body as object),
    color: colors.textPrimary,
    marginBottom: spacing.lg,
  },
  saveBtn: {
    backgroundColor: colors.parent,
    borderRadius: 10,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  saveBtnText: {
    ...(typography.body as object),
    fontWeight: '600',
    color: colors.surface,
  },
});
