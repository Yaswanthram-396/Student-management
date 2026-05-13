import React, { useState, useEffect } from 'react';
import {
  View, Text, FlatList, Pressable, TextInput, Alert, StyleSheet, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../constants/colors';
import { spacing } from '../../constants/spacing';
import { typography } from '../../constants/typography';
import { HeaderBar, BottomSheet } from '../shared';
import { principalApi } from '../../services/principal';
import type { CalendarEventResponse } from '../../types/principal';

const SCREEN_WIDTH = Dimensions.get('window').width;
const CELL_SIZE = (SCREEN_WIDTH - spacing.lg * 2) / 7;
const WEEK_DAYS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface CalEvent {
  id: string;
  bar: string; name: string; date: string;
  audience: string; audienceBg: string; audienceText: string;
  month: number;
  year: number;
  day: number;
}

const PRINCIPAL_ACCENT = colors.principal;

const NOW = new Date();
const TODAY_DATE  = NOW.getDate();
const TODAY_MONTH = NOW.getMonth();
const TODAY_YEAR  = NOW.getFullYear();

function getMonthInfo(offsetFromToday: number) {
  const d = new Date(TODAY_YEAR, TODAY_MONTH + offsetFromToday, 1);
  return {
    year:     d.getFullYear(),
    month:    d.getMonth(),
    days:     new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(),
    firstDay: d.getDay(),
    name:     d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
  };
}

const COLOR_OPTIONS = [
  { label: 'Purple', value: PRINCIPAL_ACCENT },
  { label: 'Amber', value: colors.warning },
  { label: 'Teal', value: '#14B8A6' },
  { label: 'Red', value: colors.danger },
];

const AUDIENCE_CFG: Record<string, { bg: string; text: string }> = {
  All: { bg: '#EDEDFA', text: PRINCIPAL_ACCENT },
  Students: { bg: colors.warningBg, text: '#92400E' },
  Teachers: { bg: '#DBEAFE', text: colors.teacher },
};

const AUDIENCE_OPTIONS = ['All', 'Students', 'Teachers'];

const VISIBLE_TO_MAP: Record<string, string[]> = {
  All:      ['TEACHER', 'STUDENT', 'PARENT'],
  Students: ['STUDENT', 'PARENT'],
  Teachers: ['TEACHER'],
};

function mapApiEvent(e: CalendarEventResponse): CalEvent {
  const ac = AUDIENCE_CFG['All'];
  const d = new Date(e.start_date);
  return {
    id: String(e.id),
    bar: PRINCIPAL_ACCENT,
    name: e.title,
    date: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
    audience: 'All',
    audienceBg: ac.bg,
    audienceText: ac.text,
    month: d.getMonth(),
    year: d.getFullYear(),
    day: d.getDate(),
  };
}

export function CalendarScreen() {
  const [monthIdx, setMonthIdx] = useState(0);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [showSheet, setShowSheet] = useState(false);
  const [evtName, setEvtName] = useState('');
  const [audience, setAudience] = useState('All');
  const [barColor, setBarColor] = useState<string>(PRINCIPAL_ACCENT);
  const [adding, setAdding] = useState(false);

  const mon = getMonthInfo(monthIdx);
  const visibleEvents = events.filter(e => e.month === mon.month && e.year === mon.year);
  const eventDatesInMonth = new Set(visibleEvents.map(e => e.day));

  const calDays: (number | null)[] = Array(mon.firstDay).fill(null);
  for (let d = 1; d <= mon.days; d++) calDays.push(d);

  // ── Load events on mount ──────────────────────────────────────────────────
  useEffect(() => {
    principalApi.getCalendarEvents()
      .then(data => setEvents(data.results.map(mapApiEvent)))
      .catch(() => {}); // keep mock events on network error
  }, []);

  // ── Add event ─────────────────────────────────────────────────────────────
  async function handleAddEvent() {
    setAdding(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const created = await principalApi.createCalendarEvent({
        title: evtName || 'New Event',
        event_type: 'EVENT',
        start_date: today,
        end_date: today,
        visible_to: VISIBLE_TO_MAP[audience] ?? ['TEACHER', 'STUDENT', 'PARENT'],
      });
      setEvents(prev => [mapApiEvent(created), ...prev]);
      setShowSheet(false);
      setEvtName(''); setAudience('All');
    } catch (err: any) {
      Alert.alert('Error', err.details ?? 'Failed to add event.');
    } finally {
      setAdding(false);
    }
  }

  const CalHeader = (
    <View style={styles.calHeader}>
      {/* Month navigation */}
      <View style={styles.monthNav}>
        <Pressable
          style={[styles.navBtn, monthIdx === 0 && styles.navBtnDisabled]}
          onPress={() => setMonthIdx(i => Math.max(0, i - 1))}
        >
          <Text style={styles.navArrow}>‹</Text>
        </Pressable>
        <Text style={styles.monthLabel}>{mon.name}</Text>
        <Pressable
          style={[styles.navBtn, monthIdx === 11 && styles.navBtnDisabled]}
          onPress={() => setMonthIdx(i => Math.min(11, i + 1))}
        >
          <Text style={styles.navArrow}>›</Text>
        </Pressable>
      </View>

      {/* Week day labels */}
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
          const isToday = d === TODAY_DATE && mon.month === TODAY_MONTH && mon.year === TODAY_YEAR;
          const hasEvent = d !== null && eventDatesInMonth.has(d);
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

      <Text style={styles.sectionLabel}>Events This Month</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeaderBar
        center={<Text style={styles.headerTitle}>Academic Calendar</Text>}
        right={
          <Pressable onPress={() => setShowSheet(true)}>
            <Ionicons name="add-circle-outline" size={24} color={colors.principal} />
          </Pressable>
        }
      />

      <FlatList
        data={visibleEvents}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.sm }} />}
        ListHeaderComponent={CalHeader}
        renderItem={({ item }) => (
          <View style={styles.eventCard}>
            <View style={[styles.eventAccent, { backgroundColor: item.bar }]} />
            <View style={styles.eventBody}>
              <View>
                <Text style={styles.eventName}>{item.name}</Text>
                <Text style={styles.eventDate}>{item.date}</Text>
              </View>
              <View style={[styles.audiencePill, { backgroundColor: item.audienceBg }]}>
                <Text style={[styles.audienceText, { color: item.audienceText }]}>
                  {item.audience}
                </Text>
              </View>
            </View>
          </View>
        )}
      />

      <BottomSheet visible={showSheet} onClose={() => setShowSheet(false)}>
        <Text style={styles.sheetTitle}>Add Event</Text>

        <Text style={styles.fieldLabel}>Event Name</Text>
        <TextInput
          style={styles.textInput}
          value={evtName}
          onChangeText={setEvtName}
          placeholder="Enter event name..."
          placeholderTextColor={colors.textMuted}
        />

        <Text style={styles.fieldLabel}>Audience</Text>
        <View style={styles.optionRow}>
          {AUDIENCE_OPTIONS.map(opt => (
            <Pressable
              key={opt}
              style={[styles.optionPill, audience === opt && styles.optionPillActive]}
              onPress={() => setAudience(opt)}
            >
              <Text style={[styles.optionText, audience === opt && styles.optionTextActive]}>
                {opt}
              </Text>
            </Pressable>
          ))}
        </View>

        <Text style={styles.fieldLabel}>Color</Text>
        <View style={styles.colorRow}>
          {COLOR_OPTIONS.map(c => (
            <Pressable
              key={c.value}
              style={[
                styles.colorOption,
                { borderColor: barColor === c.value ? c.value : colors.border },
              ]}
              onPress={() => setBarColor(c.value)}
            >
              <View style={[styles.colorDot, { backgroundColor: c.value }]} />
              <Text style={[
                styles.colorLabel,
                { color: barColor === c.value ? c.value : colors.textSecondary },
              ]}>
                {c.label}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.sheetBtns}>
          <Pressable style={styles.cancelBtn} onPress={() => setShowSheet(false)}>
            <Text style={styles.cancelBtnText}>Cancel</Text>
          </Pressable>
          <Pressable
            style={[styles.addBtn, adding && styles.addBtnAdding]}
            onPress={handleAddEvent}
          >
            <Text style={styles.addBtnText}>{adding ? 'Adding...' : 'Add Event'}</Text>
          </Pressable>
        </View>
      </BottomSheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  headerTitle: { ...(typography.h3 as object), color: colors.textPrimary },
  listContent: { paddingBottom: spacing.lg },
  // Calendar header
  calHeader: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
  },
  monthNav: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.lg,
  },
  navBtn: {
    width: 32, height: 32, borderRadius: 16,
    borderWidth: 0.5, borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center', justifyContent: 'center',
  },
  navBtnDisabled: { opacity: 0.4 },
  navArrow: { fontSize: 20, color: colors.textMuted, lineHeight: 24 },
  monthLabel: { ...(typography.h3 as object), fontWeight: '600', color: colors.textPrimary },
  weekRow: { flexDirection: 'row', marginBottom: spacing.xs },
  weekDayLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textMuted, textAlign: 'center',
  },
  calGrid: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: spacing.xl },
  dayCell: { alignItems: 'center', paddingVertical: 3 },
  dayCircle: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  todayCircle: { backgroundColor: colors.principal },
  dayNum: { ...(typography.caption as object), color: colors.textPrimary },
  todayNum: { color: colors.surface, fontWeight: '600' },
  eventDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: colors.principal, marginTop: 2 },
  sectionLabel: { ...(typography.label as object), color: colors.textMuted, marginBottom: spacing.sm },
  // Event card
  eventCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 0.5, borderColor: colors.border,
    borderRadius: 14, overflow: 'hidden',
    marginHorizontal: spacing.lg,
  },
  eventAccent: { width: 3 },
  eventBody: {
    flex: 1, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    padding: spacing.md, paddingHorizontal: spacing.lg, gap: spacing.sm,
  },
  eventName: { ...(typography.body as object), fontWeight: '500', color: colors.textPrimary },
  eventDate: { ...(typography.caption as object), color: colors.textMuted, marginTop: spacing.xs },
  audiencePill: { borderRadius: 999, paddingVertical: spacing.xs, paddingHorizontal: spacing.md },
  audienceText: { ...(typography.label as object) },
  // Sheet
  sheetTitle: { ...(typography.h3 as object), fontWeight: '500', color: colors.textPrimary, marginBottom: spacing.md },
  fieldLabel: {
    ...(typography.caption as object), fontWeight: '500',
    color: colors.textSecondary, marginBottom: spacing.xs,
  },
  textInput: {
    backgroundColor: '#F5F5F5', borderRadius: 10,
    padding: spacing.md, ...(typography.body as object),
    color: colors.textPrimary, marginBottom: spacing.md,
  },
  optionRow: { flexDirection: 'row', gap: spacing.xs, marginBottom: spacing.md },
  optionPill: {
    paddingVertical: spacing.xs, paddingHorizontal: spacing.md,
    borderRadius: 999, backgroundColor: colors.background,
    borderWidth: 0.5, borderColor: colors.border,
  },
  optionPillActive: { backgroundColor: colors.principal, borderColor: colors.principal },
  optionText: { ...(typography.caption as object), fontWeight: '500', color: colors.textSecondary },
  optionTextActive: { color: colors.surface },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginBottom: spacing.lg },
  colorOption: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.xs,
    paddingVertical: 6, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1.5,
    backgroundColor: colors.surface,
  },
  colorDot: { width: 10, height: 10, borderRadius: 5 },
  colorLabel: { ...(typography.caption as object) },
  sheetBtns: { flexDirection: 'row', gap: spacing.sm },
  cancelBtn: {
    flex: 1, height: 48, borderRadius: 10,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  cancelBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.textSecondary },
  addBtn: { flex: 1, height: 48, borderRadius: 10, backgroundColor: colors.principal, alignItems: 'center', justifyContent: 'center' },
  addBtnAdding: { backgroundColor: colors.success },
  addBtnText: { ...(typography.h3 as object), fontWeight: '500', color: colors.surface },
});
